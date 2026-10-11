// MORE BELOW (round 79, 2026-10-11): a long reply opens at its start — Tan's drop-off speech keeps its
// "this town — you ASK" line — and on a phone nothing said there was more under the fold, so the first
// room sat two screens down unseen (Gary, a cold newcomer on a 375×667 phone). A floating "more ↓" cue
// shows while unread text sits below, reads on a screen at a time, and hides at the end.
import { test, expect } from "@playwright/test";
import { bootIntoGame } from "./_helpers.mjs";

const INDEX_URL = new URL("../../web/index.html", import.meta.url).href;
test.use({ viewport: { width: 375, height: 667 }, hasTouch: true, isMobile: true });

test("a long reply shows 'more ↓', tapping it reads on, and it hides at the end", async ({ page }) => {
  await bootIntoGame(page, INDEX_URL);
  await page.fill("#term-in", "help more");
  await page.press("#term-in", "Enter");
  const more = page.locator("#more-below");
  await expect(more).toBeVisible();
  for (let i = 0; i < 40 && await more.isVisible(); i++) await more.click();
  await expect(more).toBeHidden();
  const left = await page.evaluate(() => { const o = document.getElementById("term-out"); return o.scrollHeight - o.clientHeight - o.scrollTop; });
  expect(left).toBeLessThan(40);
});

test("a short reply leaves no cue", async ({ page }) => {
  await bootIntoGame(page, INDEX_URL);
  await page.fill("#term-in", "time");
  await page.press("#term-in", "Enter");
  await expect(page.locator("#more-below")).toBeHidden();
});
