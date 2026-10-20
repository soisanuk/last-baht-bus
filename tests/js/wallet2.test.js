// THE SECOND WALLET (Mario, 2026-10-21): the opening's chain as an expat blackout event. A rough blackout wake in the
// expat stage rolls the wallet gone — half the first time, certain by the third, once a life — the clue flags clear and
// the same people answer the same questions; the stake is NO CARD (the machine refuses; Nira, Nont's CASH, the bank's
// replacement a week on) and never the bed: act1Done stays set, nothing resets, no race. Oy's safe is the climax again.
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
const t = c => { out = []; run(c); return said(); };
const resident = () => {
  newGame(); G.player = { origin: "pension", personality: "straight", orientation: "straight", said: {}, lang: "en" };
  _setFlag("act1Done"); _setFlag("hasWallet"); _setFlag("expatLife"); G.itemLoc.wallet = "inventory"; for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2;
  G.stage = "expat"; G.paper = "longstay"; G.thaiAccount = true; G.hotel = "sabai"; G.day = 19; G.money = 1500; G.bank = 30000; G.payDay = 19; G.month = { spent: 0, rent: 0, rough: 0, days: 0 };
  G.room = "beach_rd_c"; G.nightTurn = 40; out = [];
};
const blackout = (roll) => { const s = _rand; _rand = () => roll; try { out = []; _endNight("blackout"); } finally { _rand = s; } G.nightTurn = 30; };

beforeEach(() => { newGame(); });

test("a rough blackout wake rolls the wallet by the count of blackouts — half, three quarters, certain — once a life, never on a holiday or the Soi 6 week", () => {
  resident(); blackout(0.6); assert.ok(_flag("hasWallet"), "0.6 on the first blackout: the wallet stays"); assert.equal(G.blackouts, 1);
  G.money = 1500; G.room = "beach_rd_c"; blackout(0.6); assert.ok(!_flag("hasWallet") && _flag("walletLost"), "0.6 on the second: gone"); assert.equal(G.blackouts, 2);
  assert.match(said(), /The wallet is gone — the cards, the key card, the lot/); assert.match(said(), /the desk knows your face/);
  assert.ok(_flag("act1Done"), "act1Done is never un-set"); assert.equal(G.quests.wallet_again, "active"); assert.equal(G.itemLoc.wallet, null); assert.equal(G.itemLoc.receipt, "inventory");
  assert.equal(G.walletHeld, 800, "about half of what the night took is in the wallet");
  for (const f of ["knowWasHere", "knowMot", "knowOyHasIt", "knowDoorTrick", "pinPart71", "pinPart9", "oyGaveWallet", "waiedOy", "officeOpen"]) assert.ok(!_flag(f), f);
  // certain by the third
  resident(); blackout(0.99); blackout(0.99); assert.ok(_flag("hasWallet")); blackout(0.99); assert.ok(_flag("walletLost"), "the third is certain");
  // once a life: back in hand, the next blackout never takes it again
  _setFlag("hasWallet"); G.itemLoc.wallet = "inventory"; blackout(0.01); assert.ok(_flag("hasWallet"), "once a life");
  // a holiday has no second wallet, nor the Soi 6 week
  resident(); G.stage = "vacation"; blackout(0.01); assert.ok(_flag("hasWallet"));
  resident(); G.mode = "soi6"; blackout(0.01); assert.ok(_flag("hasWallet"));
});

test("the stake is the card: the machine refuses and names the lifelines, the desk takes a transfer, HINT is the opening's whisper, HELP is the opening's page", () => {
  resident(); blackout(0.1); assert.ok(_flag("walletLost"));
  assert.match(t("withdraw 1000"), /machine does not know your face.*7 days off.*Nira lends.*CASH <amount>/); assert.equal(G.money, 0);
  assert.match(t("hint"), /The soi whispers: Start with the hours you have no film of/); assert.doesNotMatch(said(), /second time/, "the Soi 6 man never had a first"); assert.match(t("help"), /get the wallet back/);
  assert.match(t("quests"), /The Lost Wallet/); assert.doesNotMatch(said(), /Act One, scored/, "no score line for a man who never played the opening");
  G.room = _hotelRoomId(); out = []; run("sleep"); run("sleep"); assert.match(said(), /takes a transfer from the app instead — the card went with the wallet/);
});

