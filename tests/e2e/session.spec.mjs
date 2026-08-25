// Session commands (QUIT / END / LOGOUT and RESET) live in main.js, not the
// engine — they touch localStorage and the boot flow, so the vm suite can't reach
// them. This drives the real page: signs off, confirms a save wipe, and checks
// that QUIT concedes a live mini-game instead of signing off.
import { test, expect } from "@playwright/test";
import { bootIntoGame } from "./_helpers.mjs";

const INDEX_URL = new URL("../../web/index.html", import.meta.url).href;
const SAVE_KEY = "lbb_save";

const send = async (page, cmd) => {
  await page.fill("#term-in", cmd);
  await page.press("#term-in", "Enter");
};

test("QUIT / END / LOGOUT sign off without wiping the save", async ({ page }) => {
  const errs = [];
  page.on("pageerror", e => errs.push(e.message));
  await bootIntoGame(page, INDEX_URL);

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
  await bootIntoGame(page, INDEX_URL);
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
  // the wipe drops you back to the mode-select menu, and the save is gone
  await expect(page.locator("#start-overlay")).toBeVisible();
  expect(await page.evaluate(k => localStorage.getItem(k), SAVE_KEY)).toBeNull();

  // ...and starting again RE-RUNS character creation — RESET clears the in-memory
  // identity, so the taxi intro fires instead of silently skipping to a room (the bug).
  await page.locator('.start-mode[data-mode="soi6"]').click();
  await page.locator("#start-go").click();
  await expect
    .poll(() => page.evaluate(() => (typeof G !== "undefined" && G) ? G.pendingChoice : null))
    .toBe("intro");
});

test("QUIT concedes a live mini-game instead of signing off", async ({ page }) => {
  await bootIntoGame(page, INDEX_URL);
  // drop into a Connect 4 game, then QUIT — should end the game, not the session
  await page.evaluate(() => { _setFlag("act1Done"); G.room = "dollhouse"; G.game = { type: "c4", board: c4New() }; });
  await send(page, "quit");
  expect(await page.evaluate(() => G.game)).toBeNull();
  await expect(page.locator("#term-out")).not.toContainText(/roars on without you/i);
});

// The night you stepped away from. "NO — start fresh" on the continue prompt is
// the highest-consequence tap in the product and the only unguarded one — on a
// 390px bar it sits beside the button the player wants, and for a burst player
// that screen IS the main menu (mobile playtest, round 17). It never deleted
// anything immediately (the old blob only dies when the next game autosaves), so
// this uses the window that already existed rather than taxing every deliberate
// fresh start with a confirmation.
test("a mis-tapped NO can be taken back, and starting a night lets it go", async ({ page }) => {
  const errs = [];
  page.on("pageerror", e => errs.push(e.message));
  await bootIntoGame(page, INDEX_URL);
  await send(page, "look");
  const before = await page.evaluate(k => localStorage.getItem(k), SAVE_KEY);
  expect(before).toBeTruthy();

  // come back to the continue prompt and mis-tap NO
  await page.reload();
  await page.waitForSelector("#term-in");
  await send(page, "no");
  const shelved = await page.evaluate(() => localStorage.getItem("lbb_shelved"));
  expect(shelved, "NO shelves the night rather than dropping it").toBe(before);
  await expect(page.locator("#term-out")).toContainText(/is still here/i);

  // take it back
  await send(page, "unshelve");
  await expect(page.locator("#term-out")).toContainText(/PICKED BACK UP/);
  const after = await page.evaluate(k => localStorage.getItem(k), SAVE_KEY);
  expect(JSON.parse(after).day, "the same night, restored").toBe(JSON.parse(before).day);
  expect(await page.evaluate(() => localStorage.getItem("lbb_shelved")),
    "the shelf is consumed once taken back").toBeNull();

  // …and a second UNSHELVE has nothing to reach
  await send(page, "unshelve");
  await expect(page.locator("#term-out")).toContainText(/no night set aside/i);
  expect(errs).toEqual([]);
});
