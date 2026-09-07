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
//   node tools/prose-corpus.mjs --delta --taps          # …with the taps each record renders
//   node tools/prose-corpus.mjs --dossiers              # regrouped by WHO/WHAT each record is about
//   node tools/prose-corpus.mjs --rooms                 # regrouped by the PLACE each record describes
//   node tools/prose-corpus.mjs --quests                # regrouped by QUEST, with its wiring at the head
//   node tools/prose-corpus.mjs --map                   # which dossiers have been read as a whole, and which moved since
//   node tools/prose-corpus.mjs --dossiers --delta      # only the subjects that are new or stale
//   node tools/prose-corpus.mjs --rooms --seed          # record the dumped rooms as read
//
// Groups: npc (hand-authored NPCS dialogue+desc) · patron · room (desc+revisit)
// · item · enc (ENCOUNTERS) · quest · intro (taxi tables) · pool (engine-file
// const _NAME = […] prose pools, string literals ≥ 40 chars).
//
// THE DELTA CHECKLIST (Mario, 2026-09-07 — sixteen "the phone"s that were somebody
// else's passed review because the review read the TEXT and the defect was in the
// RENDER). Per record, before --seed:
//   1. CLAIM  — does it assert something about a recurring entity (vehicle, home
//               province, price, hours)? `--about <subject>` and read the dossier.
//   2. PROMISE — an invitation ("come, I know a place") or a CAPS-in-parens hint:
//               a verb must deliver it (promises.test / errand-audit).
//   3. TAPS   — read the [taps: …] column this tool prints with --delta/--taps. An
//               ⚠ is a third-person "the <item>" that taps YOUR item: {{…}} it.
//   4. HOURS  — a late paint that names an hour ("at four") prints from midnight.
//   5. THAI   — every Thai run must exist in the trainer's data.js (term.test).
//   6. NUMBERS — ฿ figures come from constants, never typed.
// Seed only after the checklist, and never in the same shell chain as the commit —
// a --seed that runs unconditionally is a rubber stamp with a timestamp.
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
// THE DOSSIER LEDGER is the string ledger's sibling, and it has to be separate
// because the two passes review different UNITS. The string ledger answers "has
// this sentence been read at this wording?"; a dossier is read as a whole, and
// it goes stale the moment ANY record in it changes — one new line about Bert
// reopens Bert, because the new line is exactly what might contradict the old
// ones. So the key is the subject and the hash is over all its records.
const DOSSIER_PATH = new URL("../docs/prose-dossier-ledger.json", import.meta.url);
// …and the settled-findings list. An instrument that cannot be told "yes, we know"
// spends every future run re-reporting the same judgement calls, and its operator
// learns to skim it. Printed at the head of a subject's dossier so the reviewer
// reading it knows what is already decided. (Same idea as AFFORD_OK.)
const ACCEPTED_PATH = new URL("../docs/prose-dossier-accepted.json", import.meta.url);

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
  // Glyph art is data, not prose: the QR sticker's block characters (docs/ctf.md)
  // and any ASCII art that follows it are strings with no words in them. Nothing
  // a reviewer can review, and 21 rows of them would bury a real delta.
  if (!/\p{L}/u.test(t)) return;
  records.push({ group, ref, speaker: speaker || null, text: t });
};

// ── world.js reflection ─────────────────────────────────────────────────────
const PROSE_KEYS = new Set(["text", "short", "desc", "intro", "hint", "pick", "tan",
  "revisit", "q", "cap", "caption", "label", "win", "lose", "offer", "reply",
  "shot"]); // shot: a manager's own house-welcome pool (see _managerWelcome)
