#!/usr/bin/env node
// THE ORDER IN WHICH A PERSON ANSWERS (the architecture review of 2026-10-25, finding 2). _doTalkCore tries its answerers
// in source order and the first that answers wins — Eddy's THE JOB was taken by the manager's-job offer, "I won't pay" by
// the pay branch, because nothing recorded the order. This extracts it: every helper _doTalkCore calls with `npc` inside
// an if() whose branch returns, in the order the source tries them. docs/architecture.md shows the list
// (`node tools/gen-architecture.mjs` fills <!-- talkorder -->) and tests/js/talk-order.test.js pins it, so a change to
// the order is a change somebody wrote down.
//   node tools/talk-order.mjs        print the order
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
const PLUMBING = /^_(?:met|npcState|pickDialogue|flag|room|bondTier|knownTier|npcRoom|npcsHere|atOwnBar|atJobBar|jobBarStaff|ownBarStaff|isOrigin|pr|hoursRegister|thaiHouse|topicHits|topicExact|maiDee|outWithMe|affairLive|onRide|convoActive|questOffer|say|pickVary|fmt|isLeavingSaid|read|inBar|servesDrinks|barName)$/;
export function talkOrder() {
  const s = readFileSync(fileURLToPath(new URL("../web/js/engine-parser.js", import.meta.url)), "utf8");
  const i = s.indexOf("function _doTalkCore("), j = s.indexOf("\nfunction ", i + 10), body = s.slice(i, j);
  const seen = [], set = new Set();
  for (const m of body.matchAll(/if \(([^\n]*?)\b(_[a-zA-Z]\w*)\(npc[^\n]*?\)\s*\)?\s*\{?[^\n]*?\breturn\b/g))
    if (!set.has(m[2]) && !PLUMBING.test(m[2])) { set.add(m[2]); seen.push(m[2]); }
  return seen;
}
if (import.meta.url === `file://${process.argv[1]}`) talkOrder().forEach((n, k) => console.log(String(k + 1).padStart(2), n));
