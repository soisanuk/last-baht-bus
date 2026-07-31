// The photo gallery is a rendering feature the node:vm suite can't reach: term.js
// swaps the emoji on gallery rows and on a texted-selfie line for the real portrait
// PNG (the _addAvatars pass, extended to the "Gallery — " and "📷 " prefixes). The
// engine logic (collecting, the pay-per-photo drip) is covered in the vm suite; this
// spec is the DOM canary — the portraits actually render. Driven from file:// in
// headless Chromium; globals are lexical, so page.evaluate reads G as a bare name.
import { test, expect } from "@playwright/test";
import { bootIntoGame } from "./_helpers.mjs";

const INDEX_URL = new URL("../../web/index.html", import.meta.url).href;

test("a texted selfie renders her portrait inline in the message thread", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));
  await bootIntoGame(page, INDEX_URL);

  // her pic3 caption maps to a distinct generated frame (portraits/pics/wilai_pic3.png)
  const cap = "you want see the back?? 😏 turn around just for you 👙🍑 Ruby red";
  await page.evaluate((cap) => {
    G.battery = 90; G.phone.lastText = 9e9;         // suppress fresh incoming rolls
    G.phone.contacts.wilai = true;
    G.phone.inbox = [{ from: "wilai", text: "", turn: 5, read: false, gives: 0,
      fromName: null, photo: cap }];
  }, cap);
  await page.fill("#term-in", "check messages");
  await page.press("#term-in", "Enter");

  const img = page.locator("#term-out .t-line", { hasText: "see the back" }).locator("img");
  await expect(img).toHaveCount(1);
  expect(await img.getAttribute("src")).toMatch(/portraits\/pics\/wilai_pic3\.png/);
  // and the distinct frame actually exists / loaded (not the portrait fallback)
  expect(await img.evaluate(el => el.naturalWidth)).toBeGreaterThan(0);

  expect(pageErrors).toEqual([]);
});

test("the gallery renders a portrait per collected photo", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));
  await bootIntoGame(page, INDEX_URL);

  const wilaiCap = "you want see the back?? 😏 turn around just for you 👙🍑 Ruby red";
  await page.evaluate((wilaiCap) => {
    G.battery = 90;
    G.known.gift = true; G.known.wilai = true;
    // a snapped portrait + a distinct paid-pic frame
    G.phone.photos = [{ id: "gift", turn: 1 }, { id: "wilai", cap: wilaiCap, turn: 2 }];
  }, wilaiCap);
  await page.fill("#term-in", "gallery");
  await page.press("#term-in", "Enter");

  const gal = page.locator("#term-out .t-line", { hasText: "Gallery — 2 photos" });
  await expect(gal).toBeVisible();
  const imgs = gal.locator("img");
  await expect(imgs).toHaveCount(2);
  // the portrait row uses the bust; the paid-pic row uses its distinct frame
  const srcs = await imgs.evaluateAll(els => els.map(e => e.getAttribute("src")));
  expect(srcs.some(s => /portraits\/gift\.png/.test(s))).toBe(true);
  expect(srcs.some(s => /portraits\/pics\/wilai_pic3\.png/.test(s))).toBe(true);

  expect(pageErrors).toEqual([]);
});
