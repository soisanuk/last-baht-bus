// Thai language data & helpers for The Last Baht Bus.
// Pure — no DOM access at load time or in any function (unit-tested via node:vm).
// Number composition ported from the Soi Sanuk trainer (baht-bus.js).

// ── Thai numbers (1–999) ───────────────────────────────────────────────────

const THAI_DIG   = ["", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const THAI_DIG_R = ["", "nùeng", "sǒong", "sǎam", "sìi", "hâa", "hòk", "jèt", "pàet", "kâo"];
const THAI_NUMERALS = "๐๑๒๓๔๕๖๗๘๙"; // U+0E50–U+0E59

// Composed Thai reading: 11 → สิบเอ็ด, 20 → ยี่สิบ, 145 → หนึ่งร้อยสี่สิบห้า
function thaiNum(n) {
  const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), u = n % 10;
  let out = "";
  if (h) out += THAI_DIG[h] + "ร้อย";
  if (t) out += (t === 2 ? "ยี่" : t === 1 ? "" : THAI_DIG[t]) + "สิบ";
  if (u) out += (n >= 11 && u === 1) ? "เอ็ด" : THAI_DIG[u];
  return out;
}

function thaiNumRoman(n) {
  const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), u = n % 10;
  const parts = [];
  if (h) parts.push(THAI_DIG_R[h] + "-rói");
  if (t) parts.push((t === 2 ? "yîi-" : t === 1 ? "" : THAI_DIG_R[t] + "-") + "sìp");
  if (u) parts.push((n >= 11 && u === 1) ? "èt" : THAI_DIG_R[u]);
  return parts.join(" ");
}

// Thai-numeral rendering: 715 → ๗๑๕ (for the safe PIN and signage)
function thaiDigits(n) {
  return String(n).split("").map(d => THAI_NUMERALS[+d]).join("");
}

// Parse a string of Thai numerals back to a number; null if any char isn't ๐–๙.
function parseThaiDigits(s) {
  let out = "";
  for (const ch of s) {
    const i = THAI_NUMERALS.indexOf(ch);
    if (i === -1) return null;
    out += i;
  }
  return out.length ? parseInt(out, 10) : null;
}

// ── Signs the player can read ──────────────────────────────────────────────

const THAI_SIGNS = {
  "เปิด":    { rom: "pòet",      en: "open" },
  "ปิด":     { rom: "pìt",       en: "closed" },
  "ซ้าย":    { rom: "sáai",      en: "left" },
  "ขวา":     { rom: "khwǎa",     en: "right" },
  "ตรงไป":   { rom: "trong pai", en: "straight ahead" },
  "ทางออก":  { rom: "thaang òok", en: "exit" },
  "ห้องน้ำ":  { rom: "hɔ̂ng náam", en: "toilet" },
  "ห้ามเข้า": { rom: "hâam khâo", en: "no entry" },
};

// ── Phrases the player can say (typed Thai or romanisation both accepted) ──

const THAI_PHRASES = [
  { key: "hello",    th: "สวัสดีครับ",   rom: "sawatdee khrap",  match: ["สวัสดีครับ", "สวัสดี", "sawasdee", "sawaddee", "sawadee khrap", "sawatdee", "sawasdee", "sawadee", "wai"] },
  { key: "thanks",   th: "ขอบคุณครับ",  rom: "khop khun khrap", match: ["ขอบคุณครับ", "ขอบคุณ", "khop khun", "khopkhun", "kop khun"] },
  { key: "how_much", th: "เท่าไหร่",     rom: "thao rai",        match: ["เท่าไหร่", "thao rai", "taorai", "tao rai", "tao arai", "gee baht"] },
  { key: "no",       th: "ไม่เอา",       rom: "mai ao",          match: ["ไม่เอา", "mai ao", "maiao"] },
  { key: "delicious",th: "อร่อย",        rom: "aroi",            match: ["อร่อย", "aroi", "arroi", "aroy", "arroy", "aloy"] },
  { key: "fun",      th: "สนุก",         rom: "sanuk",           match: ["สนุก", "sanuk", "sanook"] },
  // The phrases a learner actually arrives with. Hugo (round 42) typed all of
  // these and every one fell through to "the soi blinks at you" — including the
  // ones the game itself says at him.
  { key: "nevermind", th: "ไม่เป็นไร",   rom: "mai pen rai",     match: ["ไม่เป็นไร", "mai pen rai", "maipenrai", "mai bpen rai"] },
  { key: "luck",     th: "โชคดี",        rom: "chok dee",        match: ["โชคดี", "chok dee", "chokdee", "chok di"] },
  { key: "howareyou",th: "สบายดีไหม",    rom: "sabai dee mai",   match: ["สบายดีไหม", "sabai dee mai", "sabaidee mai", "sabai dee mai khrap", "sabai dee mai krub"] },
  { key: "sorry",    th: "ขอโทษครับ",    rom: "khor thot khrap", match: ["ขอโทษครับ", "ขอโทษ", "khor thot", "khor thot khrap", "kor tot", "khaw thot"] },
  { key: "beautiful",th: "สวย",          rom: "suay",            match: ["สวย", "suay", "suai"] },
  { key: "expensive",th: "แพง",          rom: "phaeng",          match: ["แพง", "phaeng", "paeng", "pang mak"] },
  { key: "eatenyet", th: "กินข้าวหรือยัง", rom: "kin khao mai",  match: ["กินข้าวหรือยัง", "kin khao mai", "kin kao mai", "gin khao mai"] },
  { key: "cool",     th: "ใจเย็น",       rom: "jai yen",         match: ["ใจเย็น", "jai yen", "jai yen yen"] },
];

