#!/usr/bin/env node
// Prose corpus dump (docs/design-backlog.md §4, tier 2): every player-facing
// string as structured records, so prose review reads a CORPUS in batch instead
// of playing the game one command per tool-call. Pure extraction — no judging.
//
//   node tools/prose-corpus.mjs --stats                 # group counts
//   node tools/prose-corpus.mjs --group npc,enc         # dump listed groups
//   node tools/prose-corpus.mjs --delta                 # only strings not in the ledger
//   node tools/prose-corpus.mjs --group enc --seed      # mark the dumped set reviewed
//   node tools/prose-corpus.mjs --json                  # JSONL records
//
// Groups: npc (hand-authored NPCS dialogue+desc) · patron · room (desc+revisit)
// · item · enc (ENCOUNTERS) · quest · intro (taxi tables) · pool (engine-file
// const _NAME = […] prose pools, string literals ≥ 40 chars).
//
// The hash ledger (docs/prose-review-ledger.json) is what makes re-review
// delta-sized: --seed records {hash → ref+date} for every record it just
// dumped; --delta emits only records whose normalized-text hash is absent.
// Seed ONLY after actually reviewing a dump (the ledger means "read at this
// wording", not "exists"). Editing a string changes its hash, so it returns
// to the next delta automatically.

import fs from "node:fs";
import vm from "node:vm";
import crypto from "node:crypto";

const JS = new URL("../web/js/", import.meta.url);
const LEDGER_PATH = new URL("../docs/prose-review-ledger.json", import.meta.url);

// world data only — the engine isn't needed for reflection, but world.js
// references nothing outside thai.js at load, so this stays light.
for (const f of ["thai", "world"])
  vm.runInThisContext(fs.readFileSync(new URL(f + ".js", JS), "utf8"), { filename: f });

const records = []; // {group, ref, speaker, text}
const add = (group, ref, speaker, text) => {
  if (typeof text !== "string") return;
  const t = text.trim();
  if (t.length < 10) return;
  // pure-Thai runs are the trainer's jurisdiction (the coverage test), not prose review
  const thai = (t.match(/[฀-๿]/g) || []).length;
  if (thai > t.length / 2) return;
  records.push({ group, ref, speaker: speaker || null, text: t });
};

// ── world.js reflection ─────────────────────────────────────────────────────
const PROSE_KEYS = new Set(["text", "short", "desc", "intro", "hint", "pick", "tan",
  "revisit", "q", "cap", "caption", "label", "win", "lose", "offer", "reply"]);
function walk(group, ref, speaker, node) {
  if (typeof node === "string") return; // only keyed strings collect (see below)
  if (Array.isArray(node)) { node.forEach((v, i) => walk(group, `${ref}[${i}]`, speaker, v)); return; }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === "string") {
        // keyed prose, or any long stray string a schema grew since this list
        if (PROSE_KEYS.has(k) || v.length >= 80) add(group, `${ref}.${k}`, speaker, v);
      } else if (Array.isArray(v)) {
        if (PROSE_KEYS.has(k)) v.forEach((s, i) =>
          typeof s === "string" ? add(group, `${ref}.${k}[${i}]`, speaker, s)
            : walk(group, `${ref}.${k}[${i}]`, speaker, s));
        else v.forEach((s, i) => walk(group, `${ref}.${k}[${i}]`, speaker, s));
      } else if (v && typeof v === "object") walk(group, `${ref}.${k}`, speaker, v);
    }
  }
}

