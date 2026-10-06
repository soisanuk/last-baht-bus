// The text-size control (docs/voice-narration.md's first lever): the Aa FAB
// steps body font-size 15 → 17 → 19 → 21 and stops at each end, persists in localStorage
// (lbb_font_px), and must scale ONLY the reading surfaces — the prose and the
// input inherit body, while the rem-based chrome (header, the ASCII map's
// clamp) never moves. Pure presentation, so the vm suite can't see it; this
// spec is its only coverage. Driven from file:// in headless Chromium.
import { test, expect } from "@playwright/test";
import { bootIntoGame } from "./_helpers.mjs";

const INDEX_URL = new URL("../../web/index.html", import.meta.url).href;

test("text size: A+ and A− step, persist across reload, stop at both ends, and leave the chrome alone", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));
  await bootIntoGame(page, INDEX_URL);

  const up = page.locator("#font-up"), down = page.locator("#font-down");
  await expect(up).toBeVisible(); // always-on furniture, unlike the bell
  await expect(down).toBeDisabled(); // nothing smaller than standard

  const bodyPx = () => page.evaluate(() =>
    parseFloat(getComputedStyle(document.body).fontSize));
  const headerPx = () => page.evaluate(() =>
    parseFloat(getComputedStyle(document.querySelector("header .sub")).fontSize));

  expect(await bodyPx()).toBe(15);          // the default
  const chromeBefore = await headerPx();    // rem-based — must not move

  // the typed path — same unsurfaced treatment as the display toggles. (Do it
  // BEFORE the reload below: the continue-prompt captures typed input after.)
  await page.evaluate(() => _dispatch("font"));
  expect(await bodyPx()).toBe(17);

  await up.click();
  expect(await bodyPx()).toBe(19);
  expect(await headerPx()).toBe(chromeBefore); // chrome untouched at any size
  await expect(page.locator("#term-out")).toContainText("Text size: larger");

  // persists: reload and the saved size re-applies at boot
  expect(await page.evaluate(() => localStorage.getItem("lbb_font_px"))).toBe("19");
  await page.reload();
  await page.waitForFunction(() => typeof G !== "undefined");
  expect(await bodyPx()).toBe(19);

  // stops at largest instead of wrapping (round 65) — the button works even while
  // the continue-prompt is up (it bypasses _dispatch)
  await up.click();
  expect(await bodyPx()).toBe(21);
  await expect(up).toBeDisabled();
  await page.evaluate(() => _stepFontSize(1));   // a stray extra step changes nothing
  expect(await bodyPx()).toBe(21);
  await down.click();
  expect(await bodyPx()).toBe(19);

  expect(pageErrors).toEqual([]);
});
