// Session commands (QUIT / END / LOGOUT and RESET) live in main.js, not the
// engine — they touch localStorage and the boot flow, so the vm suite can't reach
// them. This drives the real page: signs off, confirms a save wipe, and checks
// that QUIT concedes a live mini-game instead of signing off.
import { test, expect } from "@playwright/test";

const INDEX_URL = new URL("../../web/index.html", import.meta.url).href;
const SAVE_KEY = "lbb_save";

const send = async (page, cmd) => {
  await page.fill("#term-in", cmd);
  await page.press("#term-in", "Enter");
};

test("QUIT / END / LOGOUT sign off without wiping the save", async ({ page }) => {
  const errs = [];
  page.on("pageerror", e => errs.push(e.message));
  await page.goto(INDEX_URL);
  await expect(page.locator("#term-out")).toContainText(/\S/, { timeout: 5000 });

  await send(page, "look"); // a real command so a save exists
  const saved = await page.evaluate(k => localStorage.getItem(k), SAVE_KEY);
  expect(saved).toBeTruthy();

  await send(page, "quit");
  await expect(page.locator("#term-out")).toContainText(/roars on without you/i);
  await expect(page.locator("#term-out")).toContainText(/night is saved/i);
  // sign-off must NOT clear the save
  expect(await page.evaluate(k => localStorage.getItem(k), SAVE_KEY)).toBeTruthy();

  for (const w of ["end", "logout"]) {
    await send(page, w);
    await expect(page.locator("#term-out")).toContainText(/roars on without you/i);
  }
  expect(errs).toEqual([]);
});

test("RESET warns first, then wipes the save on confirmation", async ({ page }) => {
  await page.goto(INDEX_URL);
  await expect(page.locator("#term-out")).toContainText(/\S/, { timeout: 5000 });
  await send(page, "look");

  // first RESET only warns — the save survives
  await send(page, "reset");
  await expect(page.locator("#term-out")).toContainText(/erases your saved game/i);
  expect(await page.evaluate(k => localStorage.getItem(k), SAVE_KEY)).toBeTruthy();

  // cancelling leaves it alone
  await send(page, "look");
  await expect(page.locator("#term-out")).toContainText(/Reset cancelled/i);
  expect(await page.evaluate(k => localStorage.getItem(k), SAVE_KEY)).toBeTruthy();

  // confirmed reset wipes the old save and drops you on a fresh night
  await send(page, "reset");
  await send(page, "yes");
  await expect(page.locator("#term-out")).toContainText(/Slate wiped/i);
  const day = await page.evaluate(() => G.day);
  expect(day).toBe(2); // the opening night (day 2 of the trip), records cleared
  expect(await page.evaluate(() => G.act1Best || 0)).toBe(0);
});

test("QUIT concedes a live mini-game instead of signing off", async ({ page }) => {
  await page.goto(INDEX_URL);
  await expect(page.locator("#term-out")).toContainText(/\S/, { timeout: 5000 });
  // drop into a Connect 4 game, then QUIT — should end the game, not the session
  await page.evaluate(() => { _setFlag("act1Done"); G.room = "dollhouse"; G.game = { type: "c4", board: c4New() }; });
  await send(page, "quit");
  expect(await page.evaluate(() => G.game)).toBeNull();
  await expect(page.locator("#term-out")).not.toContainText(/roars on without you/i);
});
