// thai.js is a classic script sharing globals; load it into this realm with
// node:vm (same pattern as the Soi Sanuk trainer tests). Top-level const/let
// land in the global lexical scope — reference them as bare identifiers.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const src = readFileSync(
  fileURLToPath(new URL("../../web/js/thai.js", import.meta.url)), "utf8");
vm.runInThisContext(src, { filename: "thai.js" });

test("thaiNum composes basic digits", () => {
  assert.equal(thaiNum(1), "หนึ่ง");
  assert.equal(thaiNum(5), "ห้า");
  assert.equal(thaiNum(9), "เก้า");
});

test("thaiNum handles tens and irregulars", () => {
  assert.equal(thaiNum(10), "สิบ");
  assert.equal(thaiNum(11), "สิบเอ็ด");   // trailing 1 above 10 → เอ็ด
  assert.equal(thaiNum(20), "ยี่สิบ");     // 20 → ยี่ not สอง
  assert.equal(thaiNum(21), "ยี่สิบเอ็ด");
  assert.equal(thaiNum(15), "สิบห้า");     // the baht bus fare
});

test("thaiNum handles hundreds", () => {
  assert.equal(thaiNum(100), "หนึ่งร้อย");
  assert.equal(thaiNum(145), "หนึ่งร้อยสี่สิบห้า");
  assert.equal(thaiNum(999), "เก้าร้อยเก้าสิบเก้า");
});

test("thaiBaht appends บาท", () => {
  assert.equal(thaiBaht(15), "สิบห้าบาท");
});

test("thaiNumRoman romanises with irregulars", () => {
  assert.equal(thaiNumRoman(15), "sìp hâa");
  assert.equal(thaiNumRoman(21), "yîi-sìp èt");
  assert.equal(thaiNumRoman(150), "nùeng-rói hâa-sìp");
});

test("thaiDigits renders Thai numerals", () => {
  assert.equal(thaiDigits(715), "๗๑๕");
  assert.equal(thaiDigits(0), "๐");
});

test("parseThaiDigits round-trips and rejects junk", () => {
  assert.equal(parseThaiDigits("๗๑๕"), 715);
  assert.equal(parseThaiDigits(thaiDigits(4289)), 4289);
  assert.equal(parseThaiDigits("๗a๕"), null);
  assert.equal(parseThaiDigits(""), null);
});

test("THAI_NUMERALS are the codepoints U+0E50–U+0E59", () => {
  for (let i = 0; i < 10; i++) {
    assert.equal(THAI_NUMERALS.codePointAt(i), 0x0E50 + i);
  }
});

test("matchThaiPhrase matches Thai, romanisation, and variants", () => {
  assert.equal(matchThaiPhrase("สวัสดีครับ"), "hello");
  assert.equal(matchThaiPhrase("Sawatdee"), "hello");
  assert.equal(matchThaiPhrase("sawasdee!"), "hello");
  assert.equal(matchThaiPhrase("khop khun"), "thanks");
  assert.equal(matchThaiPhrase("thao rai"), "how_much");
  assert.equal(matchThaiPhrase("gibberish"), null);
  assert.equal(matchThaiPhrase(""), null);
});

test("all signs have rom and en", () => {
  for (const [th, s] of Object.entries(THAI_SIGNS)) {
    assert.ok(th.length, "sign has Thai text");
    assert.ok(s.rom && s.en, `${th} has rom and en`);
  }
});
