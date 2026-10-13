#!/usr/bin/env node
// THE OFFER AUDIT — what a woman offers in talk, the barfine must honour.
//
// Round 93 (Liam, a budget backpacker): three times in seven nights a woman quoted the stairs — "one lady drink
// first, na — after nine, ฿750" — he bought the drink, and BARFINE said "I go temple in morning". Her talk read the
// price; the verb read the day. Nothing tested that the two agree, and the class (an offer made in conversation and
// refused by the verb it points at) had come back before: "4 more, then we talk" that was six (round 61), the stated
// count that wasn't the count (round 67). Every fix was an instance.
//
// For each hostess on the Soi 6 floor (--all: every hostess in town) at four hours of the night (19:00, 21:00,
// 23:00, 00:30) in a fresh game, the audit asks her about SHORT TIME and about her BARFINE, buys the one lady drink
// if her answer asked for it, and then types BARFINE. The judgements:
//   offer-refused  her talk quoted a price (a ฿ figure, or "one lady drink first") and the barfine refused for a
//                  reason that was already true when she spoke — a day's no (period, temple, drinks only, the
//                  verdict) or her held refusal. A clock refusal ("later, tilac" while she sits with a man, the till
//                  rota, a draw before midnight) is the clock, and is not a finding.
//   price-moved    her talk quoted a short-time figure and the ledger the barfine opened asks a different one
//                  for short time, in the same minute.
//   said-no-went   her talk said no for tonight and the barfine opened a ledger anyway.
//
//   node tools/offer-audit.mjs            the Soi 6 floor (the gate runs --quick)
//   node tools/offer-audit.mjs --quick    ten women
//   node tools/offer-audit.mjs --all      every hostess in town
//   node tools/offer-audit.mjs --mutate peek   prove it goes red: her talk no longer reads her day
//   --verbose prints every probe
//
// OFFER_OK: a finding that is not a defect, keyed "<id>|<turn>|<kind>", with the reason. A new finding fails the test.
import vm from "node:vm";
import fs from "node:fs";

const JS = new URL("../web/js/", import.meta.url);
for (const f of ["thai", "world", "games", "cli-sim", "engine-core", "engine-encounters",
  "engine-play", "engine-systems", "engine-parser"])
  vm.runInThisContext(fs.readFileSync(new URL(f + ".js", JS), "utf8"), { filename: f });
let out = [];
engineInit(t => out.push(String(t)), null, () => {});
const said = () => out.join("\n");

const args = process.argv.slice(2);
const QUICK = args.includes("--quick"), ALL = args.includes("--all"), VERBOSE = args.includes("--verbose"), AS_JSON = args.includes("--json");
const argOf = k => { const i = args.indexOf(k); return i >= 0 ? (args[i + 1] || "") : ""; };
const MUTATE = argOf("--mutate");

const OFFER_OK = {
  // (none)
};
const MUTATIONS = {
  peek: () => { globalThis._bfDayPeek = () => null; },
};
if (MUTATE) { if (!MUTATIONS[MUTATE]) { console.error("no mutation " + MUTATE); process.exit(2); } MUTATIONS[MUTATE](); }

const HOURS = [10, 30, 50, 65];
const DAYS = QUICK ? [2, 3, 4, 5, 6] : [2, 3, 4, 5, 6, 7];
const savedRand = _rand;
_rand = () => 0.42;   // a constant: no dice roll stands between the talk and the verb (CLAUDE.md rule 2)

