// THE ADVERSARIAL CODE REVIEW (2026-11-01): ten reviewers by section, docs/architecture.md as the map, every finding
// proven with a probe (docs/code-review-2026-11-01.md). One class came out of five sections: a GATE read its options as a
// prefix, so a refusal ("ok, no thanks"), a hedge ("let me think") or a question that opens with an option's word
// ("sell? what happens to the girls?") committed it. _gateGuard (engine-parser) and the GATES `no`/`ask` fields now read
// those first, and the modal pre-pass holds a hedge or an option-word question under every other prompt.
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
const t = c => { out = []; doCommand(c); return said(); };
const quiet = () => { for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2; G.flowerDay = G.day; G.rain = 0; G.lastSaleng = 1e9; G.salengCart = null; };
const sandbox = (stage = "vacation") => {
  newGame(); G.player = { origin: "monger", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  if (stage !== "act1") { _setFlag("act1Done"); _setFlag("hasWallet"); }
  G.stage = stage; quiet(); G.money = 5000; G.bank = 20000;
};
const dice = (v, fn) => { const s = _rand; try { _rand = () => v; return fn(); } finally { _rand = s; } };
const owner = () => {
  sandbox("expat"); G.bank = 20000;
  for (const f of ["expatLife", "barOpen", "barPaid", "barPartner", "partnerTan", "tanAsked", "tanFavourDone"]) _setFlag(f);
  G.tanFavourDay = G.day; G.room = "stinky_bar"; G.nightTurn = 30;
  G.bar = Object.assign(G.bar || {}, { room: "stinky_bar", cash: 20000, owed: 100000, worked: 5, declared: 5, stoodTurns: 30 });
};
const destitute = () => { sandbox("expat"); G.money = 0; G.bank = 0; _goExpat(); out = []; };
beforeEach(() => { newGame(); });

test("S3-1/S1-1: SELL UP's confirm is not sold by a question or a refusal", () => {
  for (const said of ["sell? what happens to the girls?", "yes?", "do it later"]) {
    owner(); G.soc.drinks.manow = 15; G.affair = { id: "manow", since: G.day - 70, strain: 2, floorSour: 0, crisSeen: [], crisChose: {}, warned: {} };
    _setFlag("affairOffered"); _doSellBar(); out = []; doCommand(said);
    assert.ok(!_flag("barSold"), `"${said}" sold the bar`); assert.notEqual(G.pendingChoice, "gameend", said);
  }
});

test("S3-2/S1-1: the 51% for Candy is not signed by naming Tan, by a question, or by a refusal", () => {
  for (const said of ["tan first", "tan", "her?", "ok, maybe later"]) {
    sandbox("expat"); _setFlag("expatLife"); G.room = "candy_bar"; G.pendingChoice = "partner"; G.partnerWho = "candy"; out = [];
    doCommand(said); assert.ok(!_flag("partnerCandy"), `"${said}" signed Candy`); assert.equal(G.bank, 20000, said);
  }
  sandbox("expat"); _setFlag("expatLife"); G.room = "candy_bar"; G.pendingChoice = "partner"; G.partnerWho = "candy";
  doCommand("yes"); assert.ok(_flag("partnerCandy"), "YES still signs her");
});

test("S3-3: a hedge holds the shift call, Bert's phone and Eddy's interview, and costs no turn", () => {
  owner(); G.nightTurn = 40; G.bar.workedTurn = 0; _shiftAsk(); const nt = G.nightTurn;
  assert.match(t("let me think"), /\(YES/); assert.equal(G.pendingChoice, "shift"); assert.equal(G.nightTurn, nt);
  sandbox("expat"); _setFlag("expatLife"); G.room = "white_rabbit"; _rabbitInterview();
  t("i'll think about it"); assert.equal(G.pendingChoice, "rabbitjob"); assert.notEqual(G.itemLoc.black_box, "inventory");
});

test("S3-4/S6-1: Cream's GO is not a question, a refusal or GO HOME", () => {
  for (const said of ["go where?", "ok, no thanks", "go home", "sure, maybe another time"]) {
    sandbox(); G.room = "metro_beer_garden"; G.nightTurn = 50; G.known.cream = true; _chamAsk(); out = [];
    const d = G.day, m = G.money; doCommand(said);
    assert.equal(G.day, d, `"${said}" ended the night`); assert.equal(G.money, m, said);
  }
});

test("S6-2: Sao's car is not boarded on a refusal or a question", () => {
  for (const said of ["ok, no thanks", "bangkok? tonight?"]) {
    sandbox("expat"); _setFlag("expatLife"); G.bkk = { met: 1, stage: 3, coffee: 1 }; G.bkk.invite = G.day - 1; G.phone.contacts.sao = true;
    G.nightTurn = 10; G.room = "hotel_room"; _bkkArcTick(); assert.equal(G.pendingChoice, "bkkdinner", "the car is armed"); out = []; doCommand(said);
    assert.ok(!G.bkk.went, `"${said}" got in the van`); assert.notEqual(G.pendingChoice, "bkkbill", said);
  }
});

test("S6-3: Eddy's job, Nont's price and Tan's favour are declined by a refusal", () => {
  sandbox("expat"); _setFlag("expatLife"); G.room = "white_rabbit"; _rabbitInterview(); t("i'll pass");
  assert.notEqual(G.itemLoc.black_box, "inventory", "I'LL PASS took the box");
  sandbox("expat"); _setFlag("expatLife"); G.known.nont = true; _kidPriceAsk(); t("ok, no thanks"); assert.equal(G.money, 5000, "the kid's price was paid");
  sandbox("expat"); _setFlag("expatLife"); _kidFavourAsk(); t("sure, but no"); assert.ok(!_flag("tanKidFavour"), "Tan's favour was taken");
});

test("S1-1: Bert's phone, the affair, the procurement job and Tan's slip read a refusal as no", () => {
  for (const [g, said] of [["keptgirl", "fine, don't"], ["affair", "okay, not now"], ["synjob", "ok, no thanks"], ["tanfavour", "fine, no thanks"]])
    assert.equal(_gateGuard(g, said), GATES[g].no, `${g}: "${said}"`);
});

test("S3-5: CHECKOUT moves you only for a hotel's name, and 'i don't know' does not cancel", () => {
  for (const said of ["what is the queen vic like?", "how much is the areca?", "i don't know", "another hotel"]) {
    sandbox(); G.room = _hotelRoomId(); G.nightTurn = 2; _doCheckout(); out = []; doCommand(said);
    assert.equal(G.hotel, "sabai", `"${said}" moved the bag`); assert.equal(G.pendingChoice, "checkout", `"${said}" closed the desk`);
  }
  sandbox(); G.room = _hotelRoomId(); G.nightTurn = 2; _doCheckout(); t("the areca"); assert.equal(G.hotel, "areca");
});

test("S2-1/S3-7: the plane asks once and YES again takes it; a question about it holds", () => {
  for (const said of ["go home? no, i am staying", "take the plane? what does that mean"]) {
    destitute(); G.pendingChoice = "embassy"; G.destitute = 3; doCommand(said);
    assert.equal(G.pendingChoice, "embassy", `"${said}" flew him home`);
  }
  destitute(); G.pendingChoice = "embassy"; G.destitute = 3; t("yes"); assert.equal(G.pendingChoice, "embassy", "a bare YES asks once");
  t("yes"); assert.equal(G.endKind, "repatriated", "YES again takes it — the warning is not disarmed by the YES it asked for");
});

test("S2-1: a question about START OVER at the ending holds; the named choice still starts over", () => {
  for (const said of ["start over? would i lose everything", "over? no"]) {
    sandbox("expat"); G.day = 40; _gameEnd("sold"); out = []; doCommand(said);
    assert.equal(G.day, 40, `"${said}" wiped the life`); assert.equal(G.pendingChoice, "gameend");
  }
  t("start over"); assert.equal(G.pendingChoice, "intro", "START OVER, named, starts over");
});

test("S2-2: NEVER MIND and a question at CONTINUE do not cancel the ticket", () => {
  for (const said of ["never mind", "cancel? what happens to my week"]) {
    startSoi6Mode(); out = []; G.day = 8; G.pendingChoice = "soi6continue"; doCommand(said);
    assert.notEqual(G.stage, "expat", `"${said}" cancelled the ticket`);
  }
  startSoi6Mode(); G.day = 8; G.pendingChoice = "soi6continue"; t("never going home"); assert.equal(G.stage, "expat", "NEVER GOING HOME still cancels it");
});

test("S2-3: her mat is declined by 'thanks but no'", () => {
  for (const said of ["thanks but no", "thank you, no", "ok no"]) {
    destitute(); const her = Object.keys(NPCS).find(id => NPC_ROLES[id] === "hostess"); G.soc.drinks[her] = 7;
    G.pendingChoice = "keptby"; G.keptOffer = her; doCommand(said); assert.equal(G.keptBy, null, `"${said}" took the mat`);
  }
});

test("S3-6: Cream's morning does not erase her mat — the offer waits for the next roofless morning", () => {
  sandbox("expat"); _setFlag("expatLife"); G.money = 0; G.bank = 0; G.payDay = G.day; G.hotel = "sabai"; G.hotelDebt = _DEBT_CAP;
  G.soc.drinks.lek = 8; G.talked.lek = [0]; G.room = "metro_beer_garden"; G.nightTurn = 50; G.known.cream = true;
  _chamAsk(); t("go"); assert.equal(G.pendingChoice, "chamgift"); assert.ok(!G.keptByUsed, "the once-a-life mat was spent under Cream's gift");
});

test("S3-7: YES at the WAIT-into-dawn confirm runs the wait", () => {
  sandbox(); G.room = "beach_rd_c"; G.nightTurn = 112; t("wait 2 hours");
  const said = t("yes"); assert.doesNotMatch(said, /moment has passed/); assert.ok(G.nightTurn > 112 || G.day > 2, "the wait ran");
});

test("S5-1: the barfine ledger reads a refusal as no and a question as a question", () => {
  for (const said of ["no, don't take her out", "what happens if i take her out?", "take a pass", "short on cash, sorry", "fine, i'll pass", "sure, maybe later"]) {
    sandbox(); G.money = 20000; G.room = "stinky_bar"; G.nightTurn = 40; G.soc.drinks.jiap = 8; t("barfine jiap");
    const d = G.day; doCommand(said); assert.equal(G.money, 20000, `"${said}" paid`); assert.equal(G.day, d, said);
  }
  sandbox(); G.money = 20000; G.room = "stinky_bar"; G.nightTurn = 40; G.soc.drinks.jiap = 8; t("barfine jiap"); t("take her out");
  assert.ok(G.money < 20000, "TAKE HER OUT still takes her out");
});

test("a hedge or an option-word question holds every modal, not only the gates (modal-audit's new probes)", () => {
  const src = readFileSync(fileURLToPath(new URL("../../tools/modal-audit.mjs", import.meta.url)), "utf8");
  assert.match(src, /"yes\?", "let me think"/); assert.match(src, /\? what does that mean/);
  sandbox(); G.room = "stinky_bar"; G.nightTurn = 30; G.game = null;
  for (const g of ["yes?", "let me think", "maybe"]) for (const id of Object.keys(GATES).filter(k => k !== "intro")) {
    const r = _gateGuard(id, g); assert.ok(r === false || r === GATES[id].ask, `${id}: "${g}" was read as an answer`); out = [];
  }
  assert.equal(_gateGuard("cham", "maybe later"), "not tonight", "MAYBE LATER is a no, not a hedge");
});
