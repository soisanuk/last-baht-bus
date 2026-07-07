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
  { key: "hello",    th: "สวัสดีครับ",   rom: "sawatdee khrap",  match: ["สวัสดีครับ", "สวัสดี", "sawatdee", "sawasdee", "sawadee", "wai"] },
  { key: "thanks",   th: "ขอบคุณครับ",  rom: "khop khun khrap", match: ["ขอบคุณครับ", "ขอบคุณ", "khop khun", "khopkhun", "kop khun"] },
  { key: "how_much", th: "เท่าไหร่",     rom: "thao rai",        match: ["เท่าไหร่", "thao rai", "taorai", "tao rai"] },
  { key: "no",       th: "ไม่เอา",       rom: "mai ao",          match: ["ไม่เอา", "mai ao", "maiao"] },
  { key: "delicious",th: "อร่อย",        rom: "aroi",            match: ["อร่อย", "aroi", "arroi"] },
  { key: "fun",      th: "สนุก",         rom: "sanuk",           match: ["สนุก", "sanuk", "sanook"] },
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

// Spoken baht amount, e.g. 15 → "สิบห้าบาท" (what the bus driver says)
function thaiBaht(n) {
  return thaiNum(n) + "บาท";
}
