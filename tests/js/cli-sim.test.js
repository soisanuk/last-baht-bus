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
  for (const noun of [/baht/i, /สนุก/, /PLG/, /Naklua/, /Pattaya/, /Rabbit/])
    assert.doesNotMatch(src, noun, `no host noun ${noun} in the simulator`);
});


test("cd .. at the top says so; ls flags are noted; the prompt shows the full relative path", () => {
  const st = cliNew(FIX, seq([0.5]));
  assert.match(cliInput(FIX, st, "cd ..", seq([0.5])).output.join("\n"), /top of what you can reach/);
  assert.match(cliInput(FIX, st, "ls -la", seq([0.5])).output.join("\n"), /flags ignored/);
  const deep = { ...FIX, fs: { ...FIX.fs, "/home/u/side": { dirs: ["deeper"], files: {} }, "/home/u/side/deeper": { files: { "x.txt": "x" } } } };
  const s2 = cliNew(deep, seq([0.5]));
  cliInput(deep, s2, "cd side", seq([0.5])); cliInput(deep, s2, "cd deeper", seq([0.5]));
  assert.equal(cliPrompt(deep, s2), "box:~/side/deeper$", "every segment, not just the last");
});

test("the budget telegraphs at 15 and 5 to go, in the scenario's words or a default", () => {
  const sc = { ...FIX, budget: 20 };
  const st = cliNew(sc, seq([0.5]));
  let warned = [];
  for (let i = 0; i < 20 && !st.done; i++) {
    const r = cliInput(sc, st, "ls", seq([0.5]));
    if (r.output.some(l => /clock icon/.test(l))) warned.push(st.steps);
  }
  assert.deepEqual(warned, [5, 15], "warnings land at 15-to-go and 5-to-go");
  assert.ok(st.lost, "and then it locks");
});

// ── PLUGGABLE VERBS (2026-10-10): the command set is a registry a scenario adds to or trims, as
// data — a follow-on game brings its own verbs without touching this file. A fixture verb, defined
// HERE (not in the module): SKIM <word> reads every file in the current folder for a word, and
// remembers what it found under state.ext.skim so the save stays plain data.
const SKIM = {
  name: "skim", help: "skim <word>     look for a word inside the files here",
  run(ctx, arg) {
    if (!arg) return ctx.say("skim for what?");
    const hits = Object.keys(ctx.here.files || {}).filter(f => String(ctx.here.files[f]).includes(arg));
    const mem = ctx.ext(); mem.found = (mem.found || []).concat(hits.filter(h => !(mem.found || []).includes(h)));
    ctx.say(hits.length ? hits.join("\n") : `no file here mentions ${arg}`);
  },
  options(ctx) { return Object.keys(ctx.here.files || {}).length ? ["skim locked"] : []; },
};

test("a scenario's own verb registers, is offered, runs, keeps its state as plain data, and is on the help card", () => {
  const sc = { ...FIX, verbs: [SKIM] };
  const st = cliNew(sc, seq([0.5]));
  const o = cliOptions(sc, st);
  assert.ok(o.includes("skim locked"), "offered as a chip");
  assert.equal(o[o.length - 1], "exit", "before exit, which stays last");
  assert.deepEqual(o.filter(x => x !== "skim locked"), cliOptions(FIX, cliNew(FIX, seq([0.5]))), "the core options are untouched");
  assert.match(cliInput(sc, st, "skim locked", seq([0.5])).output.join("\n"), /note\.txt/);
  const back = JSON.parse(JSON.stringify(st));
  assert.deepEqual(back.ext, { skim: { found: ["note.txt"] } }, "its state rides the save");
  assert.match(cliInput(sc, st, "help", seq([0.5])).output.join("\n"), /skim <word>/, "the help card is built from the registry");
  // an old save, before ext existed, still runs the verb
  const old = cliNew(sc, seq([0.5])); delete old.ext;
  assert.match(cliInput(sc, old, "skim opensesame", seq([0.5])).output.join("\n"), /note\.txt/);
  assert.ok(old.ext.skim, "ext is created on first use");
});

test("a scenario that drops a core verb loses it from options, help and the parser; EXIT cannot be dropped", () => {
  const sc = { ...FIX, dropVerbs: ["read", "find", "exit"] };
  const st = cliNew(sc, seq([0.5]));
  const o = cliOptions(sc, st);
  assert.ok(!o.some(x => x.startsWith("read ")), "no read chips");
  assert.ok(o.includes("exit"), "exit stays: it is how a host ends the session");
  const help = cliInput(sc, st, "help", seq([0.5])).output.join("\n");
  assert.doesNotMatch(help, /^read|^find/m); assert.match(help, /^exit/m);
  assert.match(cliInput(sc, st, "read note.txt", seq([0.5])).output.join("\n"), /not a thing this machine does/);
  assert.match(cliInput(sc, st, "cat note.txt", seq([0.5])).output.join("\n"), /not a thing this machine does/, "its aliases go with it");
});

test("a scenario may replace a core verb by name, and the goal is still the core's to check", () => {
  const COPY2 = { name: "copy", aliases: ["cp"], help: "copy <file>     take it",
    run(ctx, arg) { if (ctx.here.files && arg in ctx.here.files) { ctx.state.took.push(arg); ctx.res.took.push(arg); ctx.say("taken."); } },
    options(ctx) { return Object.keys(ctx.here.files || {}).map(f => `copy ${f}`); } };
  const sc = { ...FIX, verbs: [COPY2] };
  const st = cliNew(sc, seq([0.5]));
  assert.ok(cliOptions(sc, st).includes("copy junk.txt"), "the replacement's options are offered");
  for (const l of ["read note.txt", "unlock locked opensesame", "cd locked"]) cliInput(sc, st, l, seq([0.5]));
  const r = cliInput(sc, st, "copy target.dat", seq([0.5]));
  assert.ok(r.won && r.done, "the core loop saw the goal on the stick");
});
