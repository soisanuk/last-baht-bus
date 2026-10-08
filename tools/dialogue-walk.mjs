#!/usr/bin/env node
// DIALOGUE WALK — every authored node, reached in the order the gates allow, and PROVED
// by delivery (2026-10-02; Mario: "is it possible to walk the dialogue nodes via the
// graph in the correct order?").
//
//   node tools/dialogue-walk.mjs                       # summary: reached / unreached per character
//   node tools/dialogue-walk.mjs --script <dir>        # …and one Markdown script per character into <dir>
//   node tools/dialogue-walk.mjs --only lek,bert       # a few characters
//   node tools/dialogue-walk.mjs --filler              # include the generated cast (one of each role per bar is plenty)
//   node tools/dialogue-walk.mjs --json                # the summary as JSON (what docs/dialogue-walk.json holds)
//   node tools/dialogue-walk.mjs --shared [--all]      # six-word runs two characters share (a report, not a gate)
//   node tools/dialogue-walk.mjs --lint [--all]        # the mechanical checks, run BEFORE paying a reader:
//        dead (shadowed by an ungated earlier node), preempt (the engine answers the ask first),
//        residue (a template or a constant's name in the RENDERED text), fact (a character
//        stating two ages or two home provinces), duplicate (one text, two characters),
//        register (--register only: advisory, see lint()), gist (a short
//        no shorter than its text), pronoun, opener, quotes, spacing
//
// THE ORDER COMES FROM THE GRAPH, THE PROOF FROM THE ENGINE. docs/world-graph.json knows
// which node SETS which flag and which node REQUIRES or FORBIDS it; a node whose gate is
// set by another node of the same character is reached by delivering that node first
// (so a quest's run of nodes plays as a run), and a flag set elsewhere — another
// character, a room's reads, an engine site — is FORCED, and the script says so with the
// setter named. The state is carried forward within a character and reset between them.
// Delivery is the real path: the ask goes through _doTalkBody, and the node counts as
// reached only when G.talked[npc] gains its index — the same book the game keeps.
//
// WHAT IT CANNOT ORDER (and reports as unreached, with the gate): a `when(st, G)` closure
// that no trust level 0–5 satisfies, a character the clock never puts in a room, a topic
// the parser routes elsewhere before the node (a pre-empt), dice. Those are the leaves a
// human or a persona still has to look at; everything else is proved here.
//
// Each script prints the FULL text (first delivery) and the GIST (second — the terse
// repeat), under the node's gates and the forced flags, so a reader can judge tone,
// facts and English across a character's whole run in one document.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import vm from "node:vm";
const REPO = new URL("../", import.meta.url).pathname;
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(REPO + "web/js/" + f + ".js", "utf8"), { filename: f + ".js" });
const GRAPH = JSON.parse(readFileSync(REPO + "docs/world-graph.json", "utf8"));
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const REGISTER = args.includes("--register"), NO_STUB = args.includes("--no-stub"), LINT = args.includes("--lint"), LINT_ALL = args.includes("--all");
const SCRIPT_DIR = opt("--script"), ONLY = (opt("--only") || "").split(",").filter(Boolean), FILLER = args.includes("--filler"), JSON_OUT = args.includes("--json");
let out = [];
engineInit((t, c) => out.push({ text: String(t), cls: c }));
const quiet = () => { for (const k in ENCOUNTERS) G.encDone[k] = true; G.pendingEnc = null; G.peddlerNight = 9; };
const flagSetters = {};   // flag → { dialogue: ["lek#1"], engine: ["engine-x.js:123"], reads: [...] }
for (const f of GRAPH.flags) flagSetters[f.name] = { dialogue: f.setByDialogue || [], engine: f.setByEngine || [], reads: f.setByReads || [] };

