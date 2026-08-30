// The bar bell FAB — a DOM/visibility feature the node:vm suite can't reach.
// It appears only while you're in a bar (term.js toggles .show via _inBar),
// taps to ring with no keyboard, and the ring fires the synthesized clang
// through the engine's sfx hook. Driven from file:// in headless Chromium.
// Globals are lexical (top-level let/const), so page.evaluate reads G/_audio
// as bare identifiers, not window.*.
import { test, expect } from "@playwright/test";
import { bootIntoGame } from "./_helpers.mjs";

const INDEX_URL = new URL("../../web/index.html", import.meta.url).href;

test("bar bell FAB: hidden outside bars, taps to ring inside, clang fires", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));
  await bootIntoGame(page, INDEX_URL);

  const fab = page.locator("#bell-fab");
  await expect(fab).toBeHidden(); // Soi 6 opens in the Queen Vic room — no bar, no bell

  // step into a bar; a command refreshes visibility. Push the saleng/peddler
  // cooldowns far out so a random encounter can't spawn on the LOOK/ring ticks
  // and swallow "ring bell" as its snap reaction (the flake this guards).
  await page.evaluate(() => {
    G.room = "neon_paradise"; G.money = 2000;
    G.lastSaleng = 9e9; G.lastPeddler = 9e9;
  });
  await page.fill("#term-in", "look");
  await page.press("#term-in", "Enter");
  await expect(fab).toBeVisible();

  // spy on the sfx hook, then tap the bell — no keyboard
  await page.evaluate(() => {
    window.__sfx = [];
    const orig = _audio.sfx.bind(_audio);
    _audio.sfx = n => { window.__sfx.push(n); return orig(n); };
  });
  await fab.click();
  await expect(page.locator("#term-out")).toContainText(/RING THE BELL/i);
  expect(await page.evaluate(() => window.__sfx.includes("bell"))).toBe(true);

  // leaving the bar hides it again
  await page.evaluate(() => { G.room = "jomtien_beach"; });
  await page.fill("#term-in", "look");
  await page.press("#term-in", "Enter");
  await expect(fab).toBeHidden();

  expect(pageErrors).toEqual([]);
});

// The bell FAB is fixed at the transcript's right edge and used to overlap
// whatever text happened to reach that column — not just at the very bottom
// (a vertical reserve already existed) but at ANY height, since a single long
// print can fit inside #term-out without ever needing to scroll (Reg the
// publican, round 32, 2026-08-30: the bell clipped a word dead in the middle
// of a long closing narration). A permanent right-padding reserve, sized to
// the fab stack, should keep every line of text clear of it geometrically.
test("the bell FAB never overlaps transcript text, at any scroll height", async ({ page }) => {
  await bootIntoGame(page, INDEX_URL);
  await page.evaluate(() => {
    G.room = "neon_paradise"; G.money = 2000;
    G.lastSaleng = 9e9; G.lastPeddler = 9e9;
  });
  // print a long block that fills the transcript without triggering a real
  // scroll requirement — the exact shape of Reg's find
  await page.evaluate(() => {
    for (let i = 0; i < 15; i++) _say("A long line of prose, long enough to reach the right edge of the transcript column and wrap onto the next one, over and over. Line " + i + ".");
    _term.updateFabs();
  });
  await expect(page.locator("#bell-fab")).toBeVisible();

  const fabBox = await page.locator("#bell-fab").boundingBox();
  const lineBoxes = await page.locator("#term-out .t-line").evaluateAll(
    els => els.map(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height }; })
  );
  const overlaps = (a, b) =>
    a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  const collisions = lineBoxes.filter(b => overlaps(fabBox, { x: b.x, y: b.y, width: b.w, height: b.h }));
  expect(collisions, `fab at ${JSON.stringify(fabBox)} overlaps ${collisions.length} line(s)`).toEqual([]);
});
