// The money audit is gated here (2026-10-08). Class E — economy: money that moved without a
// clear reason, the morning ledger and BOOKS disagreeing with what happened — had 74 findings
// in the persona ledger and 4% instrument coverage. tools/money-audit.mjs plays scripted nights
// through the real entry points, keeps its own book of every baht (pocket, account, money in
// transit, the owner's till) and checks the printed surfaces against it: the ledger closes
// against the balances (I1), each printed figure matches (I2), the till matches BOOKS (I3),
// CHECK BIN matches the slips (I4), a read-only verb moves nothing (I0), and every ฿ figure
// carries its separator (I5).
//
// The real defects it found are listed in the tool's MONEY_OPEN with a diagnosis each, so the
// suite stays green while they stay visible: every finding must be on MONEY_OPEN or MONEY_OK.
// A NEW finding fails here. A fixed defect simply stops reproducing — the tool lists those rows
// as "no longer reproduce", and this test asks for them to be deleted, so the list cannot rot.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const TOOL = fileURLToPath(new URL("../../tools/money-audit.mjs", import.meta.url));
const run = (...flags) => JSON.parse(execFileSync(process.execPath, [TOOL, "--json", ...flags],
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));

test("money audit (--quick): every finding is a known open defect or a benign one, and the audit did work", () => {
  const r = run("--quick");
  // an instrument that does no work reports no findings (afford-audit's lesson)
  assert.ok(r.stats.scenarios >= 5, `only ${r.stats.scenarios} scenarios ran`);
  assert.ok(r.stats.ledgers >= 10, `only ${r.stats.ledgers} morning ledgers checked`);
  assert.ok(r.stats.tills >= 3, `only ${r.stats.tills} owner tills closed against BOOKS`);
  assert.ok(r.stats.bins >= 8, `only ${r.stats.bins} CHECK BINs checked`);
  assert.deepEqual(r.findings.filter(f => f.inv === "ERROR").map(f => f.msg), [], "a scenario could not do what it needs to");
  assert.deepEqual(r.unknown, [], "a NEW money finding — fix the engine, or add it to MONEY_OPEN (real) / MONEY_OK (benign, with a reason)");
  assert.deepEqual(r.fixed, [], "a MONEY_OPEN row no longer reproduces — the fix landed; delete the row");
});

test("money audit goes red when a counter is broken (--mutate)", () => {
  // the ATM forgets atmTotal: the notes read as income on the ledger
  assert.ok(run("--quick", "--mutate", "atm").unknown.some(k => /tourist-bar#n1:I[12]:/.test(k)), "a forgotten ATM counter went unseen");
  // a tip forgets it is off the slips: CHECK BIN counts it
  assert.ok(run("--quick", "--mutate", "bin").unknown.some(k => /:I4:checkbin@/.test(k)), "a tip on the slips went unseen");
  // the settle moves the till by a sum BOOKS never prints
  assert.ok(run("--quick", "--mutate", "till").unknown.some(k => /owner-.*:I3:till/.test(k)), "an unbooked till movement went unseen");
});
