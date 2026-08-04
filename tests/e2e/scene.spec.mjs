// The v0 scene panel is pure presentation, unreachable from the vm suite — this
// spec is its DOM canary: the panel renders from live G, tracks a move, taps
// submit real typed commands, and the collapse pref sticks. file:// + headless
// Chromium; globals are lexical, so page.evaluate reads G as a bare name.
import { test, expect } from "@playwright/test";
import { bootIntoGame } from "./_helpers.mjs";

const INDEX_URL = new URL("../../web/index.html", import.meta.url).href;

test("scene panel renders, tracks movement, and exit taps submit typed commands", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));
  await bootIntoGame(page, INDEX_URL);

  await expect(page.locator("#scene")).toBeVisible();
  // cast row mirrors who's actually present
  const expected = await page.evaluate(() => _npcsHere().length + _patronsHere().length);
  await expect(page.locator("#scene-cast .bust")).toHaveCount(expected);
  // HUD shows live money (format the expectation in-page so the locale matches)
  const moneyStr = await page.evaluate(() => "฿" + (G.money || 0).toLocaleString());
  await expect(page.locator("#scene-hud")).toContainText(moneyStr);

  // an exit tap echoes as a typed command and moves the player
  const before = await page.evaluate(() => G.room);
  await page.locator("#scene-exits button").first().click();
  await expect(async () => {
    expect(await page.evaluate(() => G.room)).not.toBe(before);
  }).toPass();
  // the tap went through the transcript (tap-echo invariant) — echo() prefixes
  // every line with the "❯ " prompt glyph (term.js), so match past it
  await expect(page.locator("#term-out .t-echo").last()).toContainText(/^❯ go /);

  // a bust tap opens the character wheel with a portrait header
  await page.locator("#scene-cast .bust").first().click();
  await expect(page.locator("#flyout")).toBeVisible();
  await page.keyboard.press("Escape");

  // collapse pref sticks across the toggle
  await page.locator("#scene-toggle").click();
  await expect(page.locator("#scene.collapsed")).toHaveCount(1);

  expect(pageErrors).toEqual([]);
});
