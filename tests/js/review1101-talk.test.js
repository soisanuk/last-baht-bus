// THE ADVERSARIAL CODE REVIEW (2026-11-01), the talk group: the conversation layer, the phone, quests and lessons.
// One class came out of four findings at once: an upper answerer in _doTalkCore with no "her own unheard node on this
// word speaks first" guard took a woman's authored topic (_textTalk, _lastTimeTalk's house branch, _jobMemoryTalk,
// _partyTalk). The guard now lives in one helper, _ownsUnheard, which every such answerer asks.
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
beforeEach(() => { newGame(); });

test("S4-1: a woman who walked you out reads MESSAGE as a closed door whether you type her name, a prefix, or words after it", () => {
  sandbox(); G.battery = 80; G.phone.contacts.lamai = {}; G.maiDee = { lamai: G.day }; G.room = "beach_rd_s";
  for (const c of ["message lamai", "message lamai miss you", "message lam"]) {
    G.phone.msgCd = {}; const b0 = (G.bond && G.bond.lamai) || 0;
    assert.match(t(c), /Read\. No reply/, c);
    assert.equal((G.bond && G.bond.lamai) || 0, b0, c + " added bond");
  }
  assert.equal(G.phone.inbox.filter(m => m.from === "lamai").length, 0, "she replied");
});

test("S4-2: a hostess away for the season neither invites you nor is met at her bar by the invite scene", () => {
  sandbox(); G.season0 = 8; G.day = 1; G.phone.contacts = { dao: {} }; G.soc.drinks.dao = 6;
  assert.equal(_awayForSeason("dao"), "bangkok", "the fixture: Dao is in Bangkok");
  G.room = "beach_rd_s"; G.phone.lastText = -999; G.turns = 100;
  const q = [0.01, 0, 0.9, 0.1]; const s = _rand; _rand = () => q.length ? q.shift() : 0.5;
  try { _maybeIncomingText(); } finally { _rand = s; }
  assert.equal(G.phone.invite, null, "an away woman set an invite");
  assert.ok(!G.phone.inbox.some(m => m.from === "dao" && /you come/.test(m.text)), "an away woman texted an invite");
  // a stale invite (or one from before she left) is not honoured by a floor she is not on
  G.nightTurn = 30; G.phone.invite = { id: "dao", day: 1 }; const h0 = G.happy;
  out = []; G.room = NPCS.dao.room; _arriveAt(NPCS.dao.room);
  assert.ok(!/Dao spots you/.test(said()), "the kept-seat scene played for a woman in Bangkok");
  assert.equal(G.happy, h0);
  G.room = "beach_rd_s"; t("message dao");
  assert.ok(!/come see me tonight|you come make sanuk/.test(G.phone.inbox.slice(-1)[0].text), "MESSAGE got a floor invite from Bangkok");
});

test("S4-3: her own unheard DREAM node is her answer, not a text that says 'dream'; and a text a month old is not quoted back", () => {
  sandbox(); const id = "somo"; G.room = NPCS[id].room; G.nightTurn = 30; G.talked[id] = [];
  G.day = 3; G.phone.contacts[id] = {}; _pushMsg(id, "i dream about you last night na 💭❤️");
  assert.equal(G.phone.inbox.slice(-1)[0].day, 3, "a text carries the day it came");
  G.phone.inbox.slice(-1)[0].read = true; G.day = 5;
  assert.match(t("ask somo about dream"), /rai/, "the rubber and the two rai");
  G.day = 40;
  assert.ok(!/i dream about you/.test(t("ask somo about dream")), "a 37-day-old text answered");
});

test("S4-4: a mamasan's gated returning-trip LAST TIME node plays on the second trip; the house count answers otherwise", () => {
  sandbox(); const id = "wanida"; G.room = _npcWhere(id) || NPCS[id].room; G.nightTurn = 20;
  G.vacation = 2; G.day = 1; G.prevBond = { wanida: 2 }; G.metDay = { wanida: -4 }; G.talked[id] = [0];
  const node = _pickDialogue(id, "last time");
  assert.ok(node && node.when, "the fixture: her gated node is open");
  assert.ok(t("ask wanida about last time").includes(node.text.slice(0, 30)), "the house line took her returning-trip node");
  G.vacation = 1; G.prevBond = {}; G.talked[id] = [0];
  assert.match(t("ask wanida about last time"), /ago/, "the first trip still gets the house count");
});

test("S4-5: after a job for Tan, 'drive me' is still his ride offer, and 'remember me' is the job memory", () => {
  sandbox(); G.nightTurn = 20; G.room = _npcWhere("tan"); G.quests.wallet_again = "done"; G.talked.tan = [];
  const s = t("ask tan about drive me");
  assert.match(s, /CALL TAN/, "the once-a-trip ride offer"); assert.ok(!/People who help/.test(s));
  assert.ok(!/People who help/.test(t("ask tan about pick me up")), "'pick me up' read as the job memory");
  assert.match(t("ask tan about remember me"), /Lost Wallet/);
});

