// TOGGLE FULL — the hidden switch that unlocks THE FULL GAME on the splash.
// The full coast is built and playable, but it is not what a new player should
// be handed first, so the button ships disabled and this is the key to it.
// Browser-only by nature: the pref is localStorage and the gate is a DOM
// attribute, neither of which the vm suite can see.
import { test, expect } from "@playwright/test";

const INDEX_URL = new URL("../../web/index.html", import.meta.url).href;

test("THE FULL GAME is locked by default and TOGGLE FULL unlocks it", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));
  await page.goto(INDEX_URL);
  await page.evaluate(() => localStorage.clear());
  await page.reload();

  const full = page.locator('#start-menu .start-mode[data-mode="full"]');
  await expect(full).toBeVisible();
  await expect(full).toBeDisabled();
  await expect(full).toContainText(/Coming soon/);

  // the switch is typed at the prompt, so get into the game first
  await page.locator('#start-menu .start-mode[data-mode="soi6"]').click();
  await page.locator("#start-go").click();
  await page.fill("#term-in", "toggle full");
  await page.press("#term-in", "Enter");
  await expect(page.locator("#term-out")).toContainText(/FULL GAME on the start menu: UNLOCKED/);

  // back to the menu — the unlock is applied when the splash is shown again
  await page.evaluate(() => _showStartMenu());
  await expect(full).toBeEnabled();
  await expect(full).toContainText(/Day two of seven/);

  // and it survives a reload, because the pref is not in the save
  await page.reload();
  await expect(page.locator('#start-menu .start-mode[data-mode="full"]')).toBeEnabled();
  expect(pageErrors).toEqual([]);
});

test("picking THE FULL GAME starts the vacation, not the Soi 6 week", async ({ page }) => {
  await page.goto(INDEX_URL);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem("lbb_full_on", "1"); });
  await page.reload();

  await page.locator('#start-menu .start-mode[data-mode="full"]').click();

  // it must NOT route through the Soi 6 intro panel — that panel says
  // "SOI 6 · ONE WEEK" and would be a lie over the full game
  await expect(page.locator("#start-intro")).toBeHidden();
  await expect(page.locator("#start-overlay")).toBeHidden();

  // the full game is the ordinary vacation: mode is not soi6, and the opening
  // is the taxi in from the airport
  const mode = await page.evaluate(() => G.mode);
  expect(mode).not.toBe("soi6");
  await expect(page.locator("#term-out")).toContainText(/Tan|taxi|airport/i);
});
