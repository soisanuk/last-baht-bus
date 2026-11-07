// A fake-terminal navigation puzzle over a FICTIONAL filesystem — the operator
// path's set piece. PORTABLE by rule (docs/rabbit-arc.md, "The CLI simulator is
// a PORTABLE MODULE"): built to the games.js doctrine so a follow-on game can
// import this file unchanged.
//
//   - Pure. No G, no DOM, no output side-effects, no wall-clock. Every random
//     decision takes an injected rnd() (the host passes its save-seeded RNG).
//   - Data-driven. The filesystem, the goal, the locks and the breadcrumbs are a
//     SCENARIO object, not code. A new level is new data.
//   - Pluggable verbs. The command set is a REGISTRY of plain verb objects, not
//     an if-chain: CLI_CORE_VERBS is the default set, and a scenario may add
//     verbs of its own (`scenario.verbs`) or drop core ones (`scenario.dropVerbs`).
//     A host never patches this module; it hands verbs in as data.
//   - Plain-data state. cliNew() returns a serializable object the host stores
//     in its own save; cliInput() is a pure step over (scenario, state, line).
//     A scenario verb keeps whatever it needs under state.ext[<verb name>], so a
//     save stays JSON and an old save without `ext` still loads.
//   - Enumerable moves. cliOptions(scenario, state) lists EVERY legal command
//     right now — the tap-reachability constraint (a phone has no keyboard
//     worth typing `cat ~/.bash_history` on). It asks each active verb for its
//     options. A password only appears as an option once the player has READ it
//     somewhere; knowledge gates the chip.
//   - No host nouns in here. Money, the town, the quest, who owns the machine —
//     all in the scenario data and the host wiring. The host reads `won`.
//
// The realism is the boring truth: an unlocked machine, a file copied. Verbs
// are readable words, not real tools; nothing here maps onto exploitation —
// and a scenario's own verbs are held to the same rule.
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
//     verbs: [ <verb>, … ],              // optional: extra verbs, or a core verb replaced by name
//     dropVerbs: ["find"],               // optional: core verbs this machine does not have
//   }
//
// A verb is a plain object:
//   {
//     name:    "grep",                   // what the player types first
//     aliases: ["search-text"],          // optional other words for it
//     help:    "grep <word>     …",      // one line for the help card
//     run(ctx, arg, words) { … },        // do it: ctx.say(line), read/write ctx.state
//     options(ctx) { return [ … ] },     // every legal use of it RIGHT NOW (tap-reachability)
//   }
//   ctx = { scenario, state, rnd, say, res, here, dir(path), join(name), locked(path), ext() }
//   — everything a verb needs, nothing from the host. ext() is state.ext[<this verb>],
//   created empty on first use. Budget, step counting and the goal check stay in
//   the core loop; a verb only does its own thing (EXIT may end the session).
//
// Public API (all pure):
//   cliNew(scenario, rnd)                 → state
//   cliInput(scenario, state, line, rnd)  → { output: string[], done, won, lost, took: [] }
//   cliOptions(scenario, state)           → string[]   (every legal command now)
//   cliPrompt(scenario, state)            → string     (the prompt line for a redraw)
//   cliVerbs(scenario)                    → verb[]     (the active registry, core + scenario)

