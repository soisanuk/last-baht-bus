// The v0 scene panel is pure presentation, unreachable from the vm suite — this
// spec is its DOM canary: the panel renders from live G, tracks a move, taps
// submit real typed commands, and the collapse pref sticks. file:// + headless
// Chromium; globals are lexical, so page.evaluate reads G as a bare name.
import { test, expect } from "@playwright/test";
import { bootIntoGame } from "./_helpers.mjs";

const INDEX_URL = new URL("../../web/index.html", import.meta.url).href;

test("scene panel renders, tracks movement, and exit taps submit typed commands", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));
  await bootIntoGame(page, INDEX_URL);

  await expect(page.locator("#scene")).toBeVisible();
  // cast row mirrors who's actually present
  const expected = await page.evaluate(() => _npcsHere().length + _patronsHere().length);
  await expect(page.locator("#scene-cast .bust")).toHaveCount(expected);
  // HUD shows live money (format the expectation in-page so the locale matches)
  const moneyStr = await page.evaluate(() => "฿" + (G.money || 0).toLocaleString());
  await expect(page.locator("#scene-hud")).toContainText(moneyStr);

  // an exit tap echoes as a typed command and moves the player
  const before = await page.evaluate(() => G.room);
  await page.locator("#scene-exits button").first().click();
  await expect(async () => {
    expect(await page.evaluate(() => G.room)).not.toBe(before);
  }).toPass();
  // the tap went through the transcript (tap-echo invariant) — echo() prefixes
  // every line with the "❯ " prompt glyph (term.js), so match past it
  await expect(page.locator("#term-out .t-echo").last()).toContainText(/^❯ go /);

  // a bust tap opens the character wheel with a portrait header
  await page.locator("#scene-cast .bust").first().click();
  await expect(page.locator("#flyout")).toBeVisible();
  await page.keyboard.press("Escape");

  // collapse pref sticks across the toggle
  await page.locator("#scene-toggle").click();
  await expect(page.locator("#scene.collapsed")).toHaveCount(1);

  expect(pageErrors).toEqual([]);
});

// The backdrop chain (art/rooms/<id>.png → art/regions/<slug>.png → the row
// removes itself) can only fail in a browser: the vm suite can't load an image,
// and a slug that drifts from the generator's just 404s quietly into the
// fallback. So assert a real decoded pixel width for a room covered by each
// leg. Skips rather than fails when no art has been generated yet — missing art
// is a shipping state, not a bug (see docs/art-pipeline-spec.md).
test("scene backdrops resolve: room art, then region fallback", async ({ page }) => {
  await bootIntoGame(page, INDEX_URL);

  const art = async room => {
    await page.evaluate(r => { G.room = r; _updateScene(); }, room);
    return await page.evaluate(async () => {
      const img = document.querySelector("#scene-art img");
      if (!img) return null;                       // the row removed itself: no art
      try { await img.decode(); } catch { return null; }
      return { src: img.currentSrc.split("/").slice(-2).join("/"), w: img.naturalWidth };
    });
  };

  // queen_vic has its own art; soi6_mid has none and must land on its region.
  const room = await art("queen_vic");
  const region = await art("soi6_mid");
  test.skip(!room && !region, "no scene art generated yet");

  if (room) {
    expect(room.src).toBe("rooms/queen_vic.png");
    expect(room.w).toBeGreaterThan(0);
  }
  if (region) {
    expect(region.src).toBe("regions/soi-6.png");  // the slug the generator writes
    expect(region.w).toBeGreaterThan(0);
  }
});
