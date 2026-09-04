// The CLI simulator is a PORTABLE MODULE (docs/rabbit-arc.md): pure, data-
// driven, plain-data state, enumerable moves. This file loads ONLY cli-sim.js —
// no world.js, no engine — which is itself the portability assertion: if the
// module ever reaches for a host global, this suite fails to load.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

vm.runInThisContext(readFileSync(
  fileURLToPath(new URL("../../web/js/cli-sim.js", import.meta.url)), "utf8"), { filename: "cli-sim.js" });

const seq = a => { let i = 0; return () => a[i++ % a.length]; };

// A fixture scenario with no host nouns in it: a locked folder whose password
// is written in a note two folders away, and a bonus file off the main path.
const FIX = {
  prompt: "box:~$", home: "/home/u", stick: "the stick", budget: 30,
  goal: "target.dat", bonus: ["extra.txt"],
  fs: {
    "/home/u":       { dirs: ["locked", "side"], files: { "note.txt": "the locked one wants: opensesame", "junk.txt": "nothing" } },
    "/home/u/locked": { locked: "opensesame", files: { "target.dat": "0xDEADBEEF" } },
    "/home/u/side":   { dirs: [], files: { "extra.txt": "a bonus" } },
  },
};

test("a scripted solve: read the note, unlock, enter, copy — won", () => {
  const st = cliNew(FIX, seq([0.5]));
  const go = l => cliInput(FIX, st, l, seq([0.5]));
  assert.match(go("ls").output.join("\n"), /locked\/\s+\[locked\]/, "a locked folder says so");
  assert.match(go("cd locked").output.join("\n"), /is locked/, "and refuses entry cold");
  assert.deepEqual(st.known, [], "nothing known yet");
  go("read note.txt");
  assert.deepEqual(st.known, ["opensesame"], "reading the note makes the password KNOWN");
  assert.match(go("unlock locked wrong").output.join("\n"), /wrong password/);
  assert.match(go("unlock locked opensesame").output.join("\n"), /unlocked/);
  go("cd locked");
  assert.equal(st.cwd, "/home/u/locked");
  const r = go("copy target.dat");
  assert.ok(r.won && r.done, "copying the goal wins");
  assert.deepEqual(r.took, ["target.dat"]);
  assert.deepEqual(cliOptions(FIX, st), [], "a finished session offers nothing");
});

test("every legal move is enumerable, and knowledge gates the password chip", () => {
  const st = cliNew(FIX, seq([0.5]));
  let o = cliOptions(FIX, st);
  assert.ok(o.includes("help") && o.includes("ls") && o.includes("exit"));
  assert.ok(o.includes("cd side"), "an open folder is a cd option");
  assert.ok(!o.some(x => x.startsWith("unlock")), "the locked folder is NOT unlockable by tap until you know the word");
  assert.ok(!o.includes("cd locked"), "and not enterable");
  assert.ok(o.includes("read note.txt") && o.includes("read junk.txt"));
  assert.ok(!o.some(x => x.startsWith("copy")), "nothing here is worth copying");
  cliInput(FIX, st, "read note.txt", seq([0.5]));
  o = cliOptions(FIX, st);
  assert.ok(o.includes("unlock locked opensesame"), "once read, the unlock is one tap");
});

test("TAP-REACHABILITY: a breadth-first search over cliOptions() alone reaches the win", () => {
  // The iOS constraint, proven mechanically: never type a character, only ever
  // pick from what the scenario enumerates, and still finish.
  const key = st => JSON.stringify([st.cwd, st.known, st.opened, st.took]);
  const seen = new Set();
  const queue = [cliNew(FIX, seq([0.5]))];
  let won = false, explored = 0;
  while (queue.length && !won && explored < 5000) {
    const st = queue.shift();
    for (const opt of cliOptions(FIX, st)) {
      if (opt === "exit") continue;
      const next = JSON.parse(JSON.stringify(st));
      const r = cliInput(FIX, next, opt, seq([0.5]));
      explored++;
      if (r.won) { won = true; break; }
      if (r.done) continue;
      const k = key(next);
      if (!seen.has(k)) { seen.add(k); queue.push(next); }
    }
  }
  assert.ok(won, `the win is reachable by taps alone (explored ${explored} states)`);
});

test("the budget is the only clock: run it out and the screen locks", () => {
  const st = cliNew({ ...FIX, budget: 3 }, seq([0.5]));
  cliInput(FIX, st, "ls", seq([0.5]));
  cliInput(FIX, st, "ls", seq([0.5]));
  const r = cliInput({ ...FIX, budget: 3 }, st, "ls", seq([0.5]));
  assert.ok(r.lost && r.done && !r.won);
  assert.match(r.output.join("\n"), /locks/);
});

test("EXIT walks away: done, not lost, keeps what was copied", () => {
  const st = cliNew(FIX, seq([0.5]));
  cliInput(FIX, st, "cd side", seq([0.5]));
  cliInput(FIX, st, "copy extra.txt", seq([0.5]));
  const r = cliInput(FIX, st, "exit", seq([0.5]));
  assert.ok(r.done && !r.won && !r.lost);
  assert.deepEqual(st.took, ["extra.txt"]);
});

test("state is plain data: a JSON round-trip resumes the puzzle exactly", () => {
  const st = cliNew(FIX, seq([0.5]));
  cliInput(FIX, st, "read note.txt", seq([0.5]));
  cliInput(FIX, st, "unlock locked opensesame", seq([0.5]));
  const back = JSON.parse(JSON.stringify(st));
  assert.deepEqual(cliOptions(FIX, back), cliOptions(FIX, st));
  cliInput(FIX, back, "cd locked", seq([0.5]));
  assert.ok(cliInput(FIX, back, "copy target.dat", seq([0.5])).won);
});

test("unknown verbs point at help, find searches only what you can reach, a locked folder hides its files", () => {
  const st = cliNew(FIX, seq([0.5]));
  assert.match(cliInput(FIX, st, "sudo rm -rf /", seq([0.5])).output.join("\n"), /not a thing this machine does/);
  assert.doesNotMatch(cliInput(FIX, st, "find target", seq([0.5])).output.join("\n"), /target\.dat/,
    "you cannot find into a locked folder");
  assert.match(cliInput(FIX, st, "find extra", seq([0.5])).output.join("\n"), /side\/extra\.txt/);
});

test("the module reaches for no host global", () => {
  const src = readFileSync(fileURLToPath(new URL("../../web/js/cli-sim.js", import.meta.url)), "utf8");
  for (const bad of [/\bG\./, /\b_say\(/, /\bNPCS\b/, /\bROOMS\b/, /\bdocument\b/, /\bwindow\b/, /\blocalStorage\b/, /\bDate\b/, /Math\.random/])
    assert.doesNotMatch(src, bad, `portable: no ${bad}`);
  for (const noun of [/baht/i, /สนุก/, /WDG/, /Naklua/, /Pattaya/, /Rabbit/])
    assert.doesNotMatch(src, noun, `no host noun ${noun} in the simulator`);
});
