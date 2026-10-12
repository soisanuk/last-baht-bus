#!/usr/bin/env node
// THE MISS LEDGER — what real players type that the game does not take.
//
// Every other instrument here starts from the game's OWN vocabulary (the soak draws on
// engineComplete, the modal audit types the gate's own labels, the happiness audit plays
// _COMPLETE_VERBS) — so none of them can see the inverse: the sentence a person actually
// typed and the parser refused. Ron (round 82) typed "Ronnie. Ron now." to a woman who had
// asked him a question and got "That one didn't parse"; "where is the atm" and "wait 10"
// went through every audit untouched. The playtest driver now writes every refused input to
// <sessionDir>/misses.jsonl (a parse failure, a name that landed on nobody, "Not for sale
// here", "You don't see that here"), judged against the engine's live pools.
//
//   node tools/miss-ledger.mjs <sessionDir>... [--record <label>]   # merge, rank, optionally keep
//   node tools/miss-ledger.mjs --all                                 # every recorded session (docs/misses/)
//
// --record copies a session's misses into docs/misses/<label>.jsonl so they outlive the
// session's scratchpad. The ranking groups by the first two words of the input, lower-cased,
// so "where is the atm" and "where is the toilet" sit together as WHERE IS — the verb a
// player reached for — with the examples, the rooms and the replies underneath. It is a
// work queue, not a gate: a refusal can be right ("buy helicopter").
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KEEP = path.join(ROOT, "docs", "misses");
const args = process.argv.slice(2);
const recIdx = args.indexOf("--record");
const label = recIdx >= 0 ? args[recIdx + 1] : null;
const all = args.includes("--all");
const dirs = args.filter((a, i) => !a.startsWith("--") && (recIdx < 0 || i !== recIdx + 1));

const read = f => existsSync(f) ? readFileSync(f, "utf8").split("\n").filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) : [];
let rows = [];
for (const d of dirs) rows.push(...read(path.join(d, "misses.jsonl")).map(r => ({ ...r, src: path.basename(d) })));
if (label) {
  if (!existsSync(KEEP)) mkdirSync(KEEP, { recursive: true });
  writeFileSync(path.join(KEEP, label + ".jsonl"), rows.map(r => JSON.stringify(r)).join("\n") + (rows.length ? "\n" : ""));
  console.log(`kept ${rows.length} misses as docs/misses/${label}.jsonl`);
}
if (all && existsSync(KEEP))
  for (const f of readdirSync(KEEP).filter(f => f.endsWith(".jsonl")))
    rows.push(...read(path.join(KEEP, f)).map(r => ({ ...r, src: f.replace(/\.jsonl$/, "") })));

if (!rows.length) { console.log("no misses recorded"); process.exit(0); }
const key = c => String(c || "").toLowerCase().replace(/[^a-z0-9฀-๿' ]+/g, " ").trim().split(/\s+/).slice(0, 2).join(" ") || "(blank)";
const groups = new Map();
for (const r of rows) { const k = key(r.cmd); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); }
const ranked = [...groups.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
console.log(`${rows.length} refused inputs, ${ranked.length} shapes, from ${new Set(rows.map(r => r.src)).size} session(s)\n`);
for (const [k, rs] of ranked) {
  console.log(`${String(rs.length).padStart(3)}  ${k.toUpperCase()}`);
  for (const r of rs.slice(0, 4)) console.log(`       "${r.cmd}"  @${r.room || "?"}${r.convo ? " (talking to " + r.convo + ")" : ""}  → ${String(r.reply).slice(0, 70)}  [${r.src}]`);
  if (rs.length > 4) console.log(`       … and ${rs.length - 4} more`);
}