for (const [id, n] of Object.entries(NPCS)) {
  if (n.filler) continue; // generated from parts; review the parts (pool group)
  walk("npc", `npc.${id}`, n.name, n);
}
for (const [id, p] of Object.entries(PATRONS)) walk("patron", `patron.${id}`, p.name, p);
for (const [id, r] of Object.entries(ROOMS)) {
  add("room", `room.${id}.desc`, r.bar || r.name, r.desc);
  (r.revisit || []).forEach((s, i) => add("room", `room.${id}.revisit[${i}]`, r.bar || r.name, s));
}
for (const [id, it] of Object.entries(ITEMS)) walk("item", `item.${id}`, it.name, it);
for (const [id, e] of Object.entries(ENCOUNTERS)) walk("enc", `enc.${id}`, id, e);
for (const [id, q] of Object.entries(QUESTS)) {
  add("quest", `quest.${id}.desc`, q.name, q.desc);
}
for (const [tbl, name] of [[LANGUAGES, "lang"], [ORIGINS, "origin"],
  [PERSONALITIES, "personality"], [ORIENTATIONS, "orientation"]])
  for (const e of tbl) walk("intro", `intro.${name}.${e.id}`, "Tan", e);

// ── engine prose pools: const _NAME = [ …strings/fns… ] ─────────────────────
// Top-level consts from vm scripts land in lexical scope (not enumerable), so
// pools are scanned textually: each block's string literals ≥ 40 chars are
// records. Fragments of concatenations still read fine for voice/canon review.
const POOL_RE = /^const (_[A-Z][A-Z0-9_]*) = [\[{]/m;
for (const f of ["engine-core.js", "engine-encounters.js", "engine-play.js",
  "engine-systems.js", "engine-parser.js"]) {
  const src = fs.readFileSync(new URL(f, JS), "utf8");
  const lines = src.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(POOL_RE);
    if (!m) continue;
    // slice to the closing "];" / "};" at column 0
    let j = i, depth = 0, block = [];
    for (; j < lines.length; j++) {
      block.push(lines[j]);
      if (j > i && /^[\]}];/.test(lines[j])) break;
    }
    const body = block.join("\n");
    let k = 0;
    for (const lit of body.matchAll(/"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g)) {
      const s = (lit[1] ?? lit[2] ?? "").replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
      if (s.length >= 40) add("pool", `${f}:${m[1]}[${k++}]`, m[1], s);
    }
    i = j;
  }
}

// ── ledger + output ─────────────────────────────────────────────────────────
const norm = s => s.replace(/\s+/g, " ").trim();
const hash = s => crypto.createHash("sha256").update(norm(s)).digest("hex").slice(0, 16);

const args = process.argv.slice(2);
const has = f => args.includes("--" + f);
const val = f => { const i = args.indexOf("--" + f); return i >= 0 ? args[i + 1] : null; };

let ledger = {};
try { ledger = JSON.parse(fs.readFileSync(LEDGER_PATH, "utf8")); } catch (e) { /* first run */ }

let out = records;
const groups = val("group");
if (groups) { const set = new Set(groups.split(",")); out = out.filter(r => set.has(r.group)); }
if (has("delta")) out = out.filter(r => !ledger[hash(r.text)]);

if (has("stats")) {
  const by = {};
  for (const r of records) by[r.group] = (by[r.group] || 0) + 1;
  const reviewed = records.filter(r => ledger[hash(r.text)]).length;
  console.log("corpus:", records.length, "records —", JSON.stringify(by));
  console.log("ledger:", Object.keys(ledger).length, "hashes;", reviewed, "of the current corpus reviewed,",
    records.length - reviewed, "pending");
  process.exit(0);
}

if (has("seed")) {
  const today = new Date().toISOString().slice(0, 10);
  let added = 0;
  for (const r of out) { const h = hash(r.text); if (!ledger[h]) { ledger[h] = { ref: r.ref, reviewed: today }; added++; } }
  fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 0) + "\n");
  console.log(`ledger: +${added} hashes (${Object.keys(ledger).length} total) — the dumped set is marked reviewed`);
  process.exit(0);
}

if (has("json")) {
  for (const r of out) console.log(JSON.stringify({ ...r, hash: hash(r.text) }));
} else {
  let g = null;
  for (const r of out) {
    if (r.group !== g) { g = r.group; console.log(`\n════ ${g} ════`); }
    console.log(`\n— ${r.ref}${r.speaker ? "  (" + r.speaker + ")" : ""}`);
    console.log(r.text);
  }
  console.log(`\n[${out.length} records]`);
}
