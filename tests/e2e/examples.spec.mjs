// THE EXAMPLES MODAL (Mario, 2026-10-18): a line the game can't read gets a plain warning; three in a row open a
// card of commands that work where you stand, and tapping one runs it. Typing anything instead closes it.
import { test, expect } from "@playwright/test";
import { bootIntoGame } from "./_helpers.mjs";

const INDEX_URL = new URL("../../web/index.html", import.meta.url).href;
const say = async (page, c) => { await page.fill("#term-in", c); await page.press("#term-in", "Enter"); };

test("three unreadable lines open the examples; a tap runs one and closes the card", async ({ page }) => {
  await bootIntoGame(page, INDEX_URL);
  const ov = page.locator("#ex-overlay");
  await say(page, "flibber wobble");
  await expect(page.locator(".t-warn").last()).toContainText(/didn't (understand|parse)/);
  await say(page, "zzk qq");
  await expect(ov).toBeHidden();
  await say(page, "qq zzk blorp");
  await expect(ov).toBeVisible();
  const btn = ov.locator("li button").first();
  const cmd = (await btn.textContent()).trim().toLowerCase();
  await btn.click();
  await expect(ov).toBeHidden();
  await expect(page.locator(".t-echo").last()).toContainText(cmd);
});

test("typing a command instead closes the card", async ({ page }) => {
  await bootIntoGame(page, INDEX_URL);
  for (const c of ["flibber", "wobble wobble", "zzk"]) await say(page, c);
  await expect(page.locator("#ex-overlay")).toBeVisible();
  await say(page, "look");
  await expect(page.locator("#ex-overlay")).toBeHidden();
});
