// THE CONTENT NOTICE (Mario, 2026-10-09, for the public Soi 6 release): a first visit sees what the game
// is about and one 18+ tap before the modes; the tap is remembered on this device. Browser-only: the
// pref is localStorage and the gate is the DOM.
import { test, expect } from "@playwright/test";
const INDEX_URL = new URL("../../web/index.html", import.meta.url).href;

test("the splash asks once, 18+, before it shows the modes — and remembers", async ({ page }) => {
  const errors = []; page.on("pageerror", e => errors.push(e.message));
  await page.goto(INDEX_URL);
  await expect(page.locator("#start-age")).toBeVisible();
  await expect(page.locator("#start-age")).toContainText("18+");
  await expect(page.locator('.start-mode[data-mode="soi6"]')).toBeHidden();
  await page.locator("#start-age-ok").click();
  await expect(page.locator("#start-age")).toBeHidden();
  await expect(page.locator('.start-mode[data-mode="soi6"]')).toBeVisible();
  await page.reload();
  await expect(page.locator("#start-age")).toBeHidden();
  await expect(page.locator('.start-mode[data-mode="soi6"]')).toBeVisible();
  expect(errors).toEqual([]);
});

test("the link a forum unfurls has a title, a description and a card image", async ({ page }) => {
  await page.goto(INDEX_URL);
  for (const p of ["og:title", "og:description", "og:image", "og:url"])
    expect(await page.locator(`meta[property="${p}"]`).getAttribute("content")).toBeTruthy();
  expect(await page.locator('meta[name="twitter:card"]').getAttribute("content")).toBe("summary_large_image");
});
