// The bar bell FAB — a DOM/visibility feature the node:vm suite can't reach.
// It appears only while you're in a bar (term.js toggles .show via _inBar),
// taps to ring with no keyboard, and the ring fires the synthesized clang
// through the engine's sfx hook. Driven from file:// in headless Chromium.
// Globals are lexical (top-level let/const), so page.evaluate reads G/_audio
// as bare identifiers, not window.*.
import { test, expect } from "@playwright/test";

const INDEX_URL = new URL("../../web/index.html", import.meta.url).href;

test("bar bell FAB: hidden outside bars, taps to ring inside, clang fires", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));
  await page.goto(INDEX_URL);
  await page.waitForSelector("#term-in");

  const fab = page.locator("#bell-fab");
  await expect(fab).toBeHidden(); // Act One opens on the beach — no bar, no bell

  // step into a bar; a command refreshes visibility
  await page.evaluate(() => { G.room = "neon_paradise"; G.money = 2000; });
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
