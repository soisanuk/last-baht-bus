// The v0 scene panel is pure presentation, unreachable from the vm suite — this
// spec is its DOM canary: the panel renders from live G, tracks a move, taps
// submit real typed commands, and the collapse pref sticks. file:// + headless
// Chromium; globals are lexical, so page.evaluate reads G as a bare name.
import { test, expect } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bootIntoGame } from "./_helpers.mjs";

const INDEX_URL = new URL("../../web/index.html", import.meta.url).href;
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// Choose the two rooms the backdrop test drives, from the art actually on disk:
// one room that has its own PNG (the room leg) and one that has none but whose
// region does (the fallback leg). Naming rooms here goes stale every time an art
// batch lands — this can't. Returns nulls when there's no art at all.
// Extension-agnostic, like the chain it exercises: a room's art may be .webp or
// .png and migrates one file at a time (docs/art-production.md). Keyed on the
// STEM, so a room that has migrated still counts as covered — key on the
// filename and a freshly converted room reads as artless, and then the fallback
// leg asserts a region shot for a room the panel correctly serves its own art.
function pickSubjects() {
  const art = sub => {
    const d = path.join(ROOT, "web", "art", sub);
    if (!fs.existsSync(d)) return new Set();
    return new Set(fs.readdirSync(d)
      .filter(f => /\.(webp|png)$/.test(f))
      .map(f => f.replace(/\.(webp|png)$/, "")));
  };
  const rooms = art("rooms"), regions = art("regions");
  const manifest = path.join(ROOT, "docs", "scene-manifest.json");
  if (!fs.existsSync(manifest)) return { withArt: null, artless: null };
  const all = JSON.parse(fs.readFileSync(manifest, "utf8")).rooms;

  // Prefer a migrated room for the room leg: while both extensions are in play
  // the webp path is the one with no coverage anywhere else, and it's where the
  // whole batch is heading. Falls back to any covered room before migration.
  const webpRooms = new Set([...rooms].filter(id =>
    fs.existsSync(path.join(ROOT, "web", "art", "rooms", id + ".webp"))));
  const withArt = all.find(r => webpRooms.has(r.id)) || all.find(r => rooms.has(r.id)) || null;
  const artless = all.find(r => !rooms.has(r.id) && regions.has(r.regionSlug)) || null;
  return { withArt, artless };
}

test("scene panel renders, tracks movement, and exit taps submit typed commands", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));
  await bootIntoGame(page, INDEX_URL);

  // ON by default now — the art track caught up with the rooms, so the backdrop
  // is the game's normal face and TOGGLE_V0 is the switch that turns it OFF.
  await expect(page.locator("#scene")).toBeVisible();
  await page.fill("#term-in", "toggle_v0");
  await page.press("#term-in", "Enter");
  await expect(page.locator("#term-out")).toContainText("v0 scene panel: OFF");
  await expect(page.locator("#scene")).toBeHidden();
  // and back on — the first toggle of a fresh browser must not be a no-op,
  // which it would be if the flip didn't know this key's default
  await page.fill("#term-in", "toggle_v0");
  await page.press("#term-in", "Enter");
  await expect(page.locator("#term-out")).toContainText("v0 scene panel: ON");
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
  // v0 is on by default now; pin it anyway so this spec never depends on the
  // other one's toggling having left it in a particular state
  await page.evaluate(() => { localStorage.setItem("lbb_v0_on", "1"); _updateScene(); });

  // Wait for the chain to SETTLE, don't decode() the first candidate. Each miss
  // is a 404 that fires onerror and advances src, so at the instant the panel
  // renders the img is pointed at art/rooms/<id>.webp — which, for every asset
  // still on PNG, does not exist. Decoding right there rejects and reads as "no
  // art" when the .png two steps along would have loaded fine. Settled means the
  // row removed itself (nothing matched) or a candidate has real pixels.
  const art = async room => {
    await page.evaluate(r => { G.room = r; _updateScene(); }, room);
    return await page.evaluate(async () => {
      const done = () => {
        const img = document.querySelector("#scene-art img");
        if (!img) return { gone: true };            // the row removed itself: no art
        return img.naturalWidth > 0
          ? { src: img.currentSrc.split("/").slice(-2).join("/"), w: img.naturalWidth }
          : null;                                   // still walking the chain
      };
      for (let i = 0; i < 100; i++) {               // ~5s, generous for file://
        const r = done();
        if (r) return r.gone ? null : r;
        await new Promise(res => setTimeout(res, 50));
      }
      return null;
    });
  };

  // Pick the two subjects from what's on disk rather than naming rooms: art
  // coverage grows batch by batch, so any hard-coded "this room has no art"
  // room eventually gets some and fails the fallback leg for no real reason.
  const { withArt, artless } = pickSubjects();
  test.skip(!withArt && !artless, "no scene art generated yet");

  // Either extension satisfies the leg — which one is a migration detail, and
  // pinning it here would fail the day a room is converted.
  if (withArt) {
    const room = await art(withArt.id);
    expect(room?.src).toMatch(new RegExp(`^rooms/${withArt.id}\\.(webp|png)$`));
    expect(room.w).toBeGreaterThan(0);
  }
  if (artless) {
    const region = await art(artless.id);
    // the slug the generator writes — this is the leg that catches slug drift
    expect(region?.src).toMatch(new RegExp(`^regions/${artless.regionSlug}\\.(webp|png)$`));
    expect(region.w).toBeGreaterThan(0);
  }
});