function walk(group, ref, speaker, node) {
  if (typeof node === "string") return; // only keyed strings collect (see below)
  if (Array.isArray(node)) { node.forEach((v, i) => walk(group, `${ref}[${i}]`, speaker, v)); return; }
  if (node && typeof node === "object") {
    for (const [k, v] of Object.entries(node)) {
      if (typeof v === "string") {
        // keyed prose, or any long stray string a schema grew since this list
        if (PROSE_KEYS.has(k) || v.length >= 80) add(group, `${ref}.${k}`, speaker, v);
      } else if (Array.isArray(v)) {
        // The `|| s.length >= 80` mirrors the scalar branch above, and it is
        // load-bearing: without it an ARRAY of prose under a key nobody added
        // to PROSE_KEYS vanishes from the corpus silently. That is exactly what
        // happened to Bill's `shot` pool — five authored lines, invisible to
        // --delta, which is the one thing this tool exists to prevent.
        if (PROSE_KEYS.has(k)) v.forEach((s, i) =>
          typeof s === "string" ? add(group, `${ref}.${k}[${i}]`, speaker, s)
            : walk(group, `${ref}.${k}[${i}]`, speaker, s));
        else v.forEach((s, i) =>
          typeof s === "string"
            ? (s.length >= 80 && add(group, `${ref}.${k}[${i}]`, speaker, s))
            : walk(group, `${ref}.${k}[${i}]`, speaker, s));
      } else if (v && typeof v === "object") walk(group, `${ref}.${k}`, speaker, v);
    }
  }
}

for (const [id, n] of Object.entries(NPCS)) {
  if (n.filler) continue; // generated from parts; review the parts (pool group)
  walk("npc", `npc.${id}`, n.name, n);
}
// The `patron.<id>` ref prefix is PERSISTED in docs/prose-review-ledger.json
// (277 entries), so it survives the one-cast fold: the group is derived from
// the flag now, and renaming it would orphan every one of those reviews.
for (const [id, p] of Object.entries(NPCS).filter(([, n]) => n.patron)) walk("patron", `patron.${id}`, p.name, p);
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
// the player's own canned answers (ASK_REPLIES) — short, but player-facing and
// voice-critical, so they belong in the review corpus like any other prose
if (typeof ASK_REPLIES !== "undefined")
  for (const [key, list] of Object.entries(ASK_REPLIES))
    list.forEach((r, i) => add("reply", `reply.${key}[${i}]`,
      r.pers || r.origin || "anyone", r.text));

// ── engine prose: pools AND function bodies ─────────────────────────────────
// Top-level consts from vm scripts land in lexical scope (not enumerable), so
// the engine is scanned textually, line by line, with a running "owner": either
// the `const _POOL = [` block we're inside, or the last `function name(` seen.
//
// Function-body prose was invisible here until 2026-08-06 and it is ~40% of the
// engine's player-facing words (1,162 literals, ~78KB) — the class of miss that
// let Tan drive a minibus in the intro and a grey sedan everywhere else. Pools
// are the `pool` group (stable refs, already in the ledger); function-body
// literals are the `fn` group, attributed to their enclosing function so a
// reviewer can see which scene a line belongs to. See docs/prose-defects.md.
const POOL_RE = /^const (_[A-Z][A-Z0-9_]*) = [\[{]/;
const FN_RE = /^(?:function (\w+)|const (\w+) = (?:function|\([^)]*\) =>))/;
const LIT_RE = /"((?:[^"\\]|\\.)*)"|`((?:[^`\\]|\\.)*)`/g;
const unesc = s => s.replace(/\\"/g, '"').replace(/\\n/g, "\n").replace(/\\\\/g, "\\");
for (const f of ["engine-core.js", "engine-encounters.js", "engine-play.js",
  "engine-systems.js", "engine-parser.js"]) {
  const lines = fs.readFileSync(new URL(f, JS), "utf8").split("\n");
  let pool = null, fn = null, idx = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (pool) {
      // Close on ANY column-0 bracket, not just `];` — `_QR_STICKER` ends with
      // `].join("\n");` and under the old `];`-only rule the block never closed,
      // so every function after it was filed under the pool name. Same failure
      // the _QUEER_ROOMS note below describes, reached from the other direction.
      if (/^[\]}]/.test(line)) { pool = null; idx = 0; continue; }
    } else {
      const pm = line.match(POOL_RE);
      if (pm) {
        idx = 0;
        // A one-line const (`const _HOSTS = ["arm", "win"];`) never meets a
        // closing brace at column 0 — the old block-slicer therefore stayed in
        // "pool" mode forever and filed every following function's prose under
        // that name (the _QUEER_ROOMS-carrying-_queerHostility mislabel). Only
        // enter block mode when the declaration is actually still open.
        if (/[\]}];\s*(\/\/.*)?$/.test(line)) {
          for (const lit of line.matchAll(LIT_RE)) {
            const s = unesc(lit[1] ?? lit[2] ?? "");
            if (s.length >= 40) add("pool", `${f}:${pm[1]}[${idx++}]`, pm[1], s);
          }
          continue;
        }
        pool = pm[1];
        continue;
      }
      const fm = line.match(FN_RE);
      if (fm) { fn = fm[1] || fm[2]; idx = 0; }
    }
    for (const lit of line.matchAll(LIT_RE)) {
      const s = unesc(lit[1] ?? lit[2] ?? "");
      if (s.length < 40) continue;
      if (pool) add("pool", `${f}:${pool}[${idx++}]`, pool, s);
      else if (fn) add("fn", `${f}:${fn}[${idx++}]`, fn, s);
    }
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
let accepted = { accepted: [] };
try { accepted = JSON.parse(fs.readFileSync(ACCEPTED_PATH, "utf8")); } catch (e) { /* optional */ }
const acceptedFor = name => (accepted.accepted || []).filter(a => a.subject === name);
function printAccepted(name) {
  for (const a of acceptedFor(name))
    console.log(`   ✓ SETTLED (${a.ruled}) — ${a.finding}\n     ${a.reason}`);
}
let dossierLedger = {};
try { dossierLedger = JSON.parse(fs.readFileSync(DOSSIER_PATH, "utf8")); } catch (e) { /* first run */ }
// a dossier's identity: WHICH records are in it and at what wording, order-independent
const groupHash = recs => crypto.createHash("sha256")
  .update(recs.map(r => hash(r.text)).sort().join("")).digest("hex").slice(0, 16);
