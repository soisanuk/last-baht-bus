// The second page, said out loud (Yusuf, round 68): a quick tap on a lit word opens a short menu
// and a long-press the full one, and nothing told a thumb the second existed. The short menu now
// ends in "more… (n)" whenever the full one holds more, and the first time it appears one line
// mentions the hold. Asserted with taps only — no long-press, no right-click, no keyboard.
import { test, expect } from "@playwright/test";
import { bootIntoGame } from "./_helpers.mjs";

const INDEX_URL = new URL("../../web/index.html", import.meta.url).href;

test("a thumb reaches the full menu: the short one ends in 'more…', and it opens the rest", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));
  await bootIntoGame(page, INDEX_URL);
  await page.evaluate(() => { try { localStorage.removeItem("lbb_more_tip"); } catch (e) {} });
  await page.evaluate(() => { G.mode = "full"; G.room = "windmill"; G.visited.windmill = true; G.flags.act1Done = true; G.stage = "vacation"; });
  await page.fill("#term-in", "look");
  await page.press("#term-in", "Enter");

  const name = page.locator("#term-out .kw[data-k='npc']").last();
  await expect(name).toBeVisible();
  await name.click();                                         // a quick tap
  const more = page.locator("#flyout button.fly-more");
  await expect(more).toBeVisible();
  await expect(more).toHaveText(/^more… \(\d+\)$/);
  const shortCount = await page.locator("#flyout button").count();

  // the first time, one line says the hold exists too — and only the first time
  await expect(page.locator("#term-out .t-line").last()).toContainText("hold the word");

  await more.click();                                         // the second page, by tap
  await expect(page.locator("#flyout button.fly-more")).toHaveCount(0);
  expect(await page.locator("#flyout button").count()).toBeGreaterThan(shortCount - 1);

  // close and tap again: no second tip
  await page.mouse.click(5, 5);
  const lines = await page.locator("#term-out .t-line").count();
  await name.click();
  await expect(page.locator("#flyout button.fly-more")).toBeVisible();
  expect(await page.locator("#term-out .t-line").count()).toBe(lines);

  expect(pageErrors).toEqual([]);
});