test("S4-6: the day after you sent her home in a taxi, HOME is still her village", () => {
  sandbox(); G.day = 3; const id = "somo"; G.room = NPCS[id].room; G.nightTurn = 30; G.talked[id] = [];
  G.partyLog = { somo: { day: 2, sentHome: true, rooms: [] } };
  const s = t("ask somo about home");
  assert.match(s, /Nakhon Phanom/); assert.ok(!/taxi|send me home/i.test(s));
  assert.match(t("ask somo about sent me home"), /taxi|gentleman|change/i, "the taxi is still remembered");
});

test("S4-7: HER is never the man you are talking to, and HIM never the woman", () => {
  sandbox(); G.nightTurn = 20; G.room = "stinky_bar"; t("talk to bert");
  let s = t("ask her about family");
  assert.ok(!/Bert/.test(s.replace(/^Who do you mean\?.*$/m, "")), "asked Bert"); assert.match(s, /Who do you mean\?/);
  const m = G.money; t("buy her a drink");
  assert.equal(G.money, m, "bought Bert a drink for 'her'");
  t("talk to manow"); s = t("ask him about pool");
  assert.ok(!/You asked Manow/.test(s), "asked Manow about HIM");
  assert.match(t("ask her about family"), /You asked Manow about family/, "HER with Manow is still Manow");
});

test("S4-8: CALL rings a number in the phone — not a man at the bar, not a woman who has decided — and spends battery", () => {
  sandbox(); G.nightTurn = 20; G.room = "stinky_bar"; G.battery = 50;
  let s = t("call bert");
  assert.match(s, /don't have a number for Bert/); assert.ok(!/why you CALL|MESSAGE BERT/.test(s));
  G.phone.contacts.lamai = {}; G.maiDee = { lamai: G.day }; G.room = "beach_rd_s";
  s = t("call lamai"); assert.ok(!/why you CALL\?\?\?”/.test(s), "the verdict answered a call playfully");
  G.phone.contacts.cake = {}; const b = G.battery; s = t("call cake");
  assert.match(s, /why you CALL/); assert.equal(G.battery, b - 1, "a call costs battery");
});

test("S4-9: ACCEPT hands over a quest's item only with the giver in the room, whatever her bar count", () => {
  sandbox(); G.nightTurn = 20;
  for (const q of ["kwan_crane", "lake_errand", "helmet", "scout"]) {
    G.quests[q] = "offered"; G.room = "soi6_deep";
    assert.match(t("accept " + q.replace("_", " ")), /isn't here to hand it over/, q);
    assert.notEqual(G.itemLoc[QUESTS[q].item], "inventory", q + "'s item crossed town");
    assert.equal(G.quests[q], "offered", q);
  }
  G.room = NPCS.kwan.room; t("accept kwan crane");
  assert.equal(G.itemLoc[QUESTS.kwan_crane.item], "inventory", "with Kwan here the crane is handed over");
});

test("S4-11: a LESSON in the night's last minutes is refused before the money or the free hour moves", () => {
  sandbox(); G.money = 2000; G.room = "cloze"; G.nightTurn = 117; assert.ok(_waenHere(), "the fixture: Waen is at the board");
  const d = G.day; let s = t("lesson phrases");
  assert.match(s, /Nothing is charged/); assert.equal(G.money, 2000); assert.equal(G.day, d, "the lesson ran into the dawn");
  G.clozeFree = true; t("lesson phrases"); assert.equal(G.clozeFree, true, "the free hour was spent into the dawn");
});

test("S1-2: SEND pays the woman whose name was typed — never one whose name merely contains it — and names her", () => {
  sandbox(); G.bank = 10000; G.battery = 80; G.phone.contacts = { kwanjai: true, kwan: true };
  assert.match(t("send 500 to kwan"), /to Kwan in one green blink/);
  assert.deepEqual(G.soc.given, { kwan: 500 });
  G.phone.contacts = { saifon: true, sea_wall_fon: true }; t("send 300 to fon");
  assert.ok(!G.soc.given.saifon, "Saifon was paid for 'fon'");
  G.phone.contacts = { nont: true, candy: true, mercedes: true }; const b = G.bank;
  t("send 300 to me"); assert.equal(G.bank, b, "'me' paid Mercedes");
  G.phone.contacts = { kwanjai: true, kwan: true };
  assert.match(t("send 100 to kwa"), /Which one\?/); assert.equal(G.bank, b);
  // MESSAGE resolves the same way (_contactNamed): Kwan is not Kwanjai
  G.room = "beach_rd_s"; assert.match(t("message kwan"), /You send Kwan something/);
});