test("the chain plays again through the same people: the receipt, Candy, Lek, the wai at Oy's — and the wallet's return closes the job, pays, and wakes the machine", () => {
  resident(); blackout(0.1); const h0 = G.happy; assert.equal(G.day % 2, 0, "Candy is at Candy Bar on an even day");
  run("read receipt"); assert.ok(_flag("knowWasHere"));
  G.room = "candy_bar"; t("talk to candy"); t("ask candy about wallet"); assert.ok(_flag("knowMot"), "Candy's Mot node re-reads in full (it sets a flag)");
  G.room = "lucky_tiger"; t("ask lek about wallet"); assert.ok(_flag("knowOyHasIt"));
  assert.match(t("ask lek about office"), /Locks itself when the music is on/, "the Act One hint is live again");
  G.room = "rainbow_girls"; run("wai oy"); out = []; run("ask oy about wallet");
  assert.ok(_flag("hasWallet") && _flag("walletBack"), "Oy gives it back by the polite door"); assert.equal(G.itemLoc.wallet, "inventory");
  assert.match(said(), /The machine on the street is a machine again/); assert.doesNotMatch(said(), /second time/); assert.equal(G.money, 800, "about half of what the night took");
  run("look"); assert.equal(G.quests.wallet_again, "done"); assert.ok(G.happy >= h0 + 4, "the job pays");
  assert.ok(!_walletHunt());
  G.room = "beach_rd_c"; assert.doesNotMatch(t("withdraw 1000"), /does not know your face/); assert.equal(G.money, 1800);
  assert.doesNotMatch(said(), /ACT ONE COMPLETE/, "the opening's score screen never fires again");
  // the post-wallet nodes are back
  G.room = "lucky_tiger"; assert.match(t("ask lek about office"), /only a door again/);
});

test("the hard door is open again: Oy's office takes the song, and the safe hands back what the night took", () => {
  resident(); blackout(0.1); G.room = "rainbow_girls";
  assert.doesNotMatch(t("go in"), /Office is office now|had your song/, "security is not holding the door while the wallet is in the safe");
  _setFlag("sabaiPlaying"); run("go in"); assert.equal(G.room, "oy_office");
  out = []; _doSafe(SAFE_PIN); assert.ok(_flag("hasWallet")); assert.match(said(), /Some of the cash is still in it — ฿800 back in play/); assert.equal(G.money, 800); assert.doesNotMatch(said(), /from the poster/);
  run("look"); assert.ok(_flag("walletBack")); assert.equal(G.quests.wallet_again, "done");
});

test("the bank's side: a replacement card a week on wakes the machine without the wallet; Tar and Tan answer the lost card", () => {
  resident(); blackout(0.1); const d0 = G.day;
  G.room = "doghouse"; assert.match(t("ask tar about card"), /a week, if the branch on Beach Road/);
  G.room = _npcRoom("tan"); G.nightTurn = 30; assert.match(t("ask tan about wallet"), /Your first one/, "the Soi 6 man's first wallet"); assert.doesNotMatch(said(), /at the wheel|on the wheel/);
  _setFlag("act1Scored"); G.talked.tan = []; assert.match(t("ask tan about cash"), /Twice\./, "the beach man's second"); delete G.flags.act1Scored;
  for (let i = 0; i < WALLET_CARD_DAYS; i++) { G.room = _hotelRoomId(); G.nightTurn = 30; out = []; run("sleep"); run("sleep"); }
  assert.equal(G.day, d0 + WALLET_CARD_DAYS); assert.ok(_flag("walletCard"), "the card arrived"); assert.match(said(), /replacement card is at the Beach Road branch/);
  assert.ok(!_flag("hasWallet"), "the wallet is still wherever it went");
  G.room = "beach_rd_c"; G.nightTurn = 30; assert.doesNotMatch(t("withdraw 1000"), /does not know your face/); assert.ok(G.money >= 1000);
});

test("the Soi 6 opening is where Tan dropped you, not a rule you set yourself; and the event rolls one die and nothing else", () => {
  newGame(); startSoi6Mode(); run("1"); run("3"); run("1"); assert.match(said(), /Tan's car stops at the top of SOI 6/); assert.doesNotMatch(said(), /planted your flag/);
  resident(); G.roughLost = 300; const rng = G.rng; _walletLost(); assert.equal(G.rng, rng, "no dice inside the event itself"); assert.equal(G.walletHeld, 200);
});
