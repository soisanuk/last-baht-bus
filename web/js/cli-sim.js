// A fake-terminal navigation puzzle over a FICTIONAL filesystem — the operator
// path's set piece. PORTABLE by rule (docs/rabbit-arc.md, "The CLI simulator is
// a PORTABLE MODULE"): built to the games.js doctrine so a follow-on game can
// import this file unchanged.
//
//   - Pure. No G, no DOM, no output side-effects, no wall-clock. Every random
//     decision takes an injected rnd() (the host passes its save-seeded RNG).
//   - Data-driven. The filesystem, the goal, the locks and the breadcrumbs are a
//     SCENARIO object, not code. A new level is new data.
//   - Plain-data state. cliNew() returns a serializable object the host stores
//     in its own save; cliInput() is a pure step over (scenario, state, line).
//     No closures, so a resumed save resumes the puzzle.
//   - Enumerable moves. cliOptions(scenario, state) lists EVERY legal command
//     right now — the tap-reachability constraint (a phone has no keyboard
//     worth typing `cat ~/.bash_history` on). A password only appears as an
//     option once the player has READ it somewhere; knowledge gates the chip.
//   - No host nouns in here. Money, the town, the quest, who owns the machine —
//     all in the scenario data and the host wiring. The host reads `won`.
//
// The realism is the boring truth: an unlocked machine, a file copied. Verbs
// are readable words, not real tools; nothing here maps onto exploitation.
//
// Scenario shape (see CLI_SCENARIOS in the host's data for a worked one):
//   {
//     prompt: "office-pc:~$",           // shown at the head of each turn
//     home:   "/home/manager",          // starting directory
//     stick:  "the stick",              // what COPY copies to (display only)
//     budget: 40,                       // commands before the screen locks (loss)
//     goal:   "wallet.dat",             // COPY this → won
//     bonus:  ["regulars.xls"],         // optional extras COPY also records
//     fs: {                              // directories keyed by absolute path
//       "/home/manager": { dirs: ["vault", "photos"], files: { "notes.txt": "…" } },
//       "/home/manager/vault": { locked: "pass1234", files: { "wallet.dat": "…" } },
//     },
//     help: ["ls — what's here", …],    // optional override for the help card
//   }
//
// Public API (all pure):
//   cliNew(scenario, rnd)                 → state
//   cliInput(scenario, state, line, rnd)  → { output: string[], done, won, lost, took: [] }
//   cliOptions(scenario, state)           → string[]   (every legal command now)
//   cliPrompt(scenario, state)            → string     (the prompt line for a redraw)

const CLI_VERBS = ["help", "ls", "cd", "read", "find", "unlock", "copy", "exit"];

function cliNew(scenario, rnd) {
  return {
    cwd: scenario.home,
    steps: 0,
    known: [],        // strings the player has READ that unlock something
    opened: [],       // directories unlocked so far
    took: [],         // files copied to the stick
    done: false, won: false, lost: false,
    seed: typeof rnd === "function" ? Math.floor(rnd() * 1e6) : 0,
  };
}

function _cliDir(scenario, path) { return scenario.fs[path] || null; }
function _cliJoin(cwd, name) {
  if (name === "..") { const p = cwd.split("/").filter(Boolean); p.pop(); return "/" + p.join("/"); }
  if (name.startsWith("/")) return name.replace(/\/+$/, "") || "/";
  return (cwd === "/" ? "" : cwd) + "/" + name;
}
function _cliLocked(scenario, state, path) {
  const d = _cliDir(scenario, path);
  return !!(d && d.locked && !state.opened.includes(path));
}
function _cliShort(path) { return path.split("/").filter(Boolean).pop() || "/"; }

function cliPrompt(scenario, state) {
  const p = scenario.prompt || "$";
  return p.replace(/~/, "~" + (state.cwd === scenario.home ? "" : "/" + _cliShort(state.cwd)));
}

// every legal command right now — the whole point of the data shape
function cliOptions(scenario, state) {
  if (state.done) return [];
  const here = _cliDir(scenario, state.cwd) || { dirs: [], files: {} };
  const out = ["help", "ls"];
  for (const d of here.dirs || []) {
    const path = _cliJoin(state.cwd, d);
    if (_cliLocked(scenario, state, path)) {
      const key = _cliDir(scenario, path).locked;
      if (state.known.includes(key)) out.push(`unlock ${d} ${key}`);
    } else out.push(`cd ${d}`);
  }
  if (state.cwd !== "/") out.push("cd ..");
  for (const f of Object.keys(here.files || {})) {
    out.push(`read ${f}`);
    if (f === scenario.goal || (scenario.bonus || []).includes(f)) {
      if (!state.took.includes(f)) out.push(`copy ${f}`);
    }
  }
  out.push("exit");
  return out;
}

function _cliHelp(scenario) {
  return scenario.help || [
    "help            this list",
    "ls              what's in this folder",
    "cd <folder>     go into a folder (cd .. goes back up)",
    "read <file>     open a file and read it",
    "find <word>     look for a file or folder by name, everywhere you can reach",
    "unlock <folder> <password>   open a locked folder",
    "copy <file>     copy a file to " + (scenario.stick || "the stick"),
    "exit            leave the machine as you found it",
  ];
}

