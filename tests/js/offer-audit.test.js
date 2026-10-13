// The offer audit is gated here (2026-10-14). Round 93's severe was a woman who quoted the stairs — "one lady drink
// first, na — after nine ฿750" — sold the drink, and then refused at BARFINE for a reason the day had already
// decided (temple). tools/offer-audit.mjs asks each Soi 6 hostess about short time and her barfine at four hours on
// several days, follows her words (the one drink she asks for), types BARFINE, and fails when the talk offered and
// the verb refused for a day's no, when the talk said no and the ledger opened anyway, or when the short-time figure
// moved between her mouth and the ledger. OFFER_OK holds the benign ones with their reasons.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const TOOL = fileURLToPath(new URL("../../tools/offer-audit.mjs", import.meta.url));
const run = (...flags) => {
  let raw;
  try { raw = execFileSync(process.execPath, [TOOL, "--json", ...flags], { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 }); }
  catch (e) { raw = String(e.stdout || ""); if (!raw.trim()) throw e; }
  return JSON.parse(raw);
};

test("offer audit: what a woman offers in talk, the barfine honours", () => {
  const r = run("--quick");
  assert.ok(r.probes >= 100, "the audit tried its barfines: " + r.probes);
  assert.deepEqual(r.findings.map(f => `${f.key}: ${f.msg}`), [], "a NEW finding — fix the engine, or add it to OFFER_OK with a reason");
});

test("offer audit goes red when her talk stops reading her day (--mutate)", () => {
  assert.ok(run("--quick", "--mutate", "peek").findings.some(f => f.kind === "offer-refused"), "a quote-then-temple went unseen");
});
