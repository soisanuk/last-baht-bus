// The message FAB — a DOM/visibility feature the node:vm suite can't reach.
// It appears whenever a text is unread (term.js toggles .show via _unreadCount),
// taps to run CHECK MESSAGES (which prints the texts and marks them read, so the
// glyph hides itself), and shares the top-right stack with the bar bell so both
// can show at once — a text at the bar. Driven from file:// in headless Chromium.
// Globals are lexical, so page.evaluate reads G as a bare identifier.
import { test, expect } from "@playwright/test";

const INDEX_URL = new URL("../../web/index.html", import.meta.url).href;

test("message FAB: hidden with no texts, shows on unread, taps to read, then hides", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));
  await page.goto(INDEX_URL);
  await page.waitForSelector("#term-in");

  const msg = page.locator("#msg-fab");
  await expect(msg).toBeHidden(); // fresh night, empty inbox

  // a text lands in the inbox; a command refreshes the FABs
  await page.evaluate(() => {
    G.phone.lastText = 9e9; // suppress fresh incoming-text rolls during the test
    G.phone.inbox = [{ from: "noi", text: "where are you na", turn: 5, read: false }];
  });
  await page.fill("#term-in", "look");
  await page.press("#term-in", "Enter");
  await expect(msg).toBeVisible();

  // tap it — no keyboard: the text prints and it's marked read
  await msg.click();
  await expect(page.locator("#term-out")).toContainText(/where are you na/);
  await expect(msg).toBeHidden(); // read → count 0 → glyph gone
  expect(await page.evaluate(() => G.phone.inbox[0].read)).toBe(true);

  expect(pageErrors).toEqual([]);
});

test("message FAB and bell FAB coexist — a text at the bar shows both", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));
  await page.goto(INDEX_URL);
  await page.waitForSelector("#term-in");

  await page.evaluate(() => {
    G.room = "neon_paradise"; G.money = 2000;          // a bar → the bell shows
    G.phone.lastText = 9e9;
    G.phone.inbox = [{ from: "candy", text: "come see me", turn: 3, read: false }];
  });
  await page.fill("#term-in", "look");
  await page.press("#term-in", "Enter");

  // both glyphs live in the top-right stack at the same time
  await expect(page.locator("#bell-fab")).toBeVisible();
  await expect(page.locator("#msg-fab")).toBeVisible();
  // and they don't overlap: the message sits below the bell in the flex column
  const bell = await page.locator("#bell-fab").boundingBox();
  const message = await page.locator("#msg-fab").boundingBox();
  expect(message.y).toBeGreaterThan(bell.y + bell.height - 1);

  expect(pageErrors).toEqual([]);
});
