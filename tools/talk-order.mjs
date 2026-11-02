#!/usr/bin/env node
// THE ORDER IN WHICH A PERSON ANSWERS (the architecture review of 2026-10-25, finding 2). _doTalkCore tries its answerers
// in source order and the first that answers wins — Eddy's THE JOB was taken by the manager's-job offer, "I won't pay" by
// the pay branch, because nothing recorded the order. This extracts it: every helper _doTalkCore calls with `npc` as its
// first argument, in the order the source first calls it, whatever shape the statement has — `if (_x(npc, topic)) return;`,
// `const said = _x(npc); if (said) {…}`, `_say(_x(npc))`, a call on the second line of a multi-line if, or one behind a
// predicate on the same line. Only the helpers named in PLUMBING (predicates, lookups, bookkeeping, pools — nothing that
// prints the answer) are left out, so a NEW helper of any shape lands in the list and fails the pin until somebody puts it
// in its place or names it plumbing. Inline branches that answer without a helper are not in the list.
// docs/architecture.md shows the list (`node tools/gen-architecture.mjs` fills <!-- talkorder -->) and
// tests/js/talk-order.test.js pins it, so a change to the order is a change somebody wrote down.
//   node tools/talk-order.mjs        print the order
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
export const PLUMBING = new Set(("met npcState pickDialogue flag room bondTier knownTier npcRoom npcsHere atOwnBar atJobBar " +
  "jobBarStaff ownBarStaff isOrigin pr hoursRegister thaiHouse topicHits topicExact maiDee outWithMe affairLive onRide " +
  "convoActive questOffer say pickVary fmt isLeavingSaid read inBar servesDrinks barName " +
  // bookkeeping: the partner, the hello book, the manager's chat count
  "convoStart markHello managerChatTick " +
  // predicates and lookups that gate or feed a branch whose answerer is listed
  "giftMatch hasSponsor sponsorInTown sponsorFamilyDay herNameForYou teachesHere thaiVoice badge homeOf townPick " +
  "authoredStory nodeOpen giftsOf hh " +
  // a pool, read by the line that prints it
  "partyTalkPool").split(/\s+/).filter(Boolean).map(n => "_" + n));
// src: engine-parser.js's text (the file on disk by default; a test passes a mutated copy)
export function talkOrder(src) {
  const s = src != null ? src : readFileSync(fileURLToPath(new URL("../web/js/engine-parser.js", import.meta.url)), "utf8");
  const i = s.indexOf("function _doTalkCore("), j = s.indexOf("\nfunction ", i + 10);
  // whole-line comments out: a comment that names a helper is not a call to it
  const body = s.slice(i, j).split("\n").filter(l => !/^\s*\/\//.test(l)).join("\n");
  const seen = [], set = new Set();
  for (const m of body.matchAll(/\b(_[a-zA-Z]\w*)\(\s*npc\s*[,)]/g))
    if (!set.has(m[1]) && !PLUMBING.has(m[1])) { set.add(m[1]); seen.push(m[1]); }
  return seen;
}
if (import.meta.url === `file://${process.argv[1]}`) talkOrder().forEach((n, k) => console.log(String(k + 1).padStart(2), n));