const dossierState = (key, recs) => {
  const prev = dossierLedger[key];
  if (!prev) return "new";
  return prev.hash === groupHash(recs) ? "current" : "stale";
};
function seedDossiers(entries) {   // entries: [key, records][]
  const today = new Date().toISOString().slice(0, 10);
  let n = 0;
  for (const [key, recs] of entries) {
    const h = groupHash(recs);
    if (!dossierLedger[key] || dossierLedger[key].hash !== h) {
      dossierLedger[key] = { hash: h, reviewed: today, records: recs.length }; n++;
    }
  }
  fs.writeFileSync(DOSSIER_PATH, JSON.stringify(dossierLedger, null, 0) + "\n");
  console.log(`dossier ledger: ${n} subject(s) recorded as read (${Object.keys(dossierLedger).length} total)`);
}

// ── the render column ──────────────────────────────────────────────────────
// A reviewer reads prose; the player taps it. decorate() (term.js) is what turns
// "the phone" into a tap on YOUR phone, and no eye simulates that while reading —
// so the tool shows it. Loaded lazily (the rest of the engine + the vendored
// tokeniser + term.js; thai/world are already in this context), only when asked.
let _renderReady = false;
function _renderInit() {
  if (_renderReady) return;
  for (const f of ["games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser",
    "data", "examples", "tokeniser", "thai-script", "wordcard", "term"])
    vm.runInThisContext(fs.readFileSync(new URL(f + ".js", JS), "utf8"), { filename: f + ".js" });
  engineInit(() => {});
  newGame();
  _renderReady = true;
}
const _NAMES = () => [...new Set(Object.values(NPCS).map(n => String(n.name || "").split(" ").pop()).filter(w => /^[A-Z][a-z]{2,}$/.test(w)))];
let _third = null;
// taps a record renders, and the ⚠ class: a third-person subject handling "the <item>" that
// still taps after decoration — the item is yours, the sentence says it isn't
function renderTaps(text) {
  _renderInit();
  const html = _term.decorate(text);
  const taps = [], seen = new Set();
  for (const m of html.matchAll(/data-k="(\w+)" data-v="([^"]+)"/g)) {
    const key = m[2] + "(" + m[1] + ")";
    if (!seen.has(key)) { seen.add(key); taps.push({ k: m[1], v: m[2] }); }
  }
  const warn = [];
  for (const t of taps) {
    if (t.k !== "item") continue;
    _third = _third || _NAMES();
    const re = new RegExp(`\\b(he|she|they|him|her|${_third.join("|")})\\b[^.!?"“”]{0,60}\\bthe ${t.v}\\b`);
    if (re.test(text)) warn.push(`third-person "the ${t.v}" taps YOUR ${t.v} — {{${t.v}}} it`);
  }
  return { taps, warn };
}
const wantTaps = has("taps") || has("delta");
function printRender(r) {
  if (!wantTaps) return;
  const { taps, warn } = renderTaps(r.text);
  if (taps.length) console.log(`   [taps: ${taps.map(t => `${t.v}(${t.k})`).join(" · ")}]`);
  for (const w of warn) { console.log(`   ⚠ ${w}`); _warned++; }
}
let _warned = 0;

