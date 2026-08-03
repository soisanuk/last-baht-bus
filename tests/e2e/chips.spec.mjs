// Browser test for the context chip bar — the layer the node:vm suite can't
// reach. The vm tests cover _chipSet()'s logic; this proves the chips actually
// render into #chips in the real DOM, re-render to match context, and that a
// click round-trips (bare chip submits; a "…" chip prefills the input).
import { test, expect } from "@playwright/test";
import { bootIntoGame } from "./_helpers.mjs";

const INDEX_URL = new URL("../../web/index.html", import.meta.url).href;

test("chips render on boot, re-render by context, and clicks act", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));
  await bootIntoGame(page, INDEX_URL);

  const chips = page.locator("#chips .chip");
  // through the mode menu into a live game → real context chips
  await expect(chips.first()).toBeVisible({ timeout: 5000 });
  expect(await chips.count()).toBeGreaterThan(0);
  // the opening room always offers LOOK and the utility chips
  await expect(page.locator('#chips .chip', { hasText: /^look$/ })).toBeVisible();

  // A bare chip submits: click LOOK, it echoes like a typed command.
  await page.locator('#chips .chip', { hasText: /^look$/ }).click();
  await expect(page.locator("#term-out")).toContainText("❯ look");

  // Context-aware: drop the player into a girl bar and re-render — bar verbs appear.
  await page.evaluate(() => {
    const bar = Object.keys(ROOMS).find(id => {
      G.room = id;
      return !!ROOMS[id].barType && _npcsHere().some(n => NPC_ROLES[n] === "hostess");
    });
    G.room = bar;
    _term.renderChips();
  });
  const flirt = page.locator('#chips .chip', { hasText: /^flirt…$/ });
  await expect(flirt).toBeVisible();

  // A "…" chip prefills the input and waits for an object (no submit).
  await flirt.click();
  await expect(page.locator("#term-in")).toHaveValue("flirt ");

  // Mid-minigame, the chips collapse to the game's own moves + quit.
  await page.evaluate(() => { G.game = { type: "c4", board: c4New() }; _term.renderChips(); });
  await expect(page.locator('#chips .chip', { hasText: /^quit$/ })).toBeVisible();
  await expect(page.locator('#chips .chip', { hasText: /^look$/ })).toHaveCount(0);

  expect(pageErrors).toEqual([]);
});

test("chip labels localise to German while the submitted command stays English", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));
  await bootIntoGame(page, INDEX_URL);

  // flip to German and re-render the room's chips
  await page.evaluate(() => { G.player.lang = "de"; _term.renderChips(); });

  // the LOOK chip now DISPLAYS "Umsehen" — but carries the English command
  const look = page.locator('#chips .chip', { hasText: /^Umsehen$/ });
  await expect(look).toBeVisible();
  await expect(look).toHaveAttribute("data-cmd", "look");
  await expect(page.locator('#chips .chip', { hasText: /^look$/ })).toHaveCount(0);

  // clicking it runs the English command (echoes "❯ look")
  await look.click();
  await expect(page.locator("#term-out")).toContainText("❯ look");

  expect(pageErrors).toEqual([]);
});
