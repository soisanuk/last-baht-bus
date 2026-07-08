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

// Generic fallback: dig the previous bake's value for `name` out of OUT.
function salvage(name) {
  try {
    const prev = readFileSync(OUT, "utf8");
    const m = prev.match(new RegExp(`var ${name} = (\\{[\\s\\S]*?\\});`));
    if (m) { console.error(`${name}: salvaged previous bake`); return JSON.parse(m[1]); }
  } catch {}
  return null;
}

// ── Football: the bar TV's one true channel ──────────────────────────────────
// ESPN's public scoreboard JSON, no key. World Cup while it's on, Premier
// League the rest of the year — first league with fixtures in the window wins.

async function fetchFooty() {
  const leagues = [["fifa.world", "World Cup"], ["eng.1", "Premier League"]];
  const fmt = d => d.toISOString().slice(0, 10).replace(/-/g, "");
  const now = Date.now();
  const range = `${fmt(new Date(now - 3 * 864e5))}-${fmt(new Date(now + 4 * 864e5))}`;
  for (const [slug, league] of leagues) {
    try {
      const r = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${range}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      const games = (j.events || []).map(e => {
        const c = (e.competitions || [])[0] || {};
        const side = ha => (c.competitors || []).find(x => x.homeAway === ha) || {};
        const h = side("home"), a = side("away");
        return {
          d: String(e.date || "").slice(0, 10),
          done: !!(e.status && e.status.type && e.status.type.completed),
          h: clean(h.team ? h.team.shortDisplayName : "").slice(0, 30),
          hs: +h.score || 0,
          a: clean(a.team ? a.team.shortDisplayName : "").slice(0, 30),
          as: +a.score || 0,
        };
      }).filter(g => g.h && g.a).slice(0, 12);
      if (games.length) {
        console.log(`footy: ${league} — ${games.length} fixtures`);
        return { league, games };
      }
    } catch (e) { console.error(`espn ${slug}: ${e.message}`); }
  }
  return salvage("FOOTY");
}
const footySane = f => f && f.league && Array.isArray(f.games) && f.games.length &&
  f.games.every(g => g.h && g.a && Number.isFinite(g.hs) && Number.isFinite(g.as));

// ── Thai lottery: the GLO draw, 1st and 16th of the month ────────────────────

async function fetchLotto() {
  try {
    const r = await fetch("https://www.glo.or.th/api/lottery/getLatestLottery", {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "Mozilla/5.0 (soisanuk news baker)" },
      body: "{}",
    });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = (await r.json()).response;
    const num = k => ((j.data[k] || {}).number || []).map(n => n.value);
    const out = {
      date: j.date,
      first: num("first")[0],
      last2: num("last2")[0],
      front3: num("last3f"),
      back3: num("last3b"),
    };
    console.log(`lotto: draw ${out.date} — first prize ${out.first}`);
    return out;
  } catch (e) { console.error(`glo: ${e.message}`); }
  return salvage("LOTTO");
}
const lottoSane = l => l && /^\d{6}$/.test(l.first || "") && /^\d{2}$/.test(l.last2 || "");

// ── Gold: XAU/oz, converted to Thai baht-weight (15.244 g of 96.5%) ──────────

async function fetchGold(thbPerUsd) {
  try {
    const r = await fetch("https://api.gold-api.com/price/XAU");
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    const usd = +j.price;
    const out = { usd: Math.round(usd), date: String(j.updatedAt || "").slice(0, 10) };
    if (thbPerUsd) {
      out.baht = Math.round(usd * (15.244 / 31.1035) * 0.965 * thbPerUsd / 50) * 50;
    }
    console.log(`gold: $${out.usd}/oz` + (out.baht ? ` · ฿${out.baht}/baht-weight` : ""));
    return out;
  } catch (e) { console.error(`gold-api: ${e.message}`); }
  return salvage("GOLD");
}
const goldSane = g => g && g.usd > 500 && g.usd < 20000 &&
  (!g.baht || (g.baht > 10000 && g.baht < 500000));

// ── Bitcoin: for the laser-eyed man at the end of the rail ───────────────────

async function fetchBtc() {
  try {
    const r = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=thb,usd");
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const j = await r.json();
    const out = { usd: Math.round(j.bitcoin.usd), thb: Math.round(j.bitcoin.thb) };
    console.log(`btc: $${out.usd} · ฿${out.thb}`);
    return out;
  } catch (e) { console.error(`coingecko: ${e.message}`); }
  return salvage("BTC");
}
const btcSane = b => b && b.usd > 1000 && b.usd < 10000000 && b.thb > 30000;

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

const footy = await fetchFooty();
const lotto = await fetchLotto();
const gold = await fetchGold(fx && fx.USD > 1 && fx.USD < 500 ? fx.USD : 0);
const btc = await fetchBtc();

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
    : "") +
  (footySane(footy)
    ? "// the bar TV's one true channel\n" +
      "var FOOTY = " + JSON.stringify(footy) + ";\n"
    : "") +
  (lottoSane(lotto)
    ? "// GLO draw — the girls' retirement plan\n" +
      "var LOTTO = " + JSON.stringify(lotto) + ";\n"
    : "") +
  (goldSane(gold)
    ? "// XAU, plus Thai baht-weight gold (96.5%)\n" +
      "var GOLD = " + JSON.stringify(gold) + ";\n"
    : "") +
  (btcSane(btc)
    ? "// the coin, for the laser-eyed regular\n" +
      "var BTC = " + JSON.stringify(btc) + ";\n"
    : "");

if (body === previous) {
  console.log("headlines unchanged");
} else {
  writeFileSync(OUT, body);
  console.log(`baked ${feed.length} headlines → web/js/news-data.js`);
}