let out = records;
const groups = val("group");
if (groups) { const set = new Set(groups.split(",")); out = out.filter(r => set.has(r.group)); }
// --delta means "unreviewed STRINGS" for the string pass and "new or stale
// SUBJECTS" for the dossier pass — a dossier needs its whole cast of records
// present to be read against itself, so the string filter must not run first.
if (has("delta") && !has("dossiers") && !has("rooms") && !has("quests") && !has("about") && !has("map"))
  out = out.filter(r => !ledger[hash(r.text)]);

if (has("stats")) {
  const by = {};
  for (const r of records) by[r.group] = (by[r.group] || 0) + 1;
  const reviewed = records.filter(r => ledger[hash(r.text)]).length;
  console.log("corpus:", records.length, "records —", JSON.stringify(by));
  console.log("ledger:", Object.keys(ledger).length, "hashes;", reviewed, "of the current corpus reviewed,",
    records.length - reviewed, "pending");
  process.exit(0);
}

// the STRING seed — scoped, because --dossiers/--rooms have their own ledger and
// their own --seed below (a bare --seed here would silently swallow theirs)
if (has("seed") && !has("dossiers") && !has("rooms") && !has("quests") && !has("map")) {
  const today = new Date().toISOString().slice(0, 10);
  let added = 0;
  for (const r of out) { const h = hash(r.text); if (!ledger[h]) { ledger[h] = { ref: r.ref, reviewed: today }; added++; } }
  fs.writeFileSync(LEDGER_PATH, JSON.stringify(ledger, null, 0) + "\n");
  console.log(`ledger: +${added} hashes (${Object.keys(ledger).length} total) — the dumped set is marked reviewed`);
  process.exit(0);
}

// ── the dossier pivot (--about <subject> / --dossiers) ──────────────────────
// Per-record review reads the corpus in FILE order, so every line about a
// subject is scattered across NPCS, room descs, pools and function bodies —
// and two lines that contradict each other never land on the same page. This
// regroups by WHO/WHAT a line is about: one document per entity, every claim
// the game makes about it, in one read. Purely mechanical (the entity list is
// world.js itself); it makes contradictions visible, it doesn't judge them.
// See docs/prose-defects.md.
// Matching is CASE-SENSITIVE on the display name (plus the Thai name), never on
// the lowercase id — "tan" the id would drag in every "Gold Coast tan", which is
// the same collision class term.js fights with _WORD_NAME_NPCS. Names that are
// ordinary capitalised words are speaker-only, or a sentence-initial "May"/"Win"
// floods their dossier. Short names are skipped for the same reason.
const _WORDY = new Set(["Best", "Proud", "Near", "Nice", "Hong", "Som", "May", "Win",
  "Arm", "Gift", "Mind", "Joy", "Dear", "Ice", "View", "Bee", "Mem", "Pim", "Nong"]);
