// Bake real headlines into web/js/news-data.js (run by the news workflow on
// a cron, or by hand). No dependencies — Google News RSS parsed with regexes.
//
// The output is a classic-script global (var NEWS_FEED = [...]) so the game
// reads it as a plain asset: no runtime fetch, works from file://, and the
// engine stays deterministic — headlines are presentation flavor only.
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const OUT = fileURLToPath(new URL("../web/js/news-data.js", import.meta.url));

const FEEDS = [
  ["pattaya", "https://news.google.com/rss/search?q=pattaya&hl=en-US&gl=US&ceid=US:en", 8],
  ["thailand", "https://news.google.com/rss/search?q=thailand&hl=en-US&gl=US&ceid=US:en", 6],
];

const ENT = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", "#39": "'", "#039": "'" };
const decode = s => s.replace(/&(#?\w+);/g, (m, e) =>
  ENT[e] || (e[0] === "#" ? String.fromCodePoint(parseInt(e.slice(1), 10) || 63) : m));

// Belt and braces: the file must always be valid, inert JS. Strip anything
// that could read as markup or script, cap the length, collapse whitespace.
const clean = s => decode(s)
  .replace(/<[^>]*>/g, "")
  .replace(/[<>`\\]/g, "")
  .replace(/\s+/g, " ")
  .trim()
  .slice(0, 140);

function parseItems(xml) {
  const out = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const it = m[1];
    const rawTitle = (it.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/) || [])[1];
    if (!rawTitle) continue;
    const src = clean((it.match(/<source[^>]*>([\s\S]*?)<\/source>/) || [, ""])[1]);
    let title = clean(rawTitle);
    // Google News suffixes " - Source"; drop it when it just repeats the source
    if (src && title.toLowerCase().endsWith(" - " + src.toLowerCase())) {
      title = title.slice(0, -(src.length + 3)).trim();
    }
    const pub = (it.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [, ""])[1];
    const date = pub ? clean(pub).slice(5, 16) : ""; // "08 Jul 2026"
    if (title.length > 20) out.push({ t: title, s: src, d: date });
  }
  return out;
}

// ── FX: what the baht is doing to everyone's pension ─────────────────────────
// THB per 1 unit of USD/AUD/GBP/EUR. Frankfurter (ECB daily reference, no
// key) first; open.er-api.com as fallback; last bake's numbers as the floor.

const FX_SYMBOLS = ["USD", "AUD", "GBP", "EUR"];

async function fetchRates() {
  try {
    const r = await fetch("https://api.frankfurter.app/latest?from=THB&to=" + FX_SYMBOLS.join(","));
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    const out = { date: j.date || "" };
    for (const c of FX_SYMBOLS) out[c] = +(1 / j.rates[c]).toFixed(2);
    return out;
  } catch (e) {
    console.error(`frankfurter: ${e.message} — trying er-api`);
  }
  try {
    const r = await fetch("https://open.er-api.com/v6/latest/THB");
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    const out = { date: (j.time_last_update_utc || "").slice(5, 16).trim() };
    for (const c of FX_SYMBOLS) out[c] = +(1 / j.rates[c]).toFixed(2);
    return out;
  } catch (e) {
    console.error(`er-api: ${e.message} — salvaging previous rates`);
  }
  try {
    const prev = readFileSync(OUT, "utf8");
    const m = prev.match(/var FX_RATES = (\{[\s\S]*?\});/);
    if (m) return JSON.parse(m[1]);
  } catch {}
  return null;
}

// ── Weather: the other thing expats moan about ───────────────────────────────
// Pattaya current conditions + today's rain odds from Open-Meteo (free, no
// key). Same deal as FX: previous bake as fallback, absent is legal.

async function fetchWeather() {
  try {
    const r = await fetch("https://api.open-meteo.com/v1/forecast" +
      "?latitude=12.9236&longitude=100.8825" +
      "&current=temperature_2m,relative_humidity_2m,weather_code" +
      "&daily=precipitation_probability_max,temperature_2m_max" +
      "&forecast_days=1&timezone=Asia%2FBangkok");
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    return {
      date: String(j.current.time || "").slice(0, 10),
      temp: Math.round(j.current.temperature_2m),
      humid: Math.round(j.current.relative_humidity_2m),
      code: j.current.weather_code | 0,
      hi: Math.round(j.daily.temperature_2m_max[0]),
      rain: Math.round(j.daily.precipitation_probability_max[0] ?? 0),
    };
  } catch (e) {
    console.error(`open-meteo: ${e.message} — salvaging previous weather`);
  }
  try {
    const prev = readFileSync(OUT, "utf8");
    const m = prev.match(/var WX_NOW = (\{[\s\S]*?\});/);
    if (m) return JSON.parse(m[1]);
  } catch {}
  return null;
}

const wxSane = w => w && w.temp > 5 && w.temp < 50 &&
  w.humid >= 0 && w.humid <= 100 && w.rain >= 0 && w.rain <= 100;

const wx = await fetchWeather();
if (wx) {
  if (!wxSane(wx)) console.error("weather failed the sniff test — dropping it");
  else console.log(`weather: ${wx.temp}° · ${wx.humid}% · rain ${wx.rain}%`);
}

const fx = await fetchRates();
if (fx) {
  const bad = FX_SYMBOLS.some(c => !(fx[c] > 1 && fx[c] < 500)); // sanity fence
  if (bad) { console.error("rates failed the sniff test — dropping FX"); }
  else console.log("rates:", FX_SYMBOLS.map(c => `${c} ${fx[c]}`).join(" · "));
}

const feed = [];
const seen = new Set();
for (const [tag, url, want] of FEEDS) {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 (soisanuk news baker)" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    let taken = 0;
    for (const item of parseItems(await res.text())) {
      const key = item.t.toLowerCase().slice(0, 60);
      if (seen.has(key)) continue;
      seen.add(key);
      feed.push(item);
      if (++taken >= want) break;
    }
    console.log(`${tag}: ${taken} headlines`);
  } catch (e) {
    console.error(`${tag}: ${e.message}`);
  }
}

if (feed.length < 3) {
  // keep whatever was baked last time rather than shipping an empty paper
  console.error(`only ${feed.length} headlines — keeping the previous bake`);
  process.exit(0);
}

let previous = "";
try { previous = readFileSync(OUT, "utf8"); } catch {}

const body =
  "// AUTO-GENERATED by scripts/fetch-news.mjs — do not edit by hand.\n" +
  "// Re-baked on a schedule by .github/workflows/news.yml. Presentation-layer\n" +
  "// flavor ONLY (bar TVs, newspapers): never gate game logic on headlines.\n" +
  "var NEWS_FEED = " + JSON.stringify(feed, null, 2) + ";\n" +
  (fx && FX_SYMBOLS.every(c => fx[c] > 1 && fx[c] < 500)
    ? "// THB per 1 unit — the expat moaning index\n" +
      "var FX_RATES = " + JSON.stringify(fx) + ";\n"
    : "") +
  (wxSane(wx)
    ? "// Pattaya right now — the other moaning index\n" +
      "var WX_NOW = " + JSON.stringify(wx) + ";\n"
    : "");

if (body === previous) {
  console.log("headlines unchanged");
} else {
  writeFileSync(OUT, body);
  console.log(`baked ${feed.length} headlines → web/js/news-data.js`);
}
