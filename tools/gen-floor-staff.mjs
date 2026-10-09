#!/usr/bin/env node
// FLOOR STAFF for new bars, from a spec — the template tool for every expansion round
// (Soi 6's two inner segments first, 2026-10-09; docs/soi6-expansion.md §3 is the checklist).
//
//   node tools/gen-floor-staff.mjs <spec.json>           # print the records it would add
//   node tools/gen-floor-staff.mjs <spec.json> --write   # append them to FLOOR_STAFF in world.js
//   … --write --replace                                # rewrite records already there (ids are stable)
//
// spec.json: [{ "room": "jade_lounge", "mama": true | "solo" | false, "cashier": true, "hostesses": 4, "authored": true }, …]
//   mama "solo" = the owner is mamasan AND cashier (no cashier record) — the small-bar canon.
//   "authored": true = the hostesses are WRITTEN, not pooled (every Soi 6 girl is hand-authored —
//   engine.test): their records are still computed, so the house staff's names and ids are the same
//   either way, but only the house staff are written and the hostesses print as a SCAFFOLD (id, name,
//   th, a look to start from) for the author. Their portraits are the same ids.
//
// WHAT IT GUARANTEES, because the suite asserts each one:
//   · a name is the floor's own (a name that only filler women carry, with its one Thai spelling),
//     never a principal's (no second Lek), unique within the bar, and not already on that street's
//     floor — names repeat across town on purpose now (namesake.test.js), never inside one room;
//   · a look is unique within the bar, and no hostess look ends on more than six women (sweep.test);
//   · every pick is a DONOR's — an existing woman of the same role, chosen by a pure hash of the
//     new id — so every index is valid, a mamasan's family and her story tail stay compatible
//     (_M_FAM_CLASH was resolved for the donor), and a hostess's family and plan are new to her rail;
//   · the desc is the house template: "<look> — one of <Bar>'s girls, from <from>. <donor's tail>".
// Deterministic: re-running it on the same spec writes the same women. --write skips an id already
// in FLOOR_STAFF, so it is idempotent. After --write: placeholder busts (scripts/gen-portraits.py
// <ids>), the portrait manifest, the graph and the export, as the checklist says.
import fs from "node:fs";
import vm from "node:vm";

const WORLD = new URL("../web/js/world.js", import.meta.url);
for (const f of ["thai", "world"]) vm.runInThisContext(fs.readFileSync(new URL(`../web/js/${f}.js`, import.meta.url), "utf8"));
const specPath = process.argv[2];
if (!specPath) { console.error("usage: gen-floor-staff.mjs <spec.json> [--write]"); process.exit(2); }
const SPEC = JSON.parse(fs.readFileSync(specPath, "utf8"));
const WRITE = process.argv.includes("--write");
const SPEC_ROOMS = new Set(SPEC.map(b => b.room));

const hh = (s, n) => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; } return h % n; };
// THE OUTPUT IS A PURE FUNCTION OF THE FLOOR OUTSIDE THE SPEC'S ROOMS: records already in those rooms
// are invisible to every choice below, so a re-run (--replace) writes the same ids, and the placeholder
// busts made for them stay valid. (The first --replace read its own output as the floor, shifted every
// name, and appended forty more women instead of replacing forty.)
const FS = Object.fromEntries(Object.entries(FLOOR_STAFF).filter(([, r]) => !SPEC_ROOMS.has(r.room)));
// a WRITTEN woman (FLOOR_OWN) is never a donor, a face or a name to borrow: her look is drawn for
// her alone and her desc tail is her own (the dry run gave a new bar the Gilt Cage's twin's name)
const OWN = new Set(Object.keys(typeof FLOOR_OWN === "object" ? FLOOR_OWN : {}));
const all = Object.entries(FS).filter(([id]) => !OWN.has(id));
const ownNames = new Set([...OWN].map(id => FS[id] && FS[id].name).filter(Boolean));
// …nor a name the AUTHORED prose already uses for one particular woman (Neil's photo is on
// Boonsri's fridge; Manow is behind your own rail): a stranger who answers to it is a misdirection
const authoredText = [
  ...Object.values(NPCS).filter(n => !n.filler && !SPEC_ROOMS.has(n.room)).flatMap(n => [n.desc, ...(n.dialogue || []).flatMap(d => [d.text, d.short])]),
  ...Object.values(ROOMS).flatMap(r => [r.desc, ...(Array.isArray(r.revisit) ? r.revisit : [])]),
  ...Object.values(typeof QUESTS === "object" ? QUESTS : {}).flatMap(q => [q.name, q.desc]),
  ...["engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"].map(f => fs.readFileSync(new URL(`../web/js/${f}.js`, import.meta.url), "utf8")),
].filter(x => typeof x === "string").join("\n");
const proseNamed = n => new RegExp("\\b" + n + "\\b").test(authoredText);

