// The news pipeline contract: the baked file is valid, inert, sane data; the
// engine reads it as flavor and works identically without it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const src = f => readFileSync(
  fileURLToPath(new URL(`../../web/js/${f}`, import.meta.url)), "utf8");

test("news-data.js is a valid classic script defining a sane NEWS_FEED", () => {
  const ctx = vm.createContext({});
  vm.runInContext(src("news-data.js"), ctx);
  const feed = vm.runInContext("NEWS_FEED", ctx);
  assert.ok(Array.isArray(feed) && feed.length >= 3, "at least a few headlines");
  for (const h of feed) {
    assert.equal(typeof h.t, "string");
    assert.ok(h.t.length > 10 && h.t.length <= 140, `headline length: ${h.t}`);
    assert.ok(!/[<>`\\]/.test(h.t + h.s), "sanitized — no markup-ish characters");
  }
});

test("FX_RATES, when baked, carry plausible baht rates for the big four", () => {
  const ctx = vm.createContext({});
  vm.runInContext(src("news-data.js"), ctx);
  const fx = vm.runInContext("typeof FX_RATES === 'undefined' ? null : FX_RATES", ctx);
  if (!fx) return; // a bake without rates is legal — the engine degrades
  for (const c of ["USD", "AUD", "GBP", "EUR"]) {
    assert.equal(typeof fx[c], "number", `${c} present`);
    assert.ok(fx[c] > 1 && fx[c] < 500, `${c} = ${fx[c]} baht — plausible`);
  }
});

test("WX_NOW, when baked, carries plausible Pattaya conditions", () => {
  const ctx = vm.createContext({});
  vm.runInContext(src("news-data.js"), ctx);
  const wx = vm.runInContext("typeof WX_NOW === 'undefined' ? null : WX_NOW", ctx);
  if (!wx) return; // a bake without weather is legal — the engine degrades
  assert.ok(wx.temp > 5 && wx.temp < 50, `temp ${wx.temp}° — plausible`);
  assert.ok(wx.humid >= 0 && wx.humid <= 100, `humidity ${wx.humid}%`);
  assert.ok(wx.rain >= 0 && wx.rain <= 100, `rain chance ${wx.rain}%`);
  assert.equal(typeof wx.code, "number", "WMO weather code present");
});

test("engine: TV and paper read the feed when present, degrade without it", () => {
  // context WITHOUT news-data.js — the vm-test environment and file:// both
  const ctx = vm.createContext({});
  for (const f of ["thai.js", "world.js", "games.js", "engine.js"]) {
    vm.runInContext(src(f), ctx);
  }
  const out = [];
  ctx.__out = t => out.push(t);
  vm.runInContext(`
    engineInit(t => __out(t));
    newGame();
    G.room = "candy_bar";
    doCommand("watch tv");
    doCommand("read paper");
    doCommand("weather");
  `, ctx);
  assert.match(out.join("\n"), /muay thai highlights/i, "TV fallback");
  assert.match(out.join("\n"), /crossword someone's already ruined/i, "paper fallback");
  assert.match(out.join("\n"), /shows you yesterday/i, "weather app fallback");

  // same engine WITH a feed injected (as index.html's script order provides)
  const ctx2 = vm.createContext({});
  vm.runInContext(src("news-data.js"), ctx2);
  for (const f of ["thai.js", "world.js", "games.js", "engine.js"]) {
    vm.runInContext(src(f), ctx2);
  }
  const out2 = [];
  ctx2.__out = t => out2.push(t);
  vm.runInContext(`
    engineInit(t => __out(t));
    newGame();
    G.room = "candy_bar";
    doCommand("watch tv");
    G.room = "beach_rd_c"; // seven: true
    doCommand("read news");
    doCommand("weather");
  `, ctx2);
  const feed = vm.runInContext("NEWS_FEED", ctx2);
  assert.ok(feed.some(h => out2.join("\n").includes(h.t)), "a real headline aired");
  assert.match(out2.join("\n"), /skim the rack/i, "7-Eleven rack variant");
  const fx = vm.runInContext("typeof FX_RATES === 'undefined' ? null : FX_RATES", ctx2);
  if (fx) {
    assert.match(out2.join("\n"), /฿/, "rates printed");
    assert.ok(out2.join("\n").includes(`฿${fx.USD}`), "the dollar rate airs");
  }
  const wx = vm.runInContext("typeof WX_NOW === 'undefined' ? null : WX_NOW", ctx2);
  if (wx) {
    assert.ok(out2.join("\n").includes(`${wx.temp}°`), "the real temperature airs");
    assert.ok(out2.join("\n").includes(`${wx.humid}% humidity`), "humidity airs");
  }
});
