// The daily challenge + share card — the DOM half the vm suite can't reach:
// the TODAY'S SOI button seeds the week from the real calendar date (the
// frontend hands the date string to the clock-free engine), and SHARE both
// prints the week card and drops it on the clipboard. Driven from file:// in
// headless Chromium. Globals are lexical, so page.evaluate reads G bare.
import { test, expect } from "@playwright/test";

const INDEX_URL = new URL("../../web/index.html", import.meta.url).href;

test("TODAY'S SOI seeds the daily; SHARE prints the week card and copies it", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));
  await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(INDEX_URL);

  // fresh boot → mode select → intro panel → TODAY'S SOI
  await page.locator('.start-mode[data-mode="soi6"]').click();
  await expect(page.locator("#start-daily")).toBeVisible();
  await page.locator("#start-daily").click();
  await page.waitForSelector("#term-in");

  // character creation gates a first boot — answer every pick with "1"
  for (let i = 0; i < 8; i++) {
    const inIntro = await page.evaluate(() => typeof G !== "undefined" && G && G.pendingChoice === "intro");
    if (!inIntro) break;
    await page.fill("#term-in", "1");
    await page.press("#term-in", "Enter");
  }

  // the week knows it's the daily: dailyId is today's date, and the seed matches
  const daily = await page.evaluate(() => ({
    id: G.dailyId,
    seeded: G.rng > 0,
    advertised: document.getElementById("term-out").textContent.includes("Today's soi"),
  }));
  // The player's LOCAL calendar day, not UTC — this assertion used to read
  // toISOString(), which is precisely the bug it was guarding: east of Greenwich
  // an evening player pressed "TODAY'S SOI" and got yesterday's date on the card
  // (Vikram, 2026-08-27, from UTC+8; this machine is UTC+7 and reproduces it).
  // Every daily puzzle keys on your own calendar day; so does this one now.
  const n = new Date();
  const today = n.getFullYear() + "-" +
    String(n.getMonth() + 1).padStart(2, "0") + "-" +
    String(n.getDate()).padStart(2, "0");
  expect(daily.id).toBe(today);
  expect(daily.seeded).toBe(true);
  expect(daily.advertised).toBe(true);

  // SHARE prints the card and the frontend copies it
  await page.fill("#term-in", "share");
  await page.press("#term-in", "Enter");
  await expect(page.locator("#term-out")).toContainText("THE LAST BAHT BUS — Soi 6 (daily " + today + ")");
  await expect(page.locator("#term-out")).toContainText("copied to the clipboard");
  const clip = await page.evaluate(() => navigator.clipboard.readText());
  expect(clip).toContain("THE LAST BAHT BUS — Soi 6 (daily " + today + ")");
  expect(clip).toContain("soisanuk.github.io/last-baht-bus");

  expect(pageErrors).toEqual([]);
});