function _subjects() {
  const subs = new Map(); // display name → {re, speakerOnly}
  const put = (name, extra) => {
    if (!name || name.length < 3) return;              // "Oy"/"Nu" match everywhere
    if (_WORDY.has(name)) { subs.set(name, { speakerOnly: true }); return; }
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const alts = [name, ...(extra || [])].filter(Boolean).map(esc);
    subs.set(name, { re: new RegExp(`\\b(${alts.join("|")})\\b`) });
  };
  for (const n of Object.values(NPCS)) if (!n.filler) put(n.name, [n.th]);
  for (const [, p] of Object.entries(NPCS).filter(([, n]) => n.patron)) put(p.name);
  for (const r of Object.values(ROOMS)) if (r.bar) put(r.bar);
  for (const it of Object.values(ITEMS)) put(it.name);
  return subs;
}
// ── the ROOM dossier (--rooms) ─────────────────────────────────────────────
// The sibling pivot: every string that describes ONE PLACE, together — desc,
// each revisit line, each lateDesc line, every reads: fixture. A room is
// described by five or six strings written months apart, and they drift the
// same way a character does (Central Mall's two faces disagreed about the time
// of day; the Eastern Seaboard office listed its whole contents and then the
// revisit watered a plant that wasn't in it). Ref-order review cannot see it;
// this grouping is the whole check. (Mario, 2026-09-07.)
// ── the dossier coverage map (--map) ───────────────────────────────────────
// What the string ledger's percentage cannot tell you: which SUBJECTS have been
// read as a whole, and which have moved since. A subject is `new` (never read
// against itself), `stale` (read once, but a record has been added or reworded
// since — and the new record is exactly the one that might contradict the rest),
// or `current`. Sorted by size, because the biggest unread dossier is where the
// next contradiction most likely is.
// ── the QUEST dossier (--quests) ───────────────────────────────────────────
// The third pivot, and the one whose contradictions break PLAY rather than just
// fiction (Mario, 2026-09-07). A quest is written in five places that never sit
// together: the QUESTS record (name, desc, reward, deps, the trust gate), the
// giver's offer node, whatever node or handler SETS its doneFlag, the item it
// hands over, and the `at:` that HINT and the journal point at. So a desc can
// promise a step nobody can take, an offer can name a venue the `at:` disagrees
// with, and the flag can be set by a node the player reaches before the offer.
// Everything about one quest, in one place, with its wiring stated at the head.
if (has("quests")) {
  const want = val("quests") && !val("quests").startsWith("--") ? val("quests") : null;
  const seeding = has("seed"), delta = has("delta"), picked = [];
  let n = 0;
  for (const [qid, q] of Object.entries(QUESTS)) {
    if (want && qid !== want) continue;
    // every string this quest is made of — its own fields, its giver's whole
    // dialogue, and any node anywhere that sets or requires its flags
    const recs = out.filter(r => r.ref.startsWith(`quest.${qid}.`) ||
      (q.giver && r.ref.startsWith(`npc.${q.giver}.`)) ||
      (q.item && r.ref.startsWith(`item.${q.item}.`)));
    const setters = [], gates = [];
    for (const [id, npc] of Object.entries(NPCS))
      (npc.dialogue || []).forEach((d, i) => {
        if ((d.sets || []).includes(q.doneFlag)) setters.push(`npc.${id}.dialogue[${i}]`);
        if ((d.req || []).includes(q.doneFlag)) gates.push(`npc.${id}.dialogue[${i}]`);
      });
    const state = dossierState("quest:" + qid, recs);
    if (delta && state === "current") continue;
    picked.push(["quest:" + qid, recs]);
    if (seeding) continue;
    n++;
    console.log(`\n\n════════ ${q.name}  [${qid}] — ${recs.length} records ════════`);
    printAccepted(q.name);
    // …and for the people this quest is made of, or a ruling made on a character
    // is invisible to the pivot that prints that character's whole dialogue
    for (const nm of new Set(recs.map(r => r.speaker).filter(Boolean))) printAccepted(nm);
    console.log(`   giver: ${q.giver}${NPCS[q.giver] ? " (" + NPCS[q.giver].name + ", " + ((NPCS[q.giver].room) || (NPCS[q.giver].bars || [])[0] || "?") + ")" : " — MISSING"}` +
      `${q.trust ? " · trust ≥ " + q.trust : ""}`);
    console.log(`   at: ${q.at || "—"}   deps: ${(q.deps || []).join(", ") || "—"}   reqFlags: ${(q.reqFlags || []).join(", ") || "—"}` +
      `${q.item ? "   item: " + q.item : ""}`);
    console.log(`   doneFlag: ${q.doneFlag} — set by ${setters.join(", ") || "an engine action (grep the flag)"}`);
    if (gates.length) console.log(`   read back by: ${gates.join(", ")}`);
    console.log(`   reward: ${JSON.stringify(q.reward || {})}`);
    for (const r of recs) {
      console.log(`\n— ${r.ref}${r.speaker ? "  (" + r.speaker + ")" : ""}  [${r.group}]`);
      console.log(r.text);
      printRender(r);
    }
  }
  if (seeding) { seedDossiers(picked); process.exit(0); }
  console.log(`\n[${n} quests]`);
  if (_warned) console.log(`⚠ ${_warned} render warning(s) — see the checklist in this file's header`);
  process.exit(0);
}

