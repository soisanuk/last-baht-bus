// THE ORDER A PERSON ANSWERS IN (the architecture review of 2026-10-25, finding 2). _doTalkCore tries these helpers in
// source order and the first that answers wins; the most persistent defect class was a later answerer that never got the
// question because an earlier one took it. This pins the order: if you move, add or remove an answerer, update ORDER here
// — that is the note — and say in the commit who now answers what they did not before.
import { test } from "node:test";
import assert from "node:assert/strict";
import { talkOrder } from "../../tools/talk-order.mjs";

const ORDER = ["_seenHomeTalk", "_deedTalk", "_textTalk", "_streetTalk", "_ownNightTalk", "_ownBarTalk", "_patronRage", "_wentWithTalk", "_withHerTalk", "_partyTalk", "_oppTalk", "_lastByeDue", "_atCamera", "_lockInMemory", "_jobMemoryTalk", "_ownWordTalk", "_townTalk", "_bfRefusalSay", "_lastTimeTalk", "_flightTalk", "_mineTalk", "_myJobTalk", "_deliver", "_thaiWordTalk", "_quizTalk", "_normalGirlTalk", "_careTalk", "_moneyTalk", "_leavingTalk", "_playerSaidTalk", "_drinksOnlyWhy", "_jobFloorTalk", "_awayTalk", "_stillOpenTalk", "_openingTalk", "_busyTalk", "_closingTalk", "_leagueTalk", "_checkpointTalk", "_goneTalk", "_fixtureTalk", "_hotelTalk", "_soberTalk", "_smallTalk"];

test("the conversation's answerers are tried in the recorded order", () => {
  assert.deepEqual(talkOrder(), ORDER);
});
