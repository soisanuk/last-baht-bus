// tools/prose-corpus.mjs prints the RENDER beside each record on --delta/--taps:
// the taps decorate() would produce, and an ⚠ for a third-person "the <item>" that
// taps YOUR item. Sixteen such phones passed the text-only review (2026-09-07);
// the column exists so the reviewer sees what the player will tap.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
const tool = fileURLToPath(new URL("../../tools/prose-corpus.mjs", import.meta.url));
const run = (...a) => execFileSync("node", [tool, ...a], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });

test("--taps prints the taps a record renders, and the corpus carries no third-person item tap", () => {
  const o = run("--group", "room,quest,npc,pool,fn", "--taps");
  assert.match(o, /\[taps: /, "the render column is printed");
  assert.match(o, /\[taps: [^\]]*Candy\(npc\)/, "a name is a tap");
  // the tool's own warning shape, not any ⚠ a record happens to contain (the quest journal prints one)
  assert.doesNotMatch(o, /^\s+⚠ third-person/m, "every third-person phone is wrapped — the sweep and the review column agree");
});

test("without --taps the dump is text only, and the header carries the checklist", () => {
  const o = run("--group", "quest");
  assert.doesNotMatch(o, /\[taps: /);
  const src = execFileSync("cat", [tool], { encoding: "utf8" });
  assert.match(src, /THE DELTA CHECKLIST/); assert.match(src, /never in the same shell chain as the commit/);
});

// The DOSSIER ledger is the coverage map for the co-location pass: a subject is
// read as a WHOLE, and it reopens the moment any record in it moves, because the
// moved record is the one that might contradict the rest.
test("--map reports dossier coverage for both pivots, and a moved record reopens its subject", () => {
  const map = run("--map");
  assert.match(map, /dossier review coverage/);
  assert.match(map, /cast \+ venues \+ items\s+\d+\/\d+/);
  assert.match(map, /rooms\s+\d+\/\d+/);
  assert.match(map, /dossiers current/);
  // the ledger is committed, so the map is meaningful on a fresh checkout
  const led = JSON.parse(readFileSync(fileURLToPath(new URL("../../docs/prose-dossier-ledger.json", import.meta.url)), "utf8"));
  const keys = Object.keys(led);
  assert.ok(keys.length > 300, "both pivots are recorded");
  assert.ok(keys.some(k => k.startsWith("subject:")) && keys.some(k => k.startsWith("room:")));
  for (const v of Object.values(led)) { assert.match(v.hash, /^[0-9a-f]{16}$/); assert.match(v.reviewed, /^\d{4}-\d\d-\d\d$/); }
});

test("--delta on a dossier means new-or-stale SUBJECTS, not unreviewed strings", () => {
  // the string filter must not run first, or a fully-seeded corpus yields empty dossiers
  // and every subject silently reads as reviewed
  const src = readFileSync(fileURLToPath(new URL("../../tools/prose-corpus.mjs", import.meta.url)), "utf8");
  assert.match(src, /has\("delta"\) && !has\("dossiers"\) && !has\("rooms"\)/);
  assert.match(src, /has\("seed"\) && !has\("dossiers"\) && !has\("rooms"\)/, "and --seed is scoped the same way");
});

test("a settled finding is printed at the head of its subject's dossier, so a reviewer cannot re-report it", () => {
  const acc = JSON.parse(readFileSync(fileURLToPath(new URL("../../docs/prose-dossier-accepted.json", import.meta.url)), "utf8"));
  assert.ok(acc.accepted.length, "the list exists");
  for (const a of acc.accepted)
    for (const k of ["subject", "finding", "ruled", "reason"])
      assert.ok(a[k] && a[k].length > 3, `every entry carries ${k} — a bare exemption is how a lint gets ignored`);
  const out = run("--about", "candy");
  assert.match(out, /✓ SETTLED/); assert.match(out, /she never owned it outright, she ran it/);
  // and the ruling is real in the prose
  assert.match(run("--about", "bert"), /since Candy ran the place/);
  assert.doesNotMatch(run("--about", "bert"), /since Candy owned/);
});

test("--quests is the third pivot: a quest's prose AND its wiring in one place", () => {
  const o = run("--quests", "white_dish");
  assert.match(o, /giver: bert/);
  assert.match(o, /doneFlag: wdgResolved — set by npc\.bert\.dialogue\[\d+\]/, "who actually sets the flag");
  assert.match(o, /at: bert/);
  assert.match(o, /reward:/);
  // the wiring is the point: a quest whose flag nothing sets is unfinishable, and
  // the header says so rather than leaving it to be discovered in play
  const all = run("--quests");
  assert.match(all, /\[37 quests\]/);
  assert.match(run("--map"), /quests \(wiring \+ prose\)\s+\d+\/37/);
});
