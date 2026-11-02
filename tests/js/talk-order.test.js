// THE ORDER A PERSON ANSWERS IN (the architecture review of 2026-10-25, finding 2). _doTalkCore tries these helpers in
// source order and the first that answers wins; the most persistent defect class was a later answerer that never got the
// question because an earlier one took it. This pins the order: if you move, add or remove an answerer, update ORDER here
// — that is the note — and say in the commit who now answers what they did not before.
import { test } from "node:test";
import assert from "node:assert/strict";
import { talkOrder } from "../../tools/talk-order.mjs";

// Every helper _doTalkCore calls with `npc` first, in the order of its first call, whatever shape the statement has;
// predicates, lookups and bookkeeping are named in tools/talk-order.mjs's PLUMBING. A new helper lands here or there.
const ORDER = ["_townTalk", "_leavingTalk", "_exitSlip", "_seenHomeTalk", "_deedTalk", "_textTalk", "_streetTalk",
  "_afterWorkTalk", "_ownNightTalk", "_ownBarTalk", "_patronRage", "_wentWithTalk", "_withHerTalk", "_partyTalk", "_oppTalk",
  "_lastByeDue", "_lastNightBye", "_wentWithHello", "_jobMemoryTalk", "_atCamera", "_streamBusy", "_lockInMemory",
  "_ownWordTalk", "_bfRefusalSay", "_lastTimeTalk", "_flightTalk", "_stillHereTalk", "_mineTalk", "_myJobTalk", "_paperTalk",
  "_venueAnswer", "_smallTalk", "_deliver", "_bondTalk", "_otherLedger", "_thaiWordTalk", "_quizTalk", "_normalGirlTalk",
  "_careTalk", "_moneyTalk", "_playerSaidTalk", "_drinksOnlyWhy", "_jobFloorTalk", "_awayTalk", "_foodWhereTalk",
  "_stillOpenTalk", "_openingTalk", "_busyTalk", "_closingTalk", "_leagueTalk", "_badgeTalk", "_workTalk", "_poolTalk",
  "_barfineTalk", "_priceTalk", "_kitchenTalk", "_checkpointTalk", "_dogTalk", "_keptTalk", "_goneTalk", "_selfNamedNode",
  "_fixtureTalk", "_hotelTalk", "_soberTalk", "_patronAgain", "_askAgain", "_topicLocked", "_topicMiss"];

test("the conversation's answerers are tried in the recorded order", () => {
  assert.deepEqual(talkOrder(), ORDER);
});
