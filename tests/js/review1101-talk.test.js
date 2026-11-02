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
