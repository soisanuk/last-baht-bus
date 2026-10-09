#!/usr/bin/env node
// WITNESS AUDIT — prose that says the town SAW something is a promise that somebody can be
// asked about it (2026-10-02; Desmond, round 63: "the whole bar clocks it… you're spoken for
// in here, and everyone knows it" — and every colleague he asked shrugged).
//
//   node tools/witness-audit.mjs            # the unclassified claims (exit 1 if any)
//   node tools/witness-audit.mjs --all      # every claim with its class
//
// Harvests every corpus record (tools/prose-corpus.mjs --json: data, pools and function-body
// prose) for a WITNESS CLAIM — the whole bar / the soi / everybody saw, knows, clocks, will
// talk; word gets round; in front of everybody; spoken for — and requires each to be CLASSED:
//
//   general      an idiom or a fact about the world, not about something you did
//                ("everybody knows the price before they sit down")
//   consequence  about you, and KEPT by a mechanic, named in the note (the verdict scene and
//                G.maiDee; "the soi saw" and the cut phone; the bought bar and the owner rows)
//   witness      about you, and kept by PEOPLE who answer for it, named in the note and
//                proved by a test (the bonded greeting → her colleagues; tests/js/round63)
//
// The class is keyed on the source with its indices stripped plus the matched phrase, so
// rewording a pool line keeps its class and a NEW claim fails until somebody decides which
// of the three it is. That decision is the point: the class "witness" is a promise to wire
// a mouth, and the gate is what stops the next one being found by a persona stubbing a toe.
import { execFileSync } from "node:child_process";
const REPO = new URL("../", import.meta.url).pathname;

const W = "(saw|sees|see|watched|watches|watching|heard|hears|clocks|clocked|knows|knew|noticed|notices|remembers|will remember|will know|has heard|already knows|talks|talked|is talking|will talk|is watching)";
const RX = new RegExp("\\b((the whole|half the|all the|the entire|every(?:one|body) (?:in|on|at) the) (bar|room|rail|soi|floor|street|town|girls|stools)\\b[^.]{0,20}\\b" + W +
  "|every(?:body|one) (?:here |on the soi |in the bar |in town )?" + W +
  "|the (soi|town|floor|rail|girls|bar|street|room|mamasan|staff) " + W +
  "|word (?:gets|goes|got|went|will get) (?:round|around)|by (?:morning|tomorrow)[^.]{0,40}(?:everybody|the whole|the soi|the girls|the town)" +
  "|the grapevine|spoken for|news travels|the story (?:goes|went|will go) round|the talk of" +
  "|in front of (?:the whole|everybody|everyone|the girls|her friends)|nobody (?:missed|misses) it|tomorrow the (?:whole|soi))\\b", "i");