if (has("map")) {
  const rows = [];
  const subs = _subjects();
  for (const [name, { re, speakerOnly }] of subs) {
    const hits = out.filter(r => r.speaker === name || (!speakerOnly && re.test(r.text)));
    if (hits.length < 2) continue;
    rows.push({ kind: "subject", name, n: hits.length, state: dossierState("subject:" + name, hits),
      seen: (dossierLedger["subject:" + name] || {}).reviewed });
  }
  for (const [qid, q] of Object.entries(QUESTS)) {
    const recs = out.filter(r => r.ref.startsWith(`quest.${qid}.`) ||
      (q.giver && r.ref.startsWith(`npc.${q.giver}.`)) || (q.item && r.ref.startsWith(`item.${q.item}.`)));
    if (!recs.length) continue;
    rows.push({ kind: "quest", name: q.name, id: qid, n: recs.length,
      state: dossierState("quest:" + qid, recs), seen: (dossierLedger["quest:" + qid] || {}).reviewed });
  }
  const byRoom = new Map();
  for (const r of out) { const m = /^room\.([^.]+)\./.exec(r.ref); if (!m) continue;
    if (!byRoom.has(m[1])) byRoom.set(m[1], []); byRoom.get(m[1]).push(r); }
  for (const [id, recs] of byRoom) {
    if (recs.length < 2) continue;
    rows.push({ kind: "room", name: (ROOMS[id] && ROOMS[id].name) || id, id, n: recs.length,
      state: dossierState("room:" + id, recs), seen: (dossierLedger["room:" + id] || {}).reviewed });
  }
  const bar = (a, b) => { const w = 25, f = b ? Math.round((a / b) * w) : 0;
    return "█".repeat(f) + "·".repeat(w - f); };
  console.log("\n── dossier review coverage ──  (has every string ABOUT this subject been read together?)\n");
  for (const kind of ["subject", "room", "quest"]) {
    const g = rows.filter(r => r.kind === kind);
    const cur = g.filter(r => r.state === "current"), stale = g.filter(r => r.state === "stale"),
      fresh = g.filter(r => r.state === "new");
    const recs = g.reduce((a, r) => a + r.n, 0), curRecs = cur.reduce((a, r) => a + r.n, 0);
    const label = { subject: "cast + venues + items", room: "rooms", quest: "quests (wiring + prose)" }[kind];
    console.log(`  ${label.padEnd(23)} ` +
      `${String(cur.length).padStart(4)}/${String(g.length).padEnd(4)} ${bar(cur.length, g.length)} ` +
      `${g.length ? Math.round((cur.length / g.length) * 100) : 0}%   (${curRecs}/${recs} records)`);
    if (stale.length) console.log(`     stale — a record moved since it was read: ${stale.sort((a, b) => b.n - a.n).map(r => `${r.name}(${r.n})`).join(" · ")}`);
    if (fresh.length) console.log(`     never read as a whole: ${fresh.sort((a, b) => b.n - a.n).slice(0, 20).map(r => `${r.name}(${r.n})`).join(" · ")}` +
      (fresh.length > 20 ? ` … +${fresh.length - 20} more` : ""));
  }
  const all = rows.length, done = rows.filter(r => r.state === "current").length;
  console.log(`\n  · ${done}/${all} dossiers current` +
    `${all - done ? ` — next round: node tools/prose-corpus.mjs --dossiers --delta --taps  (and --rooms --delta)` : ""}`);
  console.log("  · a dossier goes stale when ANY record in it changes — that record is the one that might contradict the others");
  const nAcc = (accepted.accepted || []).length;
  if (nAcc) console.log(`  · ${nAcc} settled finding(s) in docs/prose-dossier-accepted.json — printed at the head of their subject's dossier, so a reviewer does not re-report them`);
  console.log("  · seed with --dossiers --seed / --rooms --seed, and only after somebody has actually read them\n");
  process.exit(0);
}

