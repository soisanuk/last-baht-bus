// THE PAPER BY THE TILL (2026-10-08, the laundering material): EXAMINE LICENCE in every bar — derived from the
// data, logged, noticed by the house, read harder by the retired detective — and the hidden job it hides
// (one name on four unrelated walls), the work-permit grid in three mouths, the month-after follow-ups.
import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters", "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(readFileSync(fileURLToPath(new URL(`../../web/js/${f}.js`, import.meta.url)), "utf8"), { filename: f + ".js" });
let out = [];
engineInit((text) => out.push(String(text)));
const said = () => out.join("\n");
const run = c => doCommand(c);
const ask = (id, t) => { G.convoQ = null; out = []; run(`ask ${id} about ${t}`); return said(); };
const look = room => { G.room = room; G.nightTurn = 50; out = []; run("examine licence"); return said(); };
beforeEach(() => {
  newGame();
  G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 2; G.money = 7000; G.bank = 5000; G.nightTurn = 50; G.season0 = 2; out = [];
});
const owner = () => { G.stage = "expat"; G.flags.barOpen = true; G.flags.barPaid = true; G.flags.barPartner = true; G.flags.partnerTan = true; G.bar.room = "stinky_bar"; G.bar.owner = true; };

test("the sign is never the operator: a small bar is a registration in the woman's name, a go-go a company at one permit, the groups two, your own bar 51/49 to the share", () => {
  const lt = _licenceOf("lucky_tiger"); assert.equal(lt.kind, "registration"); assert.equal(lt.name, NPCS.ratana.name, "the mamasan owns it");
  assert.match(look("lucky_tiger"), /commercial registration/); assert.match(said(), /in the name of Ratana/);
  const gg = _licenceOf("tequila_queen"); assert.equal(gg.kind, "company"); assert.equal(gg.capital, 2000000); assert.match(look("tequila_queen"), /฿2,000,000/);
  assert.match(_licenceOf("pink_lotus").name, /Pattaya Leisure/); assert.match(_licenceOf("doghouse").name, /Samson/); assert.match(_licenceOf("arrow_bar").name, /Samson/);
  assert.match(_licenceOf("queen_vic").name, /Mind The Step/); assert.match(_licenceOf("cloze").name, /Soi Sanuk/); assert.match(_licenceOf("succubus").line, /married man's permit/);
  assert.match(_licenceOf("sandy_toes").name, /Last Baht/);
  for (const r of BENJAWAN_BARS) assert.equal(_licenceOf(r).name, "Benjawan Srisuk", r);
  owner(); G.room = "stinky_bar"; run("look"); while (G.pendingChoice) run("no"); assert.match(look("stinky_bar"), /Thanakorn Srisawat — Tan.*51\.00.*49\.00/); G.flags.partnerTan = false; G.flags.partnerCandy = true; assert.match(look("stinky_bar"), /Kanokwan Pholsiri — Candy/);
  assert.equal(_licenceOf("beach_rd_c"), null); G.room = "klang_massage"; out = []; run("examine licence"); assert.match(said(), /massage-establishment licence/);
});
test("the house notices, by what it thinks of you — once a bar a night", () => {
  look("lucky_tiger"); assert.match(said(), /You police\? Spy\?|Were you looking for somebody|You want to buy\? Everybody want to buy/, "a stranger is suspected");
  out = []; run("examine licence"); assert.doesNotMatch(said(), /You police|looking for somebody|Everybody want to buy/, "once a night");
  G.soc.licLook = {}; G.room = "tequila_queen"; out = []; run("examine licence"); assert.match(said(), /You police\? Spy\?|Were you looking for somebody/, "a stranger at a go-go till");
  G.soc.licLook = {}; G.soc.drinks.ratana = 8; look("lucky_tiger"); assert.match(said(), /Regular know too much|A regular's privilege|first customer|That is my name|My name/);
  G.soc.licLook = {}; G.maiDee = { ratana: G.day }; look("lucky_tiger"); assert.match(said(), /says nothing at all/);
  G.maiDee = {}; G.soc.licLook = {}; look("pink_lotus"); assert.match(said(), /Company paper, tilac|The group's paper/);
  owner(); G.room = "stinky_bar"; run("look"); while (G.pendingChoice) run("no"); G.soc.licLook = {}; look("stinky_bar"); assert.match(said(), /Reading your own paper, boss|Boss read the paper/);
});
test("the retired detective reads the stamp, the date, the number and what they connect to", () => {
  G.player.origin = "pi";
  assert.match(look("tequila_queen"), /permit's number, not the business's/);
  assert.match(look("pink_lotus"), /TOLERATED/); assert.match(look("doghouse"), /Seven rooms on one company/);
  assert.match(look("queen_vic"), /director of the pub he drinks in/);
  assert.match(look("the_bucket"), /Second Road; the date is 2019/);
  assert.match(look("gold_rush"), /same Second Road lawyer's as at The Bucket/); assert.ok(_flag("benjawanSeen"));
  assert.match(look("water_buffalo"), /three makes it a pattern/);
  G.player.origin = "monger"; G.licencesRead = {}; G.flags.benjawanSeen = false; assert.doesNotMatch(look("the_bucket"), /Second Road/);
});
test("THE NAME ON THE WALL: one name on four unrelated bars is a hidden job, and the woman who signs knows whose", () => {
  look("the_bucket"); assert.ok(!_flag("benjawanSeen")); assert.ok(!G.quests.nameonwall);
  look("two_stools"); assert.ok(_flag("benjawanSeen")); assert.match(said(), /same name as on the wall at The Bucket/); assert.doesNotMatch(said(), /ASK ORATHAI/, "she is not met yet");
  G.room = "buakhao_market"; run("talk to orathai"); assert.equal(G.quests.nameonwall, "offered"); run("accept nameonwall");
  assert.match(ask("orathai", "benjawan"), /Find her on two more|two more walls/);
  look("gold_rush"); assert.match(said(), /ASK ORATHAI ABOUT BENJAWAN|same Benjawan/);
  G.room = "buakhao_market"; assert.match(ask("orathai", "benjawan"), /Chiang Mai/); assert.ok(_flag("benjawanFound")); assert.equal(G.quests.nameonwall, "done");
  assert.match(ask("orathai", "struck off"), /somebody forgot|somebody decided/);
});
test("the work-permit grid in three mouths, the Owl's three pieces, and the bar opposite's registration", () => {
  G.room = "stinky_bar"; run("talk to bert"); assert.match(ask("bert", "two million"), /permit, not the bar/);
  G.room = _npcRoom("wayne"); run("talk to wayne"); assert.match(ask("wayne", "work permit"), /none of them is three|One million if you married/);
  G.room = _npcRoom("tan"); run("talk to tan"); assert.match(ask("tan", "work permit"), /has to be there on the day somebody looks/);
  assert.ok(_OWL_LEADS.some(l => /TWO MILLION BAHT/.test(l))); assert.ok(_OWL_LETTERS.some(l => /struck off the register/.test(l[0]))); assert.ok(_OWL_LISTINGS.some(l => /sells nothing to nobody/.test(l)));
  assert.ok(_OPP_LINES[3].some(l => /Commercial registration/.test(l)));
});
test("a month after Fifty-One the company closes, and a month after The Covers the police read the paper", () => {
  G.flags.fiftyoneDone = true; G.flags.fiftyoneTold = true; G.questDoneDay = { fiftyone: G.day - 31 };
  G.room = "buakhao_market"; run("talk to orathai"); assert.match(ask("orathai", "reginald"), /closed last week.*second paper/s);
  G.room = _npcRoom("reginald"); G.nightTurn = 50; run("talk to reginald"); assert.match(ask("reginald", "the fifty-one"), /landlord of furniture/);
  G.flags.coversDone = true; G.flags.coversFaked = true; G.questDoneDay.covers = G.day - 31;
  G.room = "silk_rose"; run("talk to grace"); assert.match(ask("grace", "the police"), /took Hong to the station/);
  G.room = "jasmine_garden"; assert.match(ask("hong", "the police"), /Two hours at the station/);
});
