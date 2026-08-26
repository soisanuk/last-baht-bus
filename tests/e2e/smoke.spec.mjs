// Browser smoke test — the one layer the node:vm suite can't reach.
//
// node --test loads the engine into a Node realm and drives it through the
// print callback; it never opens index.html in a browser. This drives the real
// page in headless Chromium: index.html's <script> tags load the five
// engine-*.js parts in order, main.js boots a new game, and a typed command
// round-trips through the DOM. It's deliberately thin — a boot-and-a-command
// canary that catches load-order breakage, a missing script tag, or a boot
// exception. Behavioural depth stays in the node:vm tests.
//
// Runs from file:// on purpose: "works from file://, no server" is a real
// property of this app, so the smoke test proves it rather than serving over
// HTTP. Note `G` is a lexical global (a top-level `let`, not a window property),
// so page.evaluate references it as a bare identifier — same as the vm tests.
import { test, expect } from "@playwright/test";

const INDEX_URL = new URL("../../web/index.html", import.meta.url).href;

test("boots from file:// and round-trips a typed command", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));

  await page.goto(INDEX_URL);

  // A fresh boot shows the mode-select overlay — proof the scripts loaded, main.js
  // ran, and the start menu wired up. Click through it into the Soi 6 game.
  await expect(page.locator("#start-overlay")).toBeVisible({ timeout: 5000 });
  await page.click('.start-mode[data-mode="soi6"]');
  await page.click("#start-go");

  const out = page.locator("#term-out");
  // startSoi6Mode() prints the intro — the terminal populates.
  await expect(out).toContainText(/\S/, { timeout: 5000 });

  // All five engine parts plus the boot wiring actually loaded, in order:
  // newGame lives in engine-core, doCommand/engineComplete in engine-parser.
  const wired = await page.evaluate(() => ({
    hasG: typeof G === "object" && G !== null,
    newGame: typeof newGame,
    doCommand: typeof doCommand,
    engineComplete: typeof engineComplete,
    room: typeof G !== "undefined" && G ? G.room : null,
  }));
  expect(wired).toMatchObject({
    hasG: true,
    newGame: "function",
    doCommand: "function",
    engineComplete: "function",
  });
  expect(wired.room).toBeTruthy();

  // Type a command through the real input and submit with Enter, like a player.
  const before = await out.locator("div").count();
  await page.fill("#term-in", "look");
  await page.press("#term-in", "Enter");

  // It echoes as "❯ look" and the engine prints a response below it.
  await expect(out).toContainText("❯ look");
  expect(await out.locator("div").count()).toBeGreaterThan(before);

  // The wall-clock season seed is the one bit of season wiring the node:vm suite
  // can't reach — it lives in main.js's boot path (_seedSeason reads new Date()).
  // Confirm it fired: G.season0 is the real current month, and WEATHER names it.
  const season = await page.evaluate(() => ({
    season0: G.season0,
    realMonth: new Date().getMonth(),
    tier: _seasonTier(),
  }));
  expect(season.season0).toBe(season.realMonth);
  expect(["peak", "high", "shoulder", "low", "deeplow"]).toContain(season.tier);

  // No uncaught exceptions during boot or the command.
  expect(pageErrors).toEqual([]);
});

test("the scrollback is capped — a long session doesn't grow the DOM without bound", async ({ page }) => {
  await page.goto(INDEX_URL);
  await expect(page.locator("#start-overlay")).toBeVisible({ timeout: 5000 });
  await page.click('.start-mode[data-mode="soi6"]');
  await page.click("#start-go");
  await expect(page.locator("#term-out")).toContainText(/\S/, { timeout: 5000 });

  // Print far past the cap and confirm the transcript window holds steady while
  // the newest line survives and the very first is evicted.
  const result = await page.evaluate(() => {
    _term.print("FIRST_SENTINEL_LINE");
    for (let i = 0; i < 2000; i++) _term.print("filler line " + i);
    _term.print("LAST_SENTINEL_LINE");
    const out = document.getElementById("term-out");
    return {
      count: out.childElementCount,
      hasFirst: out.textContent.includes("FIRST_SENTINEL_LINE"),
      hasLast: out.textContent.includes("LAST_SENTINEL_LINE"),
    };
  });
  expect(result.count).toBeLessThanOrEqual(800);
  expect(result.hasFirst).toBe(false); // the oldest line was trimmed away
  expect(result.hasLast).toBe(true);   // the newest is still there
});
