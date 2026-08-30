// v1 hotspots (docs/2d-v1-spec.md) DOM canary — the vm suite can't reach real
// layout math (object-fit:cover, resize), so this is where that gets checked:
// hotspots render only after the room's own art has loaded, a tap echoes its
// typed command (tap-echo invariant), and turning lbb_v1_on off clears them.
import { test, expect } from "@playwright/test";
import { bootIntoGame } from "./_helpers.mjs";

const INDEX_URL = new URL("../../web/index.html", import.meta.url).href;

test("hotspots render over bespoke room art and taps echo typed commands", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));
  await bootIntoGame(page, INDEX_URL);

  // both layers are OFF by default (TOGGLE_V0/TOGGLE_V1) — v1 renders on v0's panel
  await page.evaluate(() => {
    localStorage.setItem("lbb_v0_on", "1");
    localStorage.setItem("lbb_v1_on", "1");
    G.room = "queen_vic";
    _updateScene();
  });

  // hotspots attach only after the real room image (not the region fallback) loads
  const img = page.locator("#scene-art img");
  await expect(img).toBeVisible();
  await page.evaluate(async () => {
    const el = document.querySelector("#scene-art img");
    if (el) { try { await el.decode(); } catch (e) {} }
  });
  await expect(async () => {
    expect(await page.locator("#scene-art .hotspot").count()).toBeGreaterThan(0);
  }).toPass();

  const cmd = await page.evaluate(() => SCENE_HOTSPOTS["rooms/queen_vic"][0].cmd);
  await page.locator("#scene-art .hotspot").first().click();
  await expect(page.locator("#term-out .t-echo").last()).toContainText("❯ " + cmd);

  // toggling v1 off (with v0 still on) clears every hotspot
  await page.evaluate(() => { localStorage.setItem("lbb_v1_on", "0"); _updateScene(); });
  await expect(page.locator("#scene-art .hotspot")).toHaveCount(0);

  expect(pageErrors).toEqual([]);
});

// The resize listener binds ONCE for the page's life and calls whatever render
// closure is current, rather than being removed and re-added on every render
// (#scene-art is rebuilt every command, so that was a closure per command —
// and the early return when v1 is off never reached the removal, leaving a
// stale listener bound to a detached div). Measured before the fix: one extra
// add per render, 4 → 16 across 13 renders. Layout behaviour must be identical.
test("the hotspot resize listener binds once, however many times the scene rerenders", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));
  // count resize registrations from before any page script runs
  await page.addInitScript(() => {
    window.__resizeAdds = 0;
    const orig = window.addEventListener.bind(window);
    window.addEventListener = (t, ...rest) => {
      if (t === "resize") window.__resizeAdds++;
      return orig(t, ...rest);
    };
  });
  await bootIntoGame(page, INDEX_URL);
  await page.evaluate(() => {
    localStorage.setItem("lbb_v0_on", "1");
    localStorage.setItem("lbb_v1_on", "1");
    G.room = "queen_vic";
    _updateScene();
  });
  await expect(async () => {
    expect(await page.locator("#scene-art .hotspot").count()).toBeGreaterThan(0);
  }).toPass();
  const afterFirst = await page.evaluate(() => window.__resizeAdds);

  for (let i = 0; i < 12; i++) await page.evaluate(() => _updateScene());
  const afterMany = await page.evaluate(() => window.__resizeAdds);
  expect(afterMany, "no new resize listener per render").toBe(afterFirst);

  // …and the one listener still does its job: hotspots re-layout on a resize
  await page.setViewportSize({ width: 900, height: 700 });
  await expect(async () => {
    expect(await page.locator("#scene-art .hotspot").count()).toBeGreaterThan(0);
  }).toPass();

  expect(pageErrors).toEqual([]);
});

// A region-fallback room (no bespoke art) must render zero hotspots — the whole
// reason SCENE_HOTSPOTS is keyed by "rooms/<id>" and never "regions/<slug>".
test("a region-fallback room renders art with zero hotspots", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));
  await bootIntoGame(page, INDEX_URL);

  await page.evaluate(() => {
    localStorage.setItem("lbb_v0_on", "1");
    localStorage.setItem("lbb_v1_on", "1");
    G.room = "jomtien_beach_rd"; // has no rooms/jomtien_beach_rd.png — falls back to regions/jomtien.png
    _updateScene();
  });
  await page.waitForSelector("#scene-art img");
  await page.evaluate(async () => {
    const el = document.querySelector("#scene-art img");
    if (el) { try { await el.decode(); } catch (e) {} }
  });
  await page.waitForTimeout(300); // let a stray load/resize settle before asserting the negative
  await expect(page.locator("#scene-art .hotspot")).toHaveCount(0);

  expect(pageErrors).toEqual([]);
});
