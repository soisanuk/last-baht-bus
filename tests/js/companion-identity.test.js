// THE WOMAN ON YOUR ARM HAS A BAR, AND IT IS NOT THIS ONE (2026-10-13, after rounds 85 and 91). A companion's
// _npcRoom is wherever you are — she is with you — so any line that decides "her bar" or "my colleague" from
// _npcRoom claims her for every room she walks into: eleven venues said "One of mine" of Ple in round 91, and she
// called their mamasan "Mama, she look after us". This plays it out across the town rather than listing call
// sites: one woman from each bar on your arm, every OTHER bar's staff asked about her, and she asked about them.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text) => out.push(String(text)));

// a member of another bar's staff claiming her, and her claiming another bar's floor
const CLAIMED = /\b(one of mine|works here|she work here|is ours|same bar, same girl|off the book tonight|my problem again)\b/i;
const CLAIMS = /\b(look after us|mama good|our mama|my mama is strict|bar sister|my sister\. not real sister)\b/i;

test("no bar claims a woman from another bar on your arm, and she claims no other bar's floor", () => {
  const bad = [];
  let asked = 0;
  const bars = Object.keys(ROOMS).filter(r => ROOMS[r].barType && ROOMS[r].barType !== "gents" && !ROOMS[r].invite);
  // one woman per bar, a sample of bars to keep the run short
  const from = bars.filter((_, i) => i % 6 === 0);
  for (const home of from) {
    newGame();
    G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
    G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
    for (const k in ENCOUNTERS) G.encDone[k] = true;
    G.peddlerNight = 9; G.lastSaleng = 99999; G.money = 20000; G.nightTurn = 30;
    G.room = home;
    const her = _npcsHere().find(i => NPC_ROLES[i] === "hostess" && NPCS[i].room === home);
    if (!her) continue;
    G.party = { ids: [her], stops: 1, spent: 0, seen: { [home]: true }, rooms: { [her]: [home] } };
    for (const room of bars.filter(r => r !== home && !(NPCS[her].bars || []).includes(r)).filter((_, i) => i % 5 === 0)) {
      G.room = room; G.nightTurn = 30; G.party.rooms[her].push(room);
      for (const s of _npcsHere().filter(i => i !== her && (NPC_ROLES[i] || NPCS[i].house || NPCS[i].manager)).slice(0, 2)) {
        G.convo = null; G.convoQ = null; out = [];
        doCommand(`ask ${NPCS[s].name.toLowerCase()} about ${NPCS[her].name.toLowerCase()}`); asked++;
        if (CLAIMED.test(out.join("\n"))) bad.push(`${s}@${room} claims ${her} (${home}): ${out.join(" ").slice(0, 100)}`);
        G.convo = null; G.convoQ = null; out = [];
        doCommand(`ask ${NPCS[her].name.toLowerCase()} about ${NPCS[s].name.toLowerCase()}`); asked++;
        if (CLAIMS.test(out.join("\n"))) bad.push(`${her} (${home}) claims ${s}@${room}: ${out.join(" ").slice(0, 100)}`);
      }
    }
  }
  assert.ok(asked > 60, `the check asked enough (${asked})`);
  assert.deepEqual(bad, [], "a companion was claimed by, or claimed, a bar that is not hers");
});