// the pure step. Returns the lines to print and the new terminal state.
function cliInput(scenario, state, line, rnd) {
  const res = { output: [], done: false, won: false, lost: false, took: [] };
  if (state.done) { res.done = true; res.won = state.won; res.lost = state.lost; return res; }
  const words = String(line || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  const verb = words[0] || "";
  const arg = words[1] || "";
  const here = _cliDir(scenario, state.cwd) || { dirs: [], files: {} };
  const say = (s) => res.output.push(s);

  // a step is a step whatever you typed — the machine does not care that you
  // mistyped, and the budget is the only clock in here
  state.steps++;

  if (!verb || verb === "help" || verb === "?") {
    for (const l of _cliHelp(scenario)) say(l);
  } else if (verb === "ls" || verb === "dir" || verb === "list") {
    const rows = [];
    for (const d of here.dirs || []) {
      const path = _cliJoin(state.cwd, d);
      rows.push(d + "/" + (_cliLocked(scenario, state, path) ? "  [locked]" : ""));
    }
    for (const f of Object.keys(here.files || {})) rows.push(f + (state.took.includes(f) ? "  (copied)" : ""));
    say(rows.length ? rows.join("\n") : "(empty)");
  } else if (verb === "cd") {
    if (!arg) say("cd where? (ls lists the folders)");
    else {
      const path = _cliJoin(state.cwd, arg);
      const d = _cliDir(scenario, path);
      if (!d) say(`no such folder: ${arg}`);
      else if (_cliLocked(scenario, state, path)) say(`${arg}/ is locked. (unlock ${arg} <password>)`);
      else { state.cwd = path; say(`${_cliShort(path)}/`); }
    }
  } else if (verb === "read" || verb === "cat" || verb === "open" || verb === "type") {
    if (!arg) say("read what? (ls lists the files)");
    else if (!(here.files && Object.prototype.hasOwnProperty.call(here.files, arg))) say(`no such file here: ${arg}`);
    else {
      const body = here.files[arg];
      say(body);
      // anything a file REVEALS becomes known — and therefore tappable
      for (const path of Object.keys(scenario.fs)) {
        const key = scenario.fs[path].locked;
        if (key && body.includes(key) && !state.known.includes(key)) state.known.push(key);
      }
      for (const k of (scenario.reveals && scenario.reveals[arg]) || []) if (!state.known.includes(k)) state.known.push(k);
    }
  } else if (verb === "find" || verb === "search") {
    if (!arg) say("find what? (a word from a file or folder name)");
    else {
      const hits = [];
      for (const path of Object.keys(scenario.fs)) {
        if (_cliLocked(scenario, state, path)) continue;          // you can't see inside a locked folder
        const parts = path.split("/").filter(Boolean);
        // only reachable from an unlocked chain
        let ok = true, acc = "";
        for (const p of parts) { acc += "/" + p; if (_cliLocked(scenario, state, acc)) { ok = false; break; } }
        if (!ok) continue;
        for (const d of scenario.fs[path].dirs || []) if (d.includes(arg)) hits.push(_cliJoin(path, d) + "/");
        for (const f of Object.keys(scenario.fs[path].files || {})) if (f.includes(arg)) hits.push(_cliJoin(path, f));
      }
      say(hits.length ? hits.join("\n") : `nothing called ${arg} anywhere you can reach`);
    }
  } else if (verb === "unlock" || verb === "open-folder") {
    const pw = words.slice(2).join(" ");
    if (!arg) say("unlock what? (unlock <folder> <password>)");
    else {
      const path = _cliJoin(state.cwd, arg);
      const d = _cliDir(scenario, path);
      if (!d) say(`no such folder: ${arg}`);
      else if (!d.locked) say(`${arg}/ isn't locked.`);
      else if (state.opened.includes(path)) say(`${arg}/ is already open.`);
      else if (!pw) say(`unlock ${arg} <password> — it wants a password.`);
      else if (pw !== String(d.locked).toLowerCase()) say("wrong password. The cursor blinks at you, unimpressed.");
      else { state.opened.push(path); say(`${arg}/ unlocked.`); }
    }
  } else if (verb === "copy" || verb === "cp" || verb === "take" || verb === "get") {
    if (!arg) say("copy what? (copy <file>)");
    else if (!(here.files && Object.prototype.hasOwnProperty.call(here.files, arg))) say(`no such file here: ${arg}`);
    else if (state.took.includes(arg)) say(`${arg} is already on ${scenario.stick || "the stick"}.`);
    else if (arg !== scenario.goal && !(scenario.bonus || []).includes(arg)) say(`${arg} — nothing on it worth the space. Leave it.`);
    else {
      state.took.push(arg); res.took.push(arg);
      say(`${arg} → ${scenario.stick || "the stick"}. Done.`);
      if (arg === scenario.goal) { state.done = true; state.won = true; }
    }
  } else if (verb === "exit" || verb === "quit" || verb === "logout" || verb === "leave") {
    state.done = true;   // not a loss: walked away with whatever was copied
    say("You leave it exactly as you found it — screen on, cursor blinking, nobody the wiser.");
  } else {
    say(`${verb}: not a thing this machine does. (help lists what is.)`);
  }

  // the only clock: the budget
  if (!state.done && scenario.budget && state.steps >= scenario.budget) {
    state.done = true; state.lost = true;
    say(scenario.lockLine || "The screen dims, then locks. Whatever timer this machine runs on, you ran it out.");
  }
  res.done = state.done; res.won = state.won; res.lost = state.lost;
  return res;
}