if (has("rooms")) {
  const byRoom = new Map();
  for (const r of out) {
    const m = /^room\.([^.]+)\./.exec(r.ref);
    if (!m) continue;
    if (!byRoom.has(m[1])) byRoom.set(m[1], []);
    byRoom.get(m[1]).push(r);
  }
  const want = val("rooms") && val("rooms").startsWith("--") ? null : val("rooms");
  const seeding = has("seed"), delta = has("delta");
  const picked = [];
  let n = 0;
  for (const [id, recs] of byRoom) {
    if (want && id !== want) continue;
    if (recs.length < 2 && !want) continue;   // one string cannot contradict itself
    const state = dossierState("room:" + id, recs);
    if (delta && state === "current") continue;
    picked.push(["room:" + id, recs]);
    if (seeding) continue;                    // --seed records without dumping
    n++;
    const r = ROOMS[id] || {};
    console.log(`\n\n════════ ${r.name || id}  [${id}]${r.bar ? " — " + r.bar : ""} — ${recs.length} records ════════`);
    printAccepted(r.name || id);
    if (r.region) console.log(`   region: ${r.region}${r.barType ? " · barType " + r.barType : ""}${r.indoors ? " · indoors" : ""}${r.dark ? " · dark" : ""}`);
    console.log(`   exits: ${Object.keys(r.exits || {}).join(", ") || "—"}`);
    for (const rec of recs) {
      console.log(`\n— ${rec.ref}`);
      console.log(rec.text);
      printRender(rec);
    }
  }
  if (seeding) { seedDossiers(picked); process.exit(0); }
  console.log(`\n[${n} rooms]`);
  if (_warned) console.log(`⚠ ${_warned} render warning(s) — see the checklist in this file's header`);
  process.exit(0);
}

if (has("about") || has("dossiers")) {
  const subs = _subjects();
  const want = val("about");
  const pick = want
    ? [...subs.keys()].filter(k => k.toLowerCase().includes(want.toLowerCase()))
    : [...subs.keys()];
  if (!pick.length) {
    console.log(`No subject matching "${want}". Known subjects are NPCs, patrons, bars, items.`);
    process.exit(1);
  }
  const seeding = has("seed"), delta = has("delta"), picked = [];
  for (const name of pick) {
    const { re, speakerOnly } = subs.get(name);
    // a record is ABOUT a subject if it names them, or is spoken by them
    const hits = out.filter(r => r.speaker === name || (!speakerOnly && re.test(r.text)));
    if (hits.length < (want ? 1 : 2)) continue;        // a bulk dump skips one-liners
    const state = dossierState("subject:" + name, hits);
    if (delta && state === "current") continue;
    picked.push(["subject:" + name, hits]);
    if (seeding) continue;
    console.log(`\n\n════════ ${name} — ${hits.length} records ════════`);
    printAccepted(name);
    for (const r of hits) {
      console.log(`\n— ${r.ref}${r.speaker ? "  (" + r.speaker + ")" : ""}  [${r.group}]`);
      console.log(r.text);
      printRender(r);
    }
  }
  if (seeding) { seedDossiers(picked); process.exit(0); }
  if (_warned) console.log(`\n⚠ ${_warned} render warning(s) — see the checklist in this file's header`);
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
    printRender(r);
  }
  console.log(`\n[${out.length} records]`);
  if (_warned) console.log(`⚠ ${_warned} render warning(s) — see the checklist in this file's header`);
}