// Match free player input to a known phrase key (case/space tolerant); null if none.
function matchThaiPhrase(input) {
  const norm = input.toLowerCase().replace(/[!.?]/g, "").trim();
  if (!norm) return null;
  for (const p of THAI_PHRASES) {
    for (const m of p.match) {
      if (norm === m.toLowerCase()) return p.key;
    }
  }
  return null;
}

// …and the reverse of thaiNum: the number a player SAYS, in script or
// romanised, back into an integer. Handles the two irregulars the language
// insists on (สิบเอ็ด = 11, ยี่สิบ = 20) plus พัน/ร้อย, and the romanisations a
// learner types (sip ha, yee sip, song roi, ha roi, neung phan). Returns null
// when it isn't a number, so callers can fall through to the digit parsers.
const _TW_UNITS = { soon: 0, sun: 0, "หนึ่ง": 1, neung: 1, nueng: 1, nung: 1, "เอ็ด": 1, et: 1, ed: 1,
  "สอง": 2, song: 2, saawng: 2, soong: 2, "สาม": 3, sam: 3, saam: 3, "สี่": 4, si: 4, sii: 4, see: 4,
  "ห้า": 5, ha: 5, haa: 5, "หก": 6, hok: 6, "เจ็ด": 7, jet: 7, chet: 7, "แปด": 8, paet: 8, bpaet: 8, pet: 8,
  "เก้า": 9, kao: 9, gao: 9, "เก้า": 9 };
function parseThaiWords(s) {
  let t = String(s || "").toLowerCase().trim().replace(/บาท|baht/g, " ").trim();
  if (!t) return null;
  // longest-first, one pass, so ยี่สิบ is not re-split into ยี่ + สิบ
  t = t.replace(/(ยี่สิบ|สิบเอ็ด|หนึ่ง|สอง|สาม|สี่|ห้า|หก|เจ็ด|แปด|เก้า|เอ็ด|สิบ|ร้อย|พัน)/g, " $1 ");
  t = t.replace(/\byee\s+sip\b|\byi\s+sip\b/g, " ยี่สิบ ");
  const toks = t.split(/[\s,]+/).filter(Boolean);
  if (!toks.length) return null;
  let total = 0, cur = 0, saw = false;
  for (const tk of toks) {
    if (tk === "ยี่สิบ") { cur += 20; saw = true; continue; }
    if (tk === "สิบเอ็ด") { cur += 11; saw = true; continue; }
    if (tk === "สิบ" || tk === "sip" || tk === "sib") { cur = (cur === 0 ? 1 : cur) * 10; saw = true; continue; }
    if (tk === "ร้อย" || tk === "roi" || tk === "roy") { cur = (cur === 0 ? 1 : cur) * 100; total += cur; cur = 0; saw = true; continue; }
    if (tk === "พัน" || tk === "phan" || tk === "pan") { cur = (cur === 0 ? 1 : cur) * 1000; total += cur; cur = 0; saw = true; continue; }
    if (Object.prototype.hasOwnProperty.call(_TW_UNITS, tk)) { cur += _TW_UNITS[tk]; saw = true; continue; }
    return null;   // a word that is not a number: this was never a number
  }
  if (!saw) return null;
  const n = total + cur;
  return Number.isFinite(n) && n > 0 ? n : null;
}

// Spoken baht amount, e.g. 15 → "สิบห้าบาท" (what the bus driver says)
function thaiBaht(n) {
  return thaiNum(n) + "บาท";
}