// names: the floor's own, one Thai spelling each, never a principal's
const principal = new Set(Object.entries(NPCS).filter(([id, n]) => !n.filler).map(([, n]) => String(n.name).toLowerCase()));
const thOf = {};
for (const r of Object.values(FS)) (thOf[r.name] = thOf[r.name] || new Set()).add(r.th);
// A name already carried by somebody in the spec's own rooms stays in the pool, whatever the rules
// above now say of it: once the expansion's women are WRITTEN they are principals and the prose names
// them, and excluding their names would shift the pool and rename the house staff on the next run
// (the template pin caught exactly that, 2026-10-09).
const specNames = new Set(Object.values(NPCS).filter(n => SPEC_ROOMS.has(n.room)).map(n => n.name));
const NAMES = Object.keys(thOf).filter(n => thOf[n].size === 1 && /^[A-Z][a-z]+$/.test(n) &&
  (specNames.has(n) || (!principal.has(n.toLowerCase()) && !ownNames.has(n) && !proseNamed(n)))).sort();

const lookCount = {};
for (const r of Object.values(FS)) if (r.role === "hostess") lookCount[r.look] = (lookCount[r.look] || 0) + 1;
// a donor's tail minus anything about the room she came from (a go-go badge is a go-go's)
const tail = d => (String(d).split(/(?<=from [^.]+\.)\s/)[1] || "").replace(/The badge pinned at her hip says \d+ — the number the floor knows her by\.\s*/, "").trim();
const donors = role => all.filter(([, r]) => r.role === role && !r.twin && !r.mirror);
const usedNames = new Set();   // across this run: spread the namesakes
const usedTails = new Set();   // across this run: two women four doors apart never share a story (the dry run gave both holdout mamas one husband)
const out = [];