function fresh(room, day, turn) {
  newGame();
  G.player = { origin: "pension", personality: "joker", orientation: "straight", said: {}, lang: "en" };
  G.stage = "vacation"; G.mode = "soi6"; G.hotel = "queenvic";
  _setFlag("act1Done"); _setFlag("hasWallet");
  for (const k in ENCOUNTERS) G.encDone[k] = true;
  G.peddlerNight = 99; G.lastSaleng = 99999; G.money = 50000; G.flowerDay = day;
  G.day = day; G.nightTurn = turn; G.room = room;
}
const nm = id => String(NPCS[id].name).toLowerCase();
// a quote: a baht figure, or the one-drink rule; a no: the peek's sentences and the floor's "not tonight"
const QUOTE = /฿\s?\d|one lady drink first/i;
const SAID_NO = /not me tonight|lady time|go temple|drink only|does not answer that/i;
// the refusals the barfine prints for a day's no or a held one (the table _bfRefusalSay reads)
const DAY_NO = /lady time|go temple|drink only|Drink only|DRINK only|told you already|It was a no with nothing|no with nothing in it/i;

const sample = Object.keys(NPCS).filter(id => NPC_ROLES[id] === "hostess" && ROOMS[NPCS[id].room] && ROOMS[NPCS[id].room].barType &&
  (ALL || ROOMS[NPCS[id].room].region === "Soi 6") && !NPCS[id].offmap);
const women = QUICK ? sample.filter((_, i) => i % Math.max(1, Math.floor(sample.length / 10)) === 0).slice(0, 10) : sample;

const findings = [];
let probes = 0;
for (const id of women) {
  const room = NPCS[id].room;
  for (const day of DAYS) for (const turn of HOURS) {
    fresh(room, day, turn);
    if (!_npcsHere().includes(id)) continue;
    if (typeof _girlBusy === "function" && _girlBusy(id)) continue;   // with a customer: the clock, not the day
    // the talk
    out = []; doCommand("talk to " + nm(id));
    out = []; doCommand(`ask ${nm(id)} about short time`); const t1 = said();
    out = []; doCommand(`ask ${nm(id)} about barfine`); const t2 = said();
    const talk = t1 + "\n" + t2;
    G.convoQ = null;
    const quoted = QUOTE.test(talk) && !SAID_NO.test(talk), saidNo = SAID_NO.test(talk);
    const stQuoted = (t1.match(/[Ss]hort time,? ฿\s?([\d,]+)/) || [])[1];
    // the drink she asked for, bought — the order a man follows her words in
    if (/one lady drink first|buy me one/i.test(talk)) { out = []; doCommand("buy drink for " + nm(id)); }
    // the verb
    out = []; doCommand("barfine " + nm(id)); const bf = said(); probes++;
    const opened = !!G.pendingBf;
    const bad = [];
    if (quoted && !opened && DAY_NO.test(bf)) bad.push(["offer-refused", `quoted "${(talk.match(QUOTE) || [""])[0]}" and then refused: "${bf.split("\n")[0].slice(0, 90)}"`]);
    if (saidNo && opened) bad.push(["said-no-went", "her talk said not tonight, and the ledger opened"]);
    if (opened && stQuoted && G.pendingBf.st && +stQuoted.replace(/,/g, "") !== G.pendingBf.st && !G.pendingBf.herMoney)
      bad.push(["price-moved", `quoted short time ฿${stQuoted}, the ledger asks ฿${G.pendingBf.st}`]);
    for (const [kind, msg] of bad) {
      const key = `${id}|${turn}|${kind}`;
      if (OFFER_OK[key] || findings.some(f => f.key === key)) continue;
      findings.push({ key, id, day, turn, kind, msg });
    }
    if (VERBOSE) console.log(`${id} d${day} t${turn} quoted=${quoted} no=${saidNo} opened=${opened}\n  talk: ${talk.split("\n").find(l => /฿|tonight|drink/.test(l)) || ""}\n  bf: ${bf.split("\n")[0].slice(0, 100)}`);
  }
}
_rand = savedRand;

if (AS_JSON) { console.log(JSON.stringify({ women: women.length, probes, findings })); process.exit(0); }
for (const f of findings) console.log(`  ${f.key.padEnd(40)} day ${f.day} — ${f.msg}`);
console.log(`\noffer audit: ${women.length} women · ${DAYS.length} days × ${HOURS.length} hours · ${probes} barfines tried · ${findings.length} findings`);
process.exitCode = findings.length ? 1 : 0;