const G_ = "general", C_ = "consequence", W_ = "witness";
const CLASS = {
  // ── witness: people answer for it (tested) ─────────────────────────────────────────
  "engine-parser.js:_TAN_TOWN|everybody knows": [G_, "a fact about the town, not about you: Pattaya knows everybody, Bangkok nobody (class-N pass, 2026-10-07)"],
  "engine-parser.js:_TOWN|the soi knows": [G_, "idiom — the hostess's shrug at what happens outside her door; the witness of your night IS this line's speaker (LAST NIGHT, towntalk.test)"],
  "engine-parser.js:_LASTNIGHT_TAN_HOW|the soi noticed": [W_, "Tan answering LAST NIGHT off G.lastNightWas — he is the mouth; towntalk.test"],
  "engine-parser.js:_townTalk|everybody see": [W_, "her colleague answering LAST NIGHT off G.lastNightWas.with — she is the mouth; towntalk.test"],
  "engine-parser.js:_townTalk|the room noticed": [W_, "the house answering LAST NIGHT off G.lastNightWas.with — the mouth itself; towntalk.test"],
  "engine-systems.js:_affairCaught|the floor sees": [C_, "G.affair.discovered/soured — the floor seeing it IS the discovery, and every later verb reads it (round 66)"],
  "world.js:_H_GREET|the whole street see": [G_, "a seat with a view: idiom about the stool, not a report on you (round 65)"],
  "engine-parser.js:_doTalkCore|the floor knows": [W_, "the manager on the soured affair — the colleague review IS the witness (round 70's soured branch; round73.test)"],
  "engine-parser.js:_TOWN|the floor noticed": [W_, "the shift call's own answer: the floor that watched the call (G.bar.calls, _townTalk call_* rows; round73.test)"],
  "engine-parser.js:_TOWN|the floor remembers": [W_, "the same: the early-bus call refused, answered by the floor (G.bar.calls; round73.test)"],
  "engine-parser.js:_TOWN|everybody see": [W_, "the turned-out punter and the walk-out, answered by the room that saw them (G.bar.calls, G.lastNightWas.kicked; round73.test)"],
  "npc.tar.dialogue.short|the whole room hears": [G_, "idiom — Tar on Sunee's quiet voice: a fact about the mamasan, not a report on you (the Doghouse floor, 2026-10-08)"],
  "npc.sunee.dialogue.text|everybody knows": [G_, "the midnight lights going up one level: a fact about the room's closing, not about you (the Doghouse floor, 2026-10-08)"],
  "npc.nigel.dialogue.text|the girls knew": [G_, "ninety-eight, a Swedish bar: Nigel's own past, not a report on you (the laundering quests, 2026-10-08)"],
  "patron.nigel.dialogue.text|the girls knew": [G_, "the same record under the patron harvest"],
  "engine-play.js:_REL_GREET|the whole bar clocks": [W_, "her colleagues answer about her as yours, and about a recent ride (_doTalkCore, the witness rule; round63.test)"],
  "engine-play.js:_REL_GREET|spoken for": [W_, "the same: 'Your girl. Everybody know, tilac.'"],
  "engine-core.js:_quizTalk|the whole bar watched": [W_, "this IS the witness's answer (G.quizLast)"],
  "engine-core.js:_quizTalk|everybody see": [W_, "this IS the witness's answer (G.quizLast)"],
  "engine-parser.js:_leagueTalk|everybody see": [W_, "this IS the witness's answer (G.lastKp); 'who won' routes here too"],
  "engine-parser.js:_doTalkCore|everybody see": [W_, "the witness rule's own answer: her colleagues on her ride"],
  "engine-parser.js:_doTalkCore|everybody here knows": [W_, "the witness rule's own answer: the house on her"],
  "engine-systems.js:_shiftYes|the floor saw": [C_, "the round that did not land still pays +1 — the reason beside the figure; G.bar.roundLanded (round 76)"],
  "engine-parser.js:_doTalkCore|the floor watched": [W_, "her colleagues on the night out with her (G.partyLog) — the floor that watched her leave is the mouth; round76.test"],
  "engine-parser.js:_doTalkCore|in front of the whole": [W_, "the colleague review on a woman you complained about (G.bfStrikes) — the floor that watched the refund is the mouth; round75.test"],
  "engine-parser.js:_doTalkCore|spoken for": [W_, "the witness rule's comment quoting _REL_GREET"],
  // ── consequence: a mechanic keeps it ───────────────────────────────────────────────
  "engine-parser.js:_ANSWER_GOSSIP|the soi talks": [C_, "the grapevine catch in _convoAnswer (G.player.said)"],
  "engine-parser.js:_TAN_TOWN|the soi knew": [C_, "the owner rows: the town knows who owns the bar"],
  "engine-parser.js:_TAN_TOWN|the whole soi knows": [C_, "the owner rows"],
  "engine-parser.js:_TOWN|everybody on the rail knows": [C_, "the owner rows (_TOWN.owner)"],
  "engine-parser.js:_TOWN|word gets round": [C_, "the owner rows"],
  "engine-parser.js:_beachOpening|the soi remembers": [C_, "HINT unlocks after a failed attempt (G.act1Tries)"],
  "engine-parser.js:_helpFirstPage|the soi knows": [C_, "HINT gating"],
  "engine-parser.js:_doRep|the soi remembers": [C_, "G.rep: one bad scene costs the standing (_repHit)"],
  "engine-parser.js:_doRefuseDrink|the town remembers": [C_, "G.player.teetotal declines every comp"],
  "engine-play.js:_MAI_DEE_SCENE|in front of everybody": [C_, "G.maiDee and G.maiDeeBar: her verdict and her floor's"],
  "engine-play.js:_kickOut|in front of the whole": [C_, "the ban, heat and the maiDee scene"],
  "engine-play.js:_addHeat|the mamasan is watching": [C_, "G.soc.heat → _kickOut at 3"],
  "engine-play.js:_doApologize|the bar is watching": [C_, "heat"],
  "engine-systems.js:_SIGHT_OVER|in front of the whole": [C_, "the sighting's GO OVER: rep −1, bond to a face, G.phone.cut"],
  "engine-systems.js:_sightOver|the soi saw": [C_, "G.phone.cut"],
  "engine-systems.js:_bfRefusalSay|everybody saw": [C_, "G.soc.bfBar: no colleague goes with you tonight"],
  "engine-systems.js:_bfRefusalSay|everybody see": [C_, "G.soc.bfBar"],
  "engine-systems.js:_affairYes|the bar knows": [C_, "floorSour and the colleague review's 'your girl'"],
  "engine-systems.js:_affairNight|the floor knows": [C_, "the affair's floor meters"],
  "engine-systems.js:_affairWarn|the room heard": [C_, "floorSour stops the other girls' floor moments"],
  "engine-systems.js:_affairHome|everybody see": [C_, "the affair's own dialogue of being seen"],
  "engine-play.js:_affairTalk|everybody see": [C_, "the affair crises answer it"],
  "engine-play.js:_ownBarTalk|everybody see": [C_, "the affair's door"],
  "engine-systems.js:_AFFAIR_FLOOR|the mamasan watches": [C_, "the affair's floor beats"],
  "engine-systems.js:_RENT_LATE|everybody knows": [C_, "rentShort; Bert and the books answer rent"],
  "engine-systems.js:_ccibSet|everybody remembers": [C_, "G.ccibRadar.described"],
  "engine-systems.js:_ccibVisit|everybody remembers": [C_, "G.ccibRadar.described"],
  "engine-systems.js:_shiftAsk|the whole rail still talks": [C_, "G.bar.tabPaidNight"],
  "engine-systems.js:_DOG_FAVOR_SCENES|everybody see": [C_, "the dog favour bond; everyone answers DOG (_dogTalk)"],
  "engine-parser.js:_doMotosai|word got round": [C_, "Bank's mates' rate at every stand"],
  "engine-parser.js:_SNIPE_LINES|the room clocked": [C_, "patronMiffed and heat"],
  "engine-parser.js:_SNIPE_LINES|everybody noticed": [C_, "patronMiffed and heat"],
  "npc.bert.dialogue.text|word gets around": [C_, "Bert's iced greeting and _BERT_LOYAL"],
  "npc.bert.dialogue.text|the girls will remember": [C_, "the bell's favour on the room (_bellLevel)"],
  "npc.nok.dialogue.text|everybody see": [C_, "the wallet trail: everybody you ask points somewhere"],
  // ── general: idiom, or a fact about the world rather than about you ───────────────
  "enc.pingpong.hint|everyone knows": [G_], "engine-parser.js:_TOWN|everybody saw": [C_, "the affair's catch and break, said on your own rail (Ossie, round 70)"], "engine-systems.js:_tanAbout|everybody on the soi knows": [W_, "the affair — her colleagues answer it in the review, Tan here (Ossie, round 70)"], "engine-systems.js:_affairOut|everybody see": [C_, "the night out: floorSour"], "engine-systems.js:_affairOut|the whole floor watches": [C_, "the night out: floorSour"], "engine-systems.js:_affairNight|everybody knows": [C_, "the night out's morning: floorSour"], "npc.duan.dialogue.text|everybody see": [G_, "the naga fireballs — a fact about the river"], "engine-systems.js:_affairNight|the room watched": [C_, "the floor mending: floorSour"], "engine-parser.js:_doTalkCore|everybody knows": [W_, "the affair — her colleagues, Bert included, in the review (Callum, round 71)"], "npc.danny.dialogue.text|everybody knows": [G_, "the joke"], "patron.danny.dialogue.text|everybody knows": [G_, "the joke"], "enc.punterwife.intro|everybody knows": [G_],
  "engine-encounters.js:_SALENG_VIGNETTES|everyone knows": [G_], "engine-encounters.js:_salengBuy|the whole bar saw": [G_, "a moment, not a story"],
  "engine-parser.js:_BUS_SMALL_HOURS|everyone knows": [G_], "engine-parser.js:_FOLK_DJ|the room notices": [G_],
  "engine-parser.js:_FOLK_GENERIC|spoken for": [G_, "her night is, not you"], "engine-parser.js:_LOOP_RIDE|everybody watching": [G_],
  "engine-parser.js:_ORCHID_BOUNCER|everybody knows": [G_], "engine-parser.js:_SCENERY|the town sees": [G_],
  "engine-parser.js:_doBuy|the floor notices": [G_, "a moment"], "engine-parser.js:_doExamine|the floor knows": [G_],
  "engine-parser.js:_doGive|everybody here knew": [G_], "engine-parser.js:_doGive|the whole rail can see": [G_, "a moment"],
  "engine-parser.js:_politePhrase|the soi has heard": [G_], "engine-parser.js:doCommand|the mamasan hears": [G_],
  "engine-play.js:_BELL_SOI6|the street hears": [G_, "a moment"], "engine-play.js:_LOCKIN_GAMES|everybody knows": [G_],
  "engine-play.js:_SOCIAL_TEXT|the bar heard": [G_, "a moment"], "engine-play.js:_SOCIAL_TEXT|the bar notices": [G_, "a moment"],
  "engine-play.js:_c4Input|the whole bar over to see": [G_, "a moment"], "engine-play.js:_poolInput|the bar notices": [G_, "a moment"],
  "engine-play.js:_goExpat|everybody here notices": [G_],
  "engine-systems.js:_OWL_LETTERS|the girls noticed": [G_], "engine-systems.js:_SUNSET_GOLD|the rail watches": [G_],
  "engine-systems.js:_doBarfine|the mamasan watching": [G_], "engine-systems.js:_doSellBar|everybody knows": [G_],
  "engine-systems.js:_tanAbout|everybody knows": [G_],
  "intro.personality.whiteknight.tan|the girls see": [G_],
  "npc.baitoey.dialogue.text|in front of the whole": [G_], "npc.bee.desc|everybody knows": [G_],
  "npc.bert.dialogue.text|everybody knows": [G_], "npc.gyp.dialogue.text|everybody see": [G_],
  "npc.helmut.dialogue.text|everyone knows": [G_], "npc.jenny.dialogue.short|spoken for": [G_, "her, to a sponsor"],
  "npc.jenny.dialogue.text|spoken for": [G_, "her, to a sponsor"], "npc.mot.desc|word got around": [G_],
  "npc.neil.dialogue.text|everybody knows": [G_], "npc.pae.dialogue.text|everybody knows": [G_],
  "npc.tabtim.desc|the bar knows": [G_], "room.ladybird_bar.reads.telly|the bar knows": [G_, "the soap opera's plot, not you (Soi 6 expansion, 2026-10-09)"], "npc.wayne.dialogue.text|everyone knows": [G_],
  "patron.helmut.dialogue.text|everyone knows": [G_], "patron.neil.dialogue.text|everybody knows": [G_],
  "room.beach_rd_soi9.revisit|everybody knows": [G_], "room.container_8.reads.jar|everyone knows": [G_],
  "room.kiss.desc|everyone knows": [G_], "room.neon_paradise.desc|the room notices": [G_],
  "room.orchid_room.reads.table|everyone in the room knows": [G_], "room.orchid_room.revisit|everyone watches": [G_],
  "room.pattaya_soi_7.reads.alley|the soi knows": [G_],
  "engine-systems.js:_GOGO_SHOW|the room is watching": [G_, "the stage, not you"], "engine-systems.js:_GOGO_SHOW|everybody knows": [G_, "the house schedule"],
};
// A claim shared by a whole tier of stored records is classed once by pattern, not per woman: every
// go-go dancer's desc says her badge is "the number the floor knows her by" — a fact about the trade.
const CLASS_RX = [
  [/^npc\.[a-z0-9_]+\.desc\|the floor knows$/, [G_, "the badge sentence on a go-go dancer's stored desc"]],
];