for (const bar of SPEC) {
  const room = ROOMS[bar.room];
  if (!room) throw new Error("no such room: " + bar.room);
  const B = room.bar || room.name;
  const street = Object.keys(ROOMS).find(s => (ROOMS[s].venues || []).includes(bar.room)) || "";
  const streetNames = new Set(Object.values(NPCS).filter(n => n.room && !SPEC_ROOMS.has(n.room) && ROOMS[n.room] && (n.room === street || (ROOMS[street] && (ROOMS[street].venues || []).includes(n.room)))).map(n => n.name));
  const here = { names: new Set(), looks: new Set(), family: new Set(), plan: new Set() };
  const roles = [];
  if (bar.mama) roles.push("mamasan");
  if (bar.cashier && bar.mama !== "solo") roles.push("cashier");
  for (let i = 0; i < (bar.hostesses || 0); i++) roles.push("hostess");
  roles.forEach((role, i) => {
    const seed = bar.room + ":" + role + ":" + i;
    // the name
    const pool = NAMES.filter(n => !here.names.has(n) && !streetNames.has(n));
    const fresh = pool.filter(n => !usedNames.has(n));
    const name = (fresh.length ? fresh : pool)[hh(seed + ":name", (fresh.length ? fresh : pool).length)];
    here.names.add(name); usedNames.add(name);
    const id = bar.room + "_" + name.toLowerCase();
    // the donor: same role, family/plan new to this rail
    const ok = donors(role).filter(([, r]) => role !== "hostess" || (!here.family.has(r.pick.family) && !here.plan.has(r.pick.plan)));
    const freshTail = ok.filter(([, r]) => !usedTails.has(tail(r.desc)));
    const ds = freshTail.length ? freshTail : ok;
    const [, d] = ds[hh(seed + ":donor", ds.length)];
    if (tail(d.desc)) usedTails.add(tail(d.desc));
    // the look
    const looks = [...new Set(donors(role).map(([, r]) => r.look))].filter(l => !here.looks.has(l) && (role !== "hostess" || (lookCount[l] || 0) < 6));
    const look = looks[hh(seed + ":look", looks.length)];
    here.looks.add(look);
    if (role === "hostess") { lookCount[look] = (lookCount[look] || 0) + 1; here.family.add(d.pick.family); here.plan.add(d.pick.plan); }
    const froms = [...new Set(all.map(([, r]) => r.from))].filter(f => !/[{]/.test(f));
    const from = froms[hh(seed + ":from", froms.length)];
    const what = role === "hostess" ? `one of ${B}'s girls` : role === "mamasan" ? `the mamasan of ${B}` : `the cashier at ${B}`;
    const t = tail(d.desc);
    const rec = { role, name, th: [...thOf[name]][0], room: bar.room };
    if (role === "hostess") rec.emoji = d.emoji;
    // a look is what a RENDERER reads, so no tap markup in it (the art agent, 2026-10-09: "{{phone}}" reached
    // SDXL verbatim); the desc keeps it, because the desc is what a player reads
    const _shown = String(look).replace(/\{\{|\}\}/g, "").replace(/\bphone\b/g, "{{phone}}");   // her phone, never yours, in the desc a player reads
    Object.assign(rec, { look: look.replace(/\{\{|\}\}/g, ""), from, desc: `${_shown} — ${what}, from ${from}.` + (t ? " " + t : ""), pick: { ...d.pick } });
    if (d.selfies) rec.selfies = d.selfies;
    // the Connect 4 tier is read off her LOOK, not her donor's: a "New enough…"/"Baby-faced…" face
    // is the beatable new girl, and only that face is (engine.test's skill ladder)
    if (role === "hostess" && /^(New enough|Baby-faced)/.test(look)) rec.c4 = 2;
    out.push([id, rec, role === "hostess" && bar.authored]);
  });
}

const scaffold = out.filter(([, , a]) => a).map(([id, r]) => ({ id, name: r.name, th: r.th, room: r.room, look: r.look, from: r.from }));
const written = out.filter(([, , a]) => !a);
const lines = written.map(([id, r]) => `  ${id}: ${JSON.stringify(r)},`);
if (!WRITE) { console.log(lines.join("\n")); if (scaffold.length) console.log("\n// SCAFFOLD — hostesses to author:\n" + JSON.stringify(scaffold, null, 1)); console.error(`${written.length} records, ${scaffold.length} to author`); process.exit(0); }
let src = fs.readFileSync(WORLD, "utf8");
const MARK = "};\nfor (const [id, r] of Object.entries(FLOOR_STAFF)) {";
if (!src.includes(MARK)) throw new Error("FLOOR_STAFF's closing marker moved — update MARK");
const REPLACE = process.argv.includes("--replace");
if (REPLACE) src = src.split("\n").filter(l => { const m = l.match(/^  (\w+): \{"role":.*"room":"(\w+)"/); return !(m && SPEC_ROOMS.has(m[2])); }).join("\n");
const fresh = REPLACE ? written : written.filter(([id]) => !FLOOR_STAFF[id]);
src = src.replace(MARK, fresh.map(([id, r]) => `  ${id}: ${JSON.stringify(r)},`).join("\n") + (fresh.length ? "\n" : "") + MARK);
fs.writeFileSync(WORLD, src);
console.log(`wrote ${fresh.length} records (${written.length - fresh.length} already present)` + (scaffold.length ? `; ${scaffold.length} hostesses to author: ${scaffold.map(x => x.id).join(" ")}` : ""));
console.log(fresh.map(([id]) => id).join(" "));
