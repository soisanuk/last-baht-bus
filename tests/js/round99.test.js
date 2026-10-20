// ROUND 99 (2026-10-21) — the second wallet's first personas, on the Soi 6 man who cancelled the ticket: Owain (Fable,
// first-time-through-the-chain-as-a-resident — "the story they tell me is somebody else's") and Frank (Opus, no-card-ledger —
// "fix Nont's cash for a man with no card, because the game told me twice he would do it"). The money reconciled to the
// baht ten nights running; the defects were the night the town remembered, the lifeline that refused, and the month line.
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
  G.stage = "expat"; G.paper = "longstay"; G.thaiAccount = true; G.hotel = "queenvic"; G.day = 19; G.money = 1500; G.bank = 30000; G.payDay = 19; G.month = { spent: 0, rent: 0, rough: 0, days: 0 };
  G.room = "firecracker_bar"; G.nightTurn = 16; out = [];
};
const blackout = (roll) => { const s = _rand; _rand = () => roll; try { out = []; _endNight("blackout"); } finally { _rand = s; } G.nightTurn = 30; };

beforeEach(() => { newGame(); });

test("SEVERE: the town remembers HIS night — the wake names where the film stopped, the receipt is the hours he has no film of, Candy and Lek tell the lost hours as lost", () => {
  resident(); blackout(0.1); assert.ok(_flag("walletLost"));
  assert.match(said(), /The last thing the film has is Firecracker Bar at 19:36/); assert.match(said(), /a receipt in your pocket you do not remember paying for/);
  assert.doesNotMatch(said(), /second wallet|first time/, "the Soi 6 man had no first wallet");
  assert.match(t("read receipt"), /hours you have no film of/);
  G.room = "candy_bar"; assert.match(t("ask candy about wallet"), /No film, farang/); assert.ok(_flag("knowMot"));
  G.room = "lucky_tiger"; assert.match(t("ask lek about wallet"), /the morning after you lose it/); assert.doesNotMatch(said(), /this morning/); assert.ok(_flag("knowOyHasIt"));
});

test("SEVERE: Nont's CASH works with no card — the lifeline the wake and the machine both name", () => {
  resident(); blackout(0.1); G.room = _npcRoom("nont"); G.nightTurn = 30; G.bank = 30000; run("talk to nont");
  assert.match(t("ask nont about wallet"), /I move money, not wallets/);
  out = []; run("cash 2000"); assert.doesNotMatch(said(), /Cash from what account/); assert.ok(G.money >= 1900 || (G.nontStuck || 0) >= 1900, "notes in hand, or his one-in-six moment: " + G.money + " / " + said().slice(0, 160));
  assert.match(t("check balance"), /The app knows the balance without the card/);
});

test("SEVERE: the month's book — a theft is not spending, and the night the wallet came back still had its bill", () => {
  resident(); G.month = { spent: 0, rent: 0, rough: 0, days: 0 }; blackout(0.1);
  assert.ok(G.month.spent < 1000, "the ฿1,500 the night took is not a month's spending: " + JSON.stringify(G.month));
  const m0 = G.month.spent; G.room = "rainbow_girls"; _setFlag("knowOyHasIt"); run("wai oy"); run("ask oy about wallet"); assert.ok(_flag("hasWallet"));
  G.room = _hotelRoomId(); out = []; run("sleep"); run("sleep");
  assert.ok(G.month.spent >= m0 + _hotelRate("queenvic"), "the recovery night's room is on the book: " + JSON.stringify(G.month));
});

test("the lost card is the town's business: Tan, Doyle and the house answer it; the floor's pointer is dealt from a book and a repeat points again; the town hears it came back", () => {
  resident(); blackout(0.1);
  G.room = "sunset_rail"; const girls = _npcsHere().filter(i => NPC_ROLES[i] === "hostess" && !NPCS[i].filler);
  const lines = girls.map(id => t("ask " + id + " about wallet")); assert.ok(new Set(lines).size === lines.length, "three women, three sentences: " + lines.length);
  assert.match(t("ask " + girls[0] + " about wallet"), /I tell you already|Same answer|Second Road, then over/);
  G.room = "soi6_street"; run("talk to tan"); assert.match(t("ask tan about the atm"), /No card|dead to you|the machine is a wall|without the card/i);
  G.room = NPCS.doyle.room; if (_npcsHere().includes("doyle")) assert.match(t("ask doyle about wallet"), /Twenty-six years I read rooms/);
  _setFlag("hasWallet"); G.itemLoc.wallet = "inventory"; run("look"); assert.ok(_flag("walletBack"));
  G.room = "sunset_rail"; assert.match(t("ask " + girls[0] + " about wallet"), /got it back|come home|The wallet!|Back\./i);
  assert.match(t("tell " + girls[1] + " i got my wallet back"), /got it back|come home|The wallet!|Back\./i);
});

test("the office inside Oy's bar is Oy's door; TRAVEL CANDY BAR is Candy Bar; READ NOTE reads the wallet's note; a bare SORRY is the influencer's own option", () => {
  resident(); G.room = "rainbow_girls"; assert.doesNotMatch(t("ask toey about office"), /Thappraya|Office Bar/);
  assert.equal(_roomByName("candy bar"), "candy_bar"); assert.equal(_roomByName("candy bar 2"), "candy_bar_2");
  assert.match(t("read note"), /Mot's dinner/);
  assert.equal(_read("sorry").kind !== "huh", true); assert.equal(_read("sorry?").kind, "huh");
  G.room = ENCOUNTERS.influencer.rooms[0]; G.encDone.influencer = false; _startEnc("influencer"); out = []; run("sorry"); assert.equal(G.pendingEnc, null, "SORRY answered the influencer");
});

test("HOW DO I GET TO a street, a district or a bar you know is the way in steps, the first direction and the ride", () => {
  resident(); G.room = "soi6_street"; G.nightTurn = 30;
  assert.match(t("how do i get to soi buakhao"), /\(Soi Buakhao\): \d+ steps away|Soi Buakhao.*steps away/); assert.match(said(), /MOTOSAI TO|Walkable/);
  assert.match(t("which way to candy bar"), /Candy Bar.*steps away/); assert.match(t("where is the queen vic"), /Queen Vic Inn: \d+ steps? away/);
  newGame(); startSoi6Mode(); run("1"); run("3"); run("1"); G.nightTurn = 30; assert.match(t("how do i get to soi buakhao"), /Not this week/);
});

test("Nira's late night is twenty percent to the nearest hundred; an empty pocket has nothing to turn out", () => {
  assert.equal(_loanRound(1200 * 1.2), 1400); assert.equal(_loanTerms(1000), 1200);
  resident(); G.money = 0; G.flags.walletEver = true; blackout(0.1); assert.match(said(), /nothing in them to take/); assert.doesNotMatch(said(), /฿0 gone/);
});