export function witnessClaims() {
  const raw = execFileSync("node", [REPO + "tools/prose-corpus.mjs", "--json"], { encoding: "utf8", maxBuffer: 1 << 28 });
  const out = [];
  for (const line of raw.split("\n")) {
    if (!line.startsWith("{")) continue;
    const r = JSON.parse(line), m = RX.exec(String(r.text || ""));
    if (!m) continue;
    const key = r.ref.replace(/\[\d+\]/g, "") + "|" + m[0].toLowerCase();
    out.push({ key, ref: r.ref, phrase: m[0], cls: CLASS[key] || (CLASS_RX.find(([rx]) => rx.test(key)) || [])[1] || null, text: r.text });
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const all = witnessClaims(), un = all.filter(c => !c.cls);
  if (process.argv.includes("--all")) for (const c of all) console.log(`${(c.cls ? c.cls[0] : "UNCLASSED").padEnd(11)} ${c.key}${c.cls && c.cls[1] ? "  — " + c.cls[1] : ""}`);
  const by = {}; for (const c of all) { const k = c.cls ? c.cls[0] : "unclassed"; by[k] = (by[k] || 0) + 1; }
  console.log(`witness audit: ${all.length} claims — ` + Object.entries(by).map(([k, v]) => k + " " + v).join(" · "));
  for (const c of un) {
    const i = c.text.search(RX);
    console.log(`  UNCLASSED ${c.key}\n    …${c.text.slice(Math.max(0, i - 100), i + 80).replace(/\n/g, " ")}…`);
  }
  if (un.length) {
    console.log("\nClass each in CLASS: general (idiom / a fact about the world), consequence (about you, kept by a mechanic — name it), or witness (about you — wire somebody to answer it, and test it).");
    process.exit(1);
  }
}
