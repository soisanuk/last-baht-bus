// The notes row — the frontier rendered as taps on the scene panel, behind the
// 📓 glyph (a DOM feature the node:vm suite can't reach). The glyph is up once
// the opening is behind you; a tap lights it and the row appears with the
// engine's own commands as chips; tapping a chip submits the typed command.
import { test, expect } from "@playwright/test";
import { bootIntoGame } from "./_helpers.mjs";

const INDEX_URL = new URL("../../web/index.html", import.meta.url).href;

test("the notes glyph shows the frontier as taps, and a tap is a typed command", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));
  await bootIntoGame(page, INDEX_URL);
  const fab = page.locator("#notes-fab");
  await page.evaluate(() => {
    _setFlag("act1Done"); G.stage = "vacation"; G.money = 2000;
    for (const k of Object.keys(ENCOUNTERS)) G.encDone[k] = true; G.lastSaleng = 9e9; G.lastPeddler = 9e9;
    try { localStorage.setItem("lbb_v0_on", "1"); localStorage.setItem("lbb_scene_off", "0"); } catch (e) {}
  });
  await page.fill("#term-in", "look");
  await page.press("#term-in", "Enter");
  await expect(fab).toBeVisible();
  await expect(page.locator("#scene-notes")).toHaveCount(0);
  await fab.click();
  const row = page.locator("#scene-notes");
  await expect(row).toBeVisible();
  const chips = row.locator("button");
  expect(await chips.count()).toBeGreaterThan(1);   // at least one frontier chip plus "the record"
  const first = chips.first();
  const cmd = await first.getAttribute("title");
  expect(cmd).toBeTruthy();
  await first.click();
  await expect(page.locator("#term-out")).toContainText(new RegExp(cmd.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").toLowerCase(), "i"));
  await page.fill("#term-in", "journal");
  await page.press("#term-in", "Enter");
  await expect(page.locator("#term-out")).toContainText(/what is open/);
  await fab.click();
  await expect(page.locator("#scene-notes")).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});