function cliNew(scenario, rnd) {
  return {
    cwd: scenario.home,
    steps: 0,
    known: [],        // strings the player has READ that unlock something
    opened: [],       // directories unlocked so far
    took: [],         // files copied to the stick
    ext: {},          // scenario verbs' own state, by verb name
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
function _cliHere(scenario, state) { return _cliDir(scenario, state.cwd) || { dirs: [], files: {} }; }
function _cliHas(here, f) { return !!(here.files && Object.prototype.hasOwnProperty.call(here.files, f)); }
function _cliCopyable(scenario, f) { return f === scenario.goal || (scenario.bonus || []).includes(f); }

// ── THE CORE VERBS ───────────────────────────────────────────────────────────
// Each is the same shape a scenario's own verb has. Their options() keep the
// order the chips have always had: cd and unlock come per FOLDER, read and copy
// per FILE (cliOptions interleaves them that way).
const CLI_CORE_VERBS = [
  { name: "help", aliases: ["?"], help: "help            this list",
    run(ctx) { for (const l of _cliHelp(ctx.scenario)) ctx.say(l); },
    options() { return ["help"]; } },

  { name: "ls", aliases: ["dir", "list"], help: "ls              what's in this folder",
    run(ctx, arg) {
      const rows = [];
      if (arg && arg.startsWith("-")) rows.push("(flags ignored — this is a very small machine)");
      else if (arg) rows.push(`(ls takes no path here — cd first; you're in ${_cliShort(ctx.state.cwd)}/)`);
      for (const d of ctx.here.dirs || []) rows.push(d + "/" + (ctx.locked(ctx.join(d)) ? "  [locked]" : ""));
      for (const f of Object.keys(ctx.here.files || {})) rows.push(f + (ctx.state.took.includes(f) ? "  (copied)" : ""));
      ctx.say(rows.length ? rows.join("\n") : "(empty)");
    },
    options() { return ["ls"]; } },

  { name: "cd", help: "cd <folder>     go into a folder (cd .. goes back up)",
    run(ctx, arg) {
      if (!arg) return ctx.say("cd where? (ls lists the folders)");
      if (arg === ".." && !ctx.dir(ctx.join(".."))) return ctx.say("you're at the top of what you can reach.");
      const path = ctx.join(arg), d = ctx.dir(path);
      if (!d) ctx.say(`no such folder: ${arg}`);
      else if (ctx.locked(path)) ctx.say(`${arg}/ is locked. (unlock ${arg} <password>)`);
      else { ctx.state.cwd = path; ctx.say(`${_cliShort(path)}/`); }
    },
    options(ctx) {
      const out = (ctx.here.dirs || []).filter(d => !ctx.locked(ctx.join(d))).map(d => `cd ${d}`);
      if (ctx.state.cwd !== "/") out.push("cd ..");
      return out;
    } },

  { name: "read", aliases: ["cat", "open", "type"], help: "read <file>     open a file and read it",
    run(ctx, arg) {
      if (!arg) return ctx.say("read what? (ls lists the files)");
      if (!_cliHas(ctx.here, arg)) return ctx.say(`no such file here: ${arg}`);
      const body = ctx.here.files[arg], st = ctx.state, sc = ctx.scenario;
      ctx.say(body);
      // anything a file REVEALS becomes known — and therefore tappable
      for (const path of Object.keys(sc.fs)) {
        const key = sc.fs[path].locked;
        if (key && body.includes(key) && !st.known.includes(key)) st.known.push(key);
      }
      for (const k of (sc.reveals && sc.reveals[arg]) || []) if (!st.known.includes(k)) st.known.push(k);
    },
    options(ctx) { return Object.keys(ctx.here.files || {}).map(f => `read ${f}`); } },

  { name: "find", aliases: ["search"], help: "find <word>     look for a file or folder by name, everywhere you can reach",
    run(ctx, arg) {
      if (!arg) return ctx.say("find what? (a word from a file or folder name)");
      const sc = ctx.scenario, hits = [];
      for (const path of Object.keys(sc.fs)) {
        if (ctx.locked(path)) continue;          // you can't see inside a locked folder
        // only reachable from an unlocked chain
        let ok = true, acc = "";
        for (const p of path.split("/").filter(Boolean)) { acc += "/" + p; if (ctx.locked(acc)) { ok = false; break; } }
        if (!ok) continue;
        for (const d of sc.fs[path].dirs || []) if (d.includes(arg)) hits.push(_cliJoin(path, d) + "/");
        for (const f of Object.keys(sc.fs[path].files || {})) if (f.includes(arg)) hits.push(_cliJoin(path, f));
      }
      ctx.say(hits.length ? hits.join("\n") : `nothing called ${arg} anywhere you can reach`);
    },
    options() { return []; } },   // a free-text search: typed, never a chip (as it always was)

  { name: "unlock", aliases: ["open-folder"], help: "unlock <folder> <password>   open a locked folder",
    run(ctx, arg, words) {
      const pw = words.slice(2).join(" ");
      if (!arg) return ctx.say("unlock what? (unlock <folder> <password>)");
      const path = ctx.join(arg), d = ctx.dir(path);
      if (!d) ctx.say(`no such folder: ${arg}`);
      else if (!d.locked) ctx.say(`${arg}/ isn't locked.`);
      else if (ctx.state.opened.includes(path)) ctx.say(`${arg}/ is already open.`);
      else if (!pw) ctx.say(`unlock ${arg} <password> — it wants a password.`);
      else if (pw !== String(d.locked).toLowerCase()) ctx.say("wrong password. The cursor blinks at you, unimpressed.");
      else { ctx.state.opened.push(path); ctx.say(`${arg}/ unlocked.`); }
    },
    options(ctx) {
      return (ctx.here.dirs || []).filter(d => ctx.locked(ctx.join(d)) && ctx.state.known.includes(ctx.dir(ctx.join(d)).locked))
        .map(d => `unlock ${d} ${ctx.dir(ctx.join(d)).locked}`);
    } },

  { name: "copy", aliases: ["cp", "take", "get"], help: null,   // its help line names the stick: _cliHelp builds it
    run(ctx, arg) {
      const sc = ctx.scenario, st = ctx.state, stick = sc.stick || "the stick";
      if (!arg) return ctx.say("copy what? (copy <file>)");
      if (!_cliHas(ctx.here, arg)) return ctx.say(`no such file here: ${arg}`);
      if (st.took.includes(arg)) return ctx.say(`${arg} is already on ${stick}.`);
      if (!_cliCopyable(sc, arg)) return ctx.say(`${arg} — nothing on it worth the space. Leave it.`);
      st.took.push(arg); ctx.res.took.push(arg);
      ctx.say(`${arg} → ${stick}. Done.`);
    },
    options(ctx) {
      return Object.keys(ctx.here.files || {}).filter(f => _cliCopyable(ctx.scenario, f) && !ctx.state.took.includes(f)).map(f => `copy ${f}`);
    } },

  { name: "exit", aliases: ["quit", "logout", "leave"], help: "exit            leave the machine as you found it",
    run(ctx) {
      ctx.state.done = true;   // not a loss: walked away with whatever was copied
      ctx.say("You leave it exactly as you found it — screen on, cursor blinking, nobody the wiser.");
    },
    options() { return ["exit"]; } },
];
// the core command names, in card order (kept for any host that read the old constant)
const CLI_VERBS = CLI_CORE_VERBS.map(v => v.name);

// The active registry: the core set, minus what the scenario drops, with the
// scenario's verbs replacing a core verb of the same name or inserted before
// EXIT. EXIT cannot be dropped — it is how a host ends the session for the player.
function cliVerbs(scenario) {
  const drop = new Set(((scenario && scenario.dropVerbs) || []).filter(n => n !== "exit"));
  const extra = (scenario && scenario.verbs) || [];
  const byName = new Map(extra.map(v => [v.name, v]));
  const out = CLI_CORE_VERBS.filter(v => !drop.has(v.name)).map(v => byName.get(v.name) || v);
  const added = extra.filter(v => !CLI_VERBS.includes(v.name));
  const exitAt = out.findIndex(v => v.name === "exit");
  out.splice(exitAt < 0 ? out.length : exitAt, 0, ...added);
  return out;
}
function _cliFind(verbs, word) {
  return verbs.find(v => v.name === word || (v.aliases || []).includes(word)) || null;
}

function _cliCtx(scenario, state, rnd, res, verbName) {
  return {
    scenario, state, rnd, res,
    say: (s) => res.output.push(s),
    here: _cliHere(scenario, state),
    dir: (path) => _cliDir(scenario, path),
    join: (name) => _cliJoin(state.cwd, name),
    locked: (path) => _cliLocked(scenario, state, path),
    ext: () => { const e = (state.ext = state.ext || {}); return (e[verbName] = e[verbName] || {}); },
  };
}

function cliPrompt(scenario, state) {
  const p = scenario.prompt || "$";
  const rel = state.cwd === scenario.home ? "" :
    state.cwd.startsWith(scenario.home + "/") ? state.cwd.slice(scenario.home.length) : state.cwd;
  return p.replace(/~/, "~" + rel);
}

// every legal command right now — each active verb says what it can do. The core
// verbs keep their old order: help, ls, then per FOLDER its cd or unlock, cd ..,
// then per FILE its read and copy; a scenario's verbs follow, and exit is last.
function cliOptions(scenario, state) {
  if (state.done) return [];
  const verbs = cliVerbs(scenario);
  const res = { output: [], took: [] };
  const opts = new Map(verbs.map(v => [v.name, (typeof v.options === "function" ? v.options(_cliCtx(scenario, state, null, res, v.name)) : []) || []]));
  const take = (name) => opts.get(name) || [];
  const here = _cliHere(scenario, state);
  const out = [...take("help"), ...take("ls")];
  const cd = take("cd"), unlock = take("unlock"), read = take("read"), copy = take("copy");
  for (const d of here.dirs || []) out.push(...cd.filter(o => o === `cd ${d}`), ...unlock.filter(o => o.startsWith(`unlock ${d} `)));
  out.push(...cd.filter(o => o === "cd .."));
  for (const f of Object.keys(here.files || {})) out.push(...read.filter(o => o === `read ${f}`), ...copy.filter(o => o === `copy ${f}`));
  // anything a core verb offers outside that shape (a replaced verb's own options) still appears
  const placed = new Set(out);
  for (const v of verbs) if (CLI_VERBS.includes(v.name) && v.name !== "exit") for (const o of take(v.name)) if (!placed.has(o)) { out.push(o); placed.add(o); }
  for (const v of verbs) if (!CLI_VERBS.includes(v.name)) out.push(...take(v.name));
  out.push(...take("exit"));
  return out;
}

function _cliHelp(scenario) {
  if (scenario.help) return scenario.help;
  return cliVerbs(scenario).map(v => v.name === "copy" && !v.help
    ? "copy <file>     copy a file to " + (scenario.stick || "the stick")
    : v.help).filter(Boolean);
}

// the pure step. Returns the lines to print and the new terminal state.
function cliInput(scenario, state, line, rnd) {
  const res = { output: [], done: false, won: false, lost: false, took: [] };
  if (state.done) { res.done = true; res.won = state.won; res.lost = state.lost; return res; }
  const words = String(line || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  const word = words[0] || "";
  const arg = words[1] || "";
  const say = (s) => res.output.push(s);

  // a step is a step whatever you typed — the machine does not care that you
  // mistyped, and the budget is the only clock in here
  state.steps++;

  const verbs = cliVerbs(scenario);
  const verb = word ? _cliFind(verbs, word) : _cliFind(verbs, "help");
  if (verb) verb.run(_cliCtx(scenario, state, rnd, res, verb.name), arg, words);
  else say(word ? `${word}: not a thing this machine does. (help lists what is.)` : "(The cursor waits for a command.)");

  // THE GOAL is the core's to check, whichever verb put the file on the stick
  if (!state.done && scenario.goal && state.took.includes(scenario.goal)) { state.done = true; state.won = true; }

  // the only clock: the budget — and it TELEGRAPHS, at 15 and 5 to go, in the
  // scenario's own words (warnLines) or a plain default
  if (!state.done && scenario.budget) {
    const left = scenario.budget - state.steps;
    const warn = scenario.warnLines || {};
    if (left === 15) say(warn.far || "(A small clock icon has appeared in the corner of the screen. It was not there before.)");
    if (left === 5)  say(warn.near || "(The clock icon is blinking. Whatever this machine does when nobody touches it, it is about to do.)");
  }
  if (!state.done && scenario.budget && state.steps >= scenario.budget) {
    state.done = true; state.lost = true;
    say(scenario.lockLine || "The screen dims, then locks. Whatever timer this machine runs on, you ran it out.");
  }
  res.done = state.done; res.won = state.won; res.lost = state.lost;
  return res;
}