function fresh(npc, act1) {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en", teetotal: false };
  if (!act1) { G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet"); }
  G.money = 20000; G.bank = 50000; G.battery = 100; G.hunger = 10; G.thirst = 10;
  quiet();
}
// THE ATOMS OF A GATE. A `when(st, G)` closure is code, but nearly every one is a
// conjunction of a dozen recognisable tests, and its SOURCE says which: flags, quest
// states, trust, dstate, mood, know, day parity, the identity picks, a faction, the
// previous trip's bond. Reading them off the source gives a candidate state; the
// engine's own _pickDialogue then says whether the candidate is right. Anything the
// atoms miss is covered by a small grid (day, rain, trust, dstate, the hour).
function atomsOf(src) {
  const a = [];
  const re = /(!?)\s*_flag\("([^"]+)"\)/g; let m;
  while ((m = re.exec(src))) a.push({ k: "flag", v: m[2], on: m[1] !== "!" });
  const rq = /G\.quests\.(\w+)\s*(===|!==)\s*"(\w+)"/g;
  while ((m = rq.exec(src))) a.push({ k: "quest", v: m[1], state: m[3], on: m[2] === "===" });
  const rd = /st\.dstate\s*(===|!==)\s*"(\w+)"/g;
  while ((m = rd.exec(src))) a.push({ k: "dstate", v: m[2], on: m[1] === "===" });
  const rm = /st\.mood\s*(===|!==)\s*"(\w+)"/g;
  while ((m = rm.exec(src))) a.push({ k: "mood", v: m[2], on: m[1] === "===" });
  const rt = /st\.trust\s*(>=|>|<=|<|===)\s*(\d)/g;
  while ((m = rt.exec(src))) a.push({ k: "trust", op: m[1], n: +m[2] });
  const rk = /(!?)\s*st\.know\s*&&\s*st\.know\.(\w+)|(!?)\s*st\.know\.(\w+)/g;
  while ((m = rk.exec(src))) a.push({ k: "know", v: m[2] || m[4], on: (m[1] || m[3]) !== "!" });
  const rp = /G\.day\s*%\s*2\s*===\s*(\d)/g;
  while ((m = rp.exec(src))) a.push({ k: "parity", n: +m[1] });
  const ro = /(!?)\s*_(isOrigin|pers|orient)\("(\w+)"\)/g;
  while ((m = ro.exec(src))) a.push({ k: m[2], v: m[3], on: m[1] !== "!" });
  const rf = /_faction\("(\w+)"\)\s*(>=|>|<|<=)\s*(-?\d)/g;
  while ((m = rf.exec(src))) a.push({ k: "faction", v: m[1], op: m[2], n: +m[3] });
  const rb = /G\.prevBond\.(\w+)\s*>=\s*(\d)/g;
  while ((m = rb.exec(src))) a.push({ k: "prevBond", v: m[1], n: +m[2] });
  const ry = /G\.player\.said(?:\s*&&\s*G\.player\.said)?\.(\w+)/g;
  while ((m = ry.exec(src))) a.push({ k: "said", v: m[1], on: true });
  const rs = /G\.stage\s*(===|!==)\s*"(\w+)"/g;
  while ((m = rs.exec(src))) a.push({ k: "stage", v: m[2], on: m[1] === "===" });
  return a;
}
function applyAtoms(npc, atoms, invert) {
  const st = _npcState(npc);
  for (const a of atoms) {
    const on = invert ? !a.on : a.on;
    if (a.k === "flag") { if (on) _setFlag(a.v); else delete G.flags[a.v]; }
    else if (a.k === "quest") { if (on) G.quests[a.v] = a.state; else if (G.quests[a.v] === a.state) G.quests[a.v] = a.state === "done" ? "active" : "done"; }
    else if (a.k === "dstate") st.dstate = on ? a.v : (a.v === "stranger" ? "known" : "stranger");
    else if (a.k === "mood") st.mood = on ? a.v : (a.v === "guarded" ? "warm" : "guarded");
    else if (a.k === "trust") st.trust = invert ? (a.op === ">=" || a.op === ">" ? 0 : 5) : (a.op === ">=" ? a.n : a.op === ">" ? a.n + 1 : a.op === "<" ? Math.max(0, a.n - 1) : a.op === "<=" ? a.n : a.n);
    else if (a.k === "know") { st.know = st.know || {}; if (on) st.know[a.v] = true; else delete st.know[a.v]; }
    else if (a.k === "parity") G.day = (G.day % 2 === a.n) === !invert ? G.day : G.day + 1;
    else if (a.k === "isOrigin") { if (on) G.player.origin = a.v; else if (G.player.origin === a.v) G.player.origin = "monger"; }
    else if (a.k === "pers") { if (on) G.player.personality = a.v; else if (G.player.personality === a.v) G.player.personality = "joker"; }
    else if (a.k === "orient") { if (on) G.player.orientation = a.v; else if (G.player.orientation === a.v) G.player.orientation = "straight"; }
    else if (a.k === "faction") { G.faction = G.faction || { plg: 0, samson: 0, indie: 0, syndicate: 0 }; G.faction[a.v] = invert ? (a.op[0] === ">" ? -5 : 5) : (a.op === ">=" ? a.n : a.op === ">" ? a.n + 1 : a.op === "<" ? a.n - 1 : a.n); }
    else if (a.k === "prevBond") { G.prevBond = G.prevBond || {}; if (!invert) G.prevBond[a.v] = a.n; else delete G.prevBond[a.v]; }
    else if (a.k === "said") { G.player.said = G.player.said || {}; if (!invert) G.player.said[a.v] = a.v === "home" ? "Rotterdam" : "a thing you told her"; else delete G.player.said[a.v]; }
    else if (a.k === "stage") { if (on) G.stage = a.v; else if (G.stage === a.v) G.stage = a.v === "expat" ? "vacation" : "expat"; }
  }
}
function gatesOf(d) { return { req: d.req || [], notFlags: d.notFlags || [], bond: d.bond || 0, when: d.when ? String(d.when).replace(/\s+/g, " ").slice(0, 140) : null, sets: d.sets || [] }; }
// a repeat that came from a SHARED pool, not an authored short: one pool line printed for every
// man on the rail read to the first readers as fourteen authored gists (2026-10-02)
function poolGist(npc, gist) {
  const n = NPCS[npc].name, his = (typeof _pr === "function" ? _pr(npc).p : "his");
  const pools = [typeof _ASK_AGAIN !== "undefined" ? _ASK_AGAIN : [], typeof _ASK_AGAIN_EN !== "undefined" ? _ASK_AGAIN_EN : [],
    typeof _ASK_AGAIN_FLUENT !== "undefined" ? _ASK_AGAIN_FLUENT : [], typeof _PATRON_AGAIN !== "undefined" ? _PATRON_AGAIN : []];
  return pools.some(p => p.some(f => { try { return gist.includes(f(n, his)); } catch (e) { return false; } }));
}
function topicOf(d) { return d.topic ? String(d.topic).split("|")[0].trim() : null; }
function sameTopic(a, b) {   // would node a be offered the topic that reaches node b?
  const t = topicOf(b);
  if (!t) return !a.topic;
  if (!a.topic) return false;
  if (_topicExact(a.topic, t)) return true;
  return _topicHits(a.topic, t) && !(typeof _topicExact === "function" && _topicExact(b.topic, t));
}
function stand(npc) {
  for (const day of [G.day, 1, 2, 3, 4, 5, 6, 7]) for (const turn of [30, 10, 50, 70, 0, 90, 110]) {
    G.day = day; G.nightTurn = turn; G.room = _npcRoom(npc);
    if (G.room && _npcsHere().includes(npc)) return true;
  }
  return false;
}
function force(flag, on, log) {
  // a flag set only by a CHOICE has no node setter (the laundering quests, 2026-10-08)
  if (on && !_flag(flag)) { _setFlag(flag); const s = flagSetters[flag] || { dialogue: [], engine: [], reads: [] }; log.push(`+${flag} (${s.dialogue.length ? "set by " + s.dialogue.slice(0, 2).join(", ") : s.engine.length ? "engine: " + s.engine[0] : s.reads.length ? "reads: " + s.reads[0] : "no known setter"})`); }
  if (!on && _flag(flag)) { delete G.flags[flag]; log.push(`−${flag}`); }
}
// the oracle: would THIS node be the one _pickDialogue hands back right now?
function wouldPick(npc, i) { const d = NPCS[npc].dialogue[i]; return _pickDialogue(npc, topicOf(d)) === d; }
// search the small grid of things the atoms don't cover, until the oracle says yes
function seek(npc, i) {
  if (wouldPick(npc, i)) return true;
  const st = _npcState(npc), keep = { day: G.day, rain: G.rain, trust: st.trust, dstate: st.dstate, turn: G.nightTurn };
  for (const day of [keep.day, 1, 2, 3, 4, 5, 6, 7]) for (const rain of [keep.rain, 0, 5]) for (const trust of [keep.trust, 0, 1, 2, 3, 4, 5]) for (const ds of [keep.dstate, "stranger", "known"]) {
    G.day = day; G.rain = rain; st.trust = trust; st.dstate = ds;
    if (stand(npc) && wouldPick(npc, i)) return true;
  }
  G.day = keep.day; G.rain = keep.rain; st.trust = keep.trust; st.dstate = keep.dstate; G.nightTurn = keep.turn;
  return false;
}
function deliverNow(npc, i) {
  const d = NPCS[npc].dialogue[i];
  const before = new Set((G.talked[npc] || []));
  out = [];
  const saved = _rand; _rand = () => 0.5;
  try { _doTalkBody(npc, topicOf(d)); } catch (e) { _rand = saved; return { ok: false, err: String(e && e.message || e) }; }
  _rand = saved;
  const after = (G.talked[npc] || []);
  return { ok: after.includes(i) && !before.has(i), text: out.map(o => o.text).join("\n") };
}
function walk(npc) {
  const n = NPCS[npc];
  const nodes = n.dialogue || [];
  const result = { npc, name: n.name, room: n.room, role: NPC_ROLES[npc] || (n.patron ? "patron" : n.manager ? "manager" : n.filler ? "filler" : "story"), total: nodes.length, reached: [], unreached: [] };
  const delivered = new Set();
  const visit = (i, depth) => {
    if (delivered.has(i) || depth > 6) return false;
    const d = nodes[i], forced = [];
    // her own setters first — a run plays as a run
    for (const f of d.req || []) {
      if (_flag(f)) continue;
      const own = ((flagSetters[f] || {}).dialogue || []).filter(k => k.startsWith(npc + "#")).map(k => +k.split("#")[1]);
      let done = false;
      for (const j of own) if (!delivered.has(j) && visit(j, depth + 1)) { done = true; break; }
      if (!done) force(f, true, forced);
    }
    for (const f of d.notFlags || []) if (_flag(f)) force(f, false, forced);
    if (d.bond && _knownTier(npc) < d.bond) { G.soc.drinks[npc] = [0, 3, 7, 13][d.bond] || 13; forced.push(`bond ${d.bond}`); }
    if (d.when) { const at = atomsOf(String(d.when)); if (at.length) { applyAtoms(npc, at, false); forced.push("when: " + at.map(a => a.k + (a.v ? ":" + a.v : "") + (a.n != null ? a.n : "") + (a.on === false ? " off" : "")).join(", ")); } }
    // THE SHADOW: an earlier node on the same topic must FAIL its gates for this one to be
    // picked — clear what it requires, set what it forbids, invert its atoms, drop below
    // its bond — unless this node needs the same thing, in which case it is truly shadowed
    for (let j = 0; j < i; j++) {
      const e = nodes[j]; if (!sameTopic(e, d)) continue;
      for (const f of e.req || []) if (!(d.req || []).includes(f) && _flag(f)) force(f, false, forced);
      for (const f of e.notFlags || []) if (!(d.notFlags || []).includes(f) && !_flag(f) && f !== "act1Done") force(f, true, forced);
      if (e.bond && (!d.bond || d.bond < e.bond)) { G.soc.drinks[npc] = Math.min(G.soc.drinks[npc] || 0, [0, 2, 6, 12][e.bond] || 0); if (G.prevBond) delete G.prevBond[npc]; forced.push(`below bond ${e.bond}`); }
      if (e.when && !(d.when && String(d.when) === String(e.when))) { const at = atomsOf(String(e.when)); const mine = d.when ? atomsOf(String(d.when)) : []; const inv = at.filter(a => !mine.some(b => b.k === a.k && b.v === a.v)); if (inv.length) { applyAtoms(npc, inv, true); forced.push("un-" + nodes.indexOf(e)); } }
    }
    if (!stand(npc)) { result.unreached.push({ key: npc + "#" + i, topic: d.topic || null, why: "never in a room with you (clock/calendar)" }); return false; }
    if (!seek(npc, i)) return false;
    const r = deliverNow(npc, i);
    if (!r.ok) return false;
    delivered.add(i);
    // the gist: the terse repeat, as the game prints it — unless the node's own gate closed once it
    // was heard (it set the flag that hid it), in which case a second ask reaches ANOTHER node, and
    // three readers took that node's words for this one's repeat (2026-10-02)
    const next = _pickDialogue(npc, topicOf(d));
    const closedTo = next && next !== d ? nodes.indexOf(next) : null;
    out = []; const sv = _rand; _rand = () => 0.5; try { _doTalkBody(npc, topicOf(d)); } catch (e) {} _rand = sv;
    const gist = closedTo != null ? `(no repeat: this node's gate closes once it is heard — a second ask reaches #${closedTo})` : out.map(o => o.text).join("\n");
    // a node's CHOICES are branches of their own: each is typed as its label, under its gate
    const choices = [];
    for (const c of d.choices || []) {
      if (c.when) applyAtoms(npc, atomsOf(String(c.when)), false);
      G.convo = npc; G.convoIdx = i;
      out = []; const sv2 = _rand; _rand = () => 0.5; try { doCommand(c.label); } catch (e) {} _rand = sv2;
      choices.push({ label: c.label, when: c.when ? String(c.when).replace(/\s+/g, " ").slice(0, 100) : null, text: out.map(o => o.text).join("\n") });
    }
    result.reached.push({ key: npc + "#" + i, index: i, topic: d.topic || null, gates: { req: d.req || [], notFlags: d.notFlags || [], bond: d.bond || 0, when: d.when ? String(d.when).replace(/\s+/g, " ").slice(0, 140) : null, sets: d.sets || [] }, forced, text: r.text, gist, choices });
    return true;
  };
  // Act One nodes first, in an Act One state; then the sandbox; two passes, since a later node's forcing can open an earlier one
  fresh(npc, true);
  for (let i = 0; i < nodes.length; i++) if ((nodes[i].notFlags || []).includes("act1Done")) visit(i, 0);
  fresh(npc, false);
  for (let pass = 0; pass < 2; pass++) for (let i = 0; i < nodes.length; i++) if (!delivered.has(i)) visit(i, 0);
  // THE STUB PASS. What the search cannot satisfy is still TEXT somebody wrote, and the
  // reader needs every branch. Make this node's gate true and every earlier node on its
  // topic false, deliver it the real way if the engine lets the topic through, and say
  // plainly that the state was stubbed — this proves the WORDS, not that a player gets
  // there. A topic the engine answers before her list is read is a PRE-EMPT: the text
  // comes from _deliver directly and the lint reports the node as unreachable by ASK.
  if (!NO_STUB) for (let i = 0; i < nodes.length; i++) {
    if (delivered.has(i)) continue;
    const d = nodes[i];
    const earlierUngated = !!d.topic && nodes.slice(0, i).some(e => sameTopic(e, d) && !e.req?.length && !e.notFlags?.length && !e.when && !e.bond);
    if (earlierUngated) continue;
    fresh(npc, (d.notFlags || []).includes("act1Done"));
    const saved = [], forced = ["STUBBED: gate forced true, earlier same-topic nodes forced false"];
    const stub = (node, v) => { saved.push([node, node.when, node.req, node.bond]); node.when = () => v; if (!v) { node.req = ["__never__"]; } };
    try {
      for (let j = 0; j < i; j++) if (sameTopic(nodes[j], d)) stub(nodes[j], false);
      if (d.when) applyAtoms(npc, atomsOf(String(saved.find(x => x[0] === d) ? "" : d.when)), false);
      stub(d, true); d.req = saved[saved.length - 1][2];
      { const w = saved[saved.length - 1][1]; if (w) applyAtoms(npc, atomsOf(String(w)), false); }
      for (const f of d.req || []) _setFlag(f);
      for (const f of d.notFlags || []) delete G.flags[f];
      if (d.bond) G.soc.drinks[npc] = [0, 3, 7, 13][d.bond] || 13;
      let r = null;
      if (stand(npc)) r = deliverNow(npc, i);
      if (r && r.ok) {
        out = []; const sv = _rand; _rand = () => 0.5; try { _doTalkBody(npc, topicOf(d)); } catch (e) {} _rand = sv;
        result.reached.push({ key: npc + "#" + i, index: i, topic: d.topic || null, stubbed: true, gates: gatesOf(d), forced, text: r.text, gist: out.map(o => o.text).join("\n"), choices: [] });
        delivered.add(i);
      } else {
        const offstage = !stand(npc);
        out = []; const sv = _rand; _rand = () => 0.5; try { G.talked[npc] = []; _deliver(npc, d, true, true); } catch (e) {} _rand = sv;
        const text = out.map(o => o.text).join("\n");
        result.reached.push({ key: npc + "#" + i, index: i, topic: d.topic || null, stubbed: true, preempt: !offstage, offstage, gates: gatesOf(d),
          forced: [offstage ? "OFFSTAGE: never in a room you stand in — text read by direct delivery" : "PRE-EMPT: the engine answers this ask before her list is read — text read by direct delivery"], text, gist: "", choices: [] });
        delivered.add(i);
      }
    } finally { for (const [node, w, rq, bd] of saved.reverse()) { node.when = w; node.req = rq; node.bond = bd; if (w === undefined) delete node.when; if (rq === undefined) delete node.req; } }
  }
  for (let i = 0; i < nodes.length; i++) if (!delivered.has(i) && !result.unreached.some(u => u.key === npc + "#" + i)) {
    const d = nodes[i];
    const earlier = d.topic ? nodes.slice(0, i).filter(e => sameTopic(e, d) && !e.req?.length && !e.notFlags?.length && !e.when && !e.bond) : [];
    result.unreached.push({ key: npc + "#" + i, topic: d.topic || null,
      why: earlier.length ? `DEAD: shadowed by an ungated earlier node on the same topic (#${nodes.indexOf(earlier[0])})`
        : d.when ? "when(st, G) the atoms could not satisfy: " + String(d.when).replace(/\s+/g, " ").slice(0, 140)
        : "not delivered in any state tried (a pre-empt in _doTalkBody takes the topic, or an earlier gated node always wins)" });
  }
  result.unreached = result.unreached.filter((u, k, all) => !delivered.has(+u.key.split("#")[1]) && all.findIndex(v => v.key === u.key) === k);
  result.reached.sort((a, b) => a.index - b.index);
  return result;
}
// --shared: six-word runs that two or more CHARACTERS share, read off the data (no walk needed).
// A REPORT, not a gate: on 2026-10-02 it found 170 runs, most of them narrator constructions
// ("he says it the way other men…" in six mouths) — worth a sub-editor's eye, too noisy to fail on.
// The voice pass's real finds were all of this shape: "fixed money, long memory", "first real
// freedom", "be nobody", "I keep witnesses close" — one woman's line in five women's mouths.
if (args.includes("--shared")) {
  const N = +(opt("--shared-n") || 6), idx = new Map();
  for (const id of Object.keys(NPCS)) {
    if (NPCS[id].filler && !(typeof FLOOR_OWN !== "undefined" && FLOOR_OWN[id])) continue;
    (NPCS[id].dialogue || []).forEach((d, i) => {
      const seen = new Set();
      for (const s of [d.text, d.short]) {
        const w = stripMarkup(String(s || "")).toLowerCase().replace(/[^a-z' ]+/g, " ").split(/\s+/).filter(Boolean);
        for (let k = 0; k + N <= w.length; k++) { const g = w.slice(k, k + N).join(" "); if (seen.has(g)) continue; seen.add(g); (idx.get(g) || idx.set(g, new Set()).get(g)).add(id + "#" + i); }
      }
    });
  }
  // the generated floor's POOLS count as one speaker each (round 63: the walker skipped the filler,
  // which is where the worst repetition lived) — so an authored woman echoing a pool line shows up
  const POOLS = ["_H_GREET", "_H_FAMILY", "_H_PLAN", "_H_FREE", "_M_GREET", "_M_FAMILY", "_M_PLAN", "_M_GIRLS", "_M_WALLET", "_C_GREET", "_C_FAMILY", "_C_MONEY", "_C_WALLET"];
  for (const name of POOLS) {
    let pool; try { pool = vm.runInThisContext(name); } catch (e) { continue; }
    (pool || []).forEach((line, i) => {
      if (typeof line !== "string") return;
      const seen = new Set();
      const w = stripMarkup(line).toLowerCase().replace(/[^a-z' ]+/g, " ").split(/\s+/).filter(Boolean);
      for (let k = 0; k + N <= w.length; k++) { const g = w.slice(k, k + N).join(" "); if (seen.has(g)) continue; seen.add(g); (idx.get(g) || idx.set(g, new Set()).get(g)).add("pool:" + name + "#" + i); }
    });
  }
  const hits = [...idx].map(([g, ks]) => [g, [...ks], new Set([...ks].map(k => k.split("#")[0])).size]).filter(h => h[2] > 1).sort((a, b) => b[2] - a[2]);
  console.log(`shared ${N}-word runs across characters: ${hits.length}`);
  for (const [g, ks, n] of hits.slice(0, LINT_ALL ? 9999 : 60)) console.log(`  ${n}× "${g}" — ${ks.join(" ")}`);
  process.exit(0);
}
// a floor woman with her OWN lines (FLOOR_OWN) is walked like any authored character
const ownLines = id => typeof FLOOR_OWN !== "undefined" && !!FLOOR_OWN[id];
const cast = Object.keys(NPCS).filter(id => (NPCS[id].dialogue || []).length && (FILLER || !NPCS[id].filler || ownLines(id)) && (!ONLY.length || ONLY.includes(id)));
const results = cast.map(walk);
const summary = { date: "2026-10-02", cast: results.length, nodes: results.reduce((a, r) => a + r.total, 0), reached: results.reduce((a, r) => a + r.reached.length, 0),
  stubbed: results.reduce((a, r) => a + r.reached.filter(x => x.stubbed).length, 0),
  perNpc: Object.fromEntries(results.map(r => [r.npc, { total: r.total, reached: r.reached.length, stubbed: r.reached.filter(x => x.stubbed).map(x => x.index), unreached: r.unreached }])) };
if (SCRIPT_DIR) {
  mkdirSync(SCRIPT_DIR, { recursive: true });
  for (const r of results) {
    const lines = [`# ${r.name} — ${_barName(r.room) || r.room} (${r.role}) — ${r.reached.length}/${r.total} nodes reached`, ""];
    for (const x of r.reached) {
      const g = [];
      if (x.gates.req.length) g.push("req " + x.gates.req.join(","));
      if (x.gates.notFlags.length) g.push("not " + x.gates.notFlags.join(","));
      if (x.gates.bond) g.push("bond " + x.gates.bond);
      if (x.gates.when) g.push("when " + x.gates.when);
      if (x.gates.sets.length) g.push("→ sets " + x.gates.sets.join(","));
      lines.push(`## [${x.key}] ${x.topic ? "ASK ABOUT " + String(x.topic).split("|")[0] : "(hello)"}${x.topic && String(x.topic).includes("|") ? "  (aliases: " + x.topic + ")" : ""}`);
      if (g.length) lines.push("_gates: " + g.join(" · ") + "_");
      if (x.forced.length) lines.push(`_${x.stubbed ? "⚠ " : ""}reached by forcing: ${x.forced.join("; ")}_`);
      lines.push("", x.text, "", `> gist${x.gist && poolGist(r.npc, x.gist) ? " (a line from the shared repeat pool — this node has no authored short)" : ""}: ${x.gist.replace(/\n/g, " ")}`, "");
      for (const c of x.choices || []) lines.push(`### choice: "${c.label}"${c.when ? "  _(when " + c.when + ")_" : ""}`, "", c.text, "");
    }
    if (r.unreached.length) { lines.push("## UNREACHED", ""); for (const u of r.unreached) lines.push(`- ${u.key}${u.topic ? " (" + u.topic + ")" : ""}: ${u.why}`); }
    writeFileSync(`${SCRIPT_DIR}/${r.npc}.md`, lines.join("\n") + "\n");
  }
  writeFileSync(`${SCRIPT_DIR}/INDEX.md`, ["# Dialogue walk — " + results.length + " characters, " + summary.reached + "/" + summary.nodes + " nodes reached", "",
    ...results.sort((a, b) => b.total - a.total).map(r => `- [${r.name}](${r.npc}.md) — ${_barName(r.room) || r.room} · ${r.role} · ${r.reached.length}/${r.total}` + (r.unreached.length ? ` · unreached: ${r.unreached.map(u => u.key.split("#")[1]).join(" ")}` : ""))].join("\n") + "\n");
}
// ── THE LINT: what a machine can say about the words before a reader is paid to ──────
// Every check runs on the RENDERED text the walk captured (so a template that leaks, a
// constant that printed its own name, a pronoun the engine substituted, are all visible),
// and each is narrow on purpose: the reader's tokens are for what only a reader sees.
function lint(results) {
  const F = [];
  const add = (cls, key, msg, sev = "warn") => F.push({ cls, key, msg, sev });
  const PROV = ["Buriram", "Khon Kaen", "Udon", "Ubon", "Surin", "Sisaket", "Si Sa Ket", "Nong Khai", "Korat", "Nakhon Ratchasima", "Chaiyaphum", "Roi Et", "Yasothon", "Mukdahan", "Kalasin", "Sakon Nakhon", "Loei", "Nakhon Phanom", "Maha Sarakham", "Amnat Charoen", "Bueng Kan", "Nong Bua Lamphu", "Chiang Mai", "Chiang Rai", "Phitsanulok", "Lampang", "Nan", "Phrae", "Rayong", "Chanthaburi", "Trat", "Hat Yai", "Songkhla", "Phuket", "Krabi", "Surat Thani", "Prachuap", "Hua Hin", "Ayutthaya", "Lopburi", "Kanchanaburi", "Sattahip"];
  const quoted = t => (t.match(/[“"]([^"”]{2,})[”"]/g) || []).map(q => q.slice(1, -1)).join(" ");
  const narration = t => t.replace(/[“"][^"”]*[”"]/g, " ");
  const TING = /\b(na|ka|krub|khrap|tilac|same same|no have|cannot|mai pen rai|sabai|you go|i go|very good|no problem|up to you|boss|teerak|is okay)\b/gi;
  const textIndex = new Map();
  for (const r of results) {
    const n = NPCS[r.npc];
    const fem = (n.pronoun || (NPC_ROLES[r.npc] ? "she" : null));
    const ages = new Map(), provs = new Map(), openers = new Map(); let tingNodes = 0, speechNodes = 0;
    const perNode = [];
    for (const x of r.reached) {
      const t = stripMarkup(x.text || ""), d = n.dialogue[x.index];
      if (x.preempt && !d.superseded) add("preempt", x.key, `topic ${JSON.stringify(x.topic || "(hello)")} is answered by the engine before the character's own list is read — this node is unreachable by ASK`, "high");
      // template residue and printed code
      const res = t.match(/\$\{[^}]*\}|\{[a-zA-Z]+\}|%[a-z]+%|\bundefined\b|\bNaN\b|\[object [A-Z]\w+\]|" \+ [A-Z_]+|[A-Z_]{4,} \+ "/);
      if (res) add("residue", x.key, `rendered text carries ${JSON.stringify(res[0])}`, "high");
      if (/  \S/.test(t.replace(/\n/g, " ").replace(/^\s+/, "")) && /[a-z]  [a-z]/.test(t)) add("spacing", x.key, "a double space inside a sentence", "low");
      const qs = (t.match(/[“”"]/g) || []).length; if (qs % 2) add("quotes", x.key, "an odd number of quote marks", "low");
      // the gist
      if (d.short && d.short.length >= (d.text || "").length) add("gist", x.key, `the authored short (${d.short.length}) is not shorter than the text (${(d.text || "").length})`);
      if (x.gist && x.gist.trim() === t.trim() && !(d.gives || d.sets)) add("gist", x.key, "the repeat printed the full text again — no short, no brush-off", "low");
      // facts: ages, provinces
      for (const m of t.matchAll(/\b(?:I am|I'm|I was|she is|he is|she's|he's)\s+(\d{2})\b(?!\s*(?:baht|minutes|nights|days|months|%))/gi)) { const v = +m[1]; if (v > 15 && v < 95) (ages.get(v) || ages.set(v, []).get(v)).push(x.key); }
      for (const m of t.matchAll(/\b(\d{2}) years old\b/gi)) { const v = +m[1]; (ages.get(v) || ages.set(v, []).get(v)).push(x.key); }
      const homeCtx = /\b(from|home|my mama|my mother|my village|my province|back in|up in|born)\b/i;
      for (const pv of PROV) if (new RegExp("\\b" + pv + "\\b").test(t) && homeCtx.test(t)) (provs.get(pv) || provs.set(pv, []).get(pv)).push(x.key);
      // openers
      const op = (quoted(t) || narration(t)).trim().split(/\s+/).slice(0, 4).join(" ").toLowerCase().replace(/[^a-z ]/g, "");
      if (op.split(" ").length === 4) (openers.get(op) || openers.set(op, []).get(op)).push(x.key);
      // register: Tinglish markers in her own speech
      const sp = quoted(t); const words = sp.split(/\s+/).filter(Boolean).length;
      if (words >= 12) { speechNodes++; const hits = (sp.match(TING) || []).length + (sp.match(/\b(I|you|she|he) (no|not) [a-z]+\b/g) || []).length; if (hits) tingNodes++; perNode.push({ key: x.key, words, hits }); }
      // pronoun: the first narration pronoun when the text opens on her name
      const nar = narration(t);
      if (fem && nar.trim().startsWith(n.name)) { const pm = nar.match(/\b(he|she|his|her|him)\b/i); if (pm) { const isF = /^(she|her)$/i.test(pm[1]); if ((fem === "she") !== isF && !/\b(he|him|his)\b/.test(n.name)) add("pronoun", x.key, `narration about ${n.name} (${fem}) uses "${pm[1]}"`, "low"); } }
      // cross-character duplicates
      const norm = t.replace(/[^a-z ]/gi, "").toLowerCase().replace(/\s+/g, " ").trim();
      if (norm.length >= 60) { const k = norm.slice(0, 120); (textIndex.get(k) || textIndex.set(k, []).get(k)).push(x.key); }
    }
    if (ages.size > 1) add("fact", r.npc, `${n.name} states ${ages.size} different ages: ` + [...ages].map(([v, k]) => v + " (" + k.join(",") + ")").join("; ") + (n.age ? ` — data says ${n.age}` : ""));
    else if (ages.size === 1 && n.age && ![...ages.keys()].some(v => Math.abs(v - n.age) <= 1)) add("fact", r.npc, `${n.name} says ${[...ages.keys()][0]}; data says ${n.age}`);
    if (provs.size > 1) add("fact", r.npc, `${n.name} places home in ${provs.size} provinces: ` + [...provs].map(([v, k]) => v + " (" + k.join(",") + ")").join("; "), "warn");
    for (const [o, ks] of openers) if (ks.length >= 3) add("opener", r.npc, `${ks.length} nodes open "${o}…": ${ks.join(", ")}`, "low");
    // register outliers: a Tinglish speaker with a long node of clean English, or an English speaker who suddenly isn't
    // ADVISORY ONLY (--register): its first run flagged 23 nodes and three readers kept all 23 —
    // light Tinglish reads as clean English to a marker count, and the real slips it missed
    // (Tan, Kwan, Ploy) needed a reader. A lint whose every hit is benign teaches people to skip it.
    if (REGISTER && speechNodes >= 4) {
      const share = tingNodes / speechNodes;
      for (const p of perNode) {
        if (share >= 0.6 && !p.hits && p.words >= 25) add("register", p.key, `${n.name} speaks Tinglish in ${Math.round(share * 100)}% of ${fem === "he" ? "his" : "her"} speaking nodes; this one is ${p.words} words of clean English`);
        if (share <= 0.15 && p.hits >= 2) add("register", p.key, `${n.name} speaks clean English in ${Math.round((1 - share) * 100)}% of nodes; this one has ${p.hits} Tinglish markers`);
      }
    }
  }
  for (const [k, ks] of textIndex) { const who = new Set(ks.map(x => x.split("#")[0])); if (who.size > 1) add("duplicate", ks.join(" = "), `the same text from ${who.size} characters: "${k.slice(0, 70)}…"`); }
  for (const r of results) for (const u of r.unreached) if (/^DEAD/.test(u.why)) add("dead", u.key, u.why, "high");
  return F;
}
if (LINT) {
  const F = lint(results);
  const by = {}; for (const f of F) (by[f.cls] = by[f.cls] || []).push(f);
  console.log(`dialogue lint: ${F.length} findings over ${summary.reached} nodes — ` + Object.entries(by).map(([k, v]) => k + " " + v.length).join(" · "));
  const order = ["dead", "preempt", "residue", "fact", "duplicate", "register", "gist", "pronoun", "opener", "quotes", "spacing"];
  for (const k of order) if (by[k]) { console.log("\n── " + k + " (" + by[k].length + ")"); for (const f of by[k].slice(0, LINT_ALL ? 999 : 25)) console.log(`  [${f.sev}] ${f.key}: ${f.msg}`); if (!LINT_ALL && by[k].length > 25) console.log(`  … ${by[k].length - 25} more (--all)`); }
}
else if (JSON_OUT) console.log(JSON.stringify(summary, null, 1));
else if (!LINT) {
  console.log(`dialogue walk: ${summary.reached}/${summary.nodes} authored nodes read across ${summary.cast} characters (${summary.reached - summary.stubbed} proved by state, ${summary.stubbed} by stubbing a gate)`);
  const un = results.filter(r => r.unreached.length).sort((a, b) => b.unreached.length - a.unreached.length);
  for (const r of un.slice(0, 40)) console.log(`  ${r.npc.padEnd(14)} ${String(r.reached.length).padStart(3)}/${String(r.total).padEnd(3)}  ` + r.unreached.map(u => u.key.split("#")[1] + ":" + u.why.slice(0, 60)).join(" | "));
  if (un.length > 40) console.log(`  … ${un.length - 40} more`);
}
