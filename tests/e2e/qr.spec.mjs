// The QR sticker at the LK Metro mouth (docs/ctf.md) is the one piece of output
// in the game whose VALUE is that a phone camera can read it off the screen, and
// nothing in the vm suite can see a rendered pixel. So this spec guards the two
// ways it can die in the DOM while the engine stays perfectly correct:
//
//   1. the text arriving mangled — wrapped, collapsed, or re-flowed by CSS, any
//      of which silently destroys the code;
//   2. the block rendering light-on-dark, because the terminal is neon on black
//      and an inverted QR is one most scanners refuse outright.
import { test, expect } from "@playwright/test";
import { bootIntoGame } from "./_helpers.mjs";

const INDEX_URL = new URL("../../web/index.html", import.meta.url).href;

test("EXAMINE QR prints a scannable block: intact text, dark-on-light", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));
  await bootIntoGame(page, INDEX_URL);

  await page.evaluate(() => {
    G.stage = "vacation"; G.flags.act1Done = true; G.room = "lk_entrance";
  });
  await page.fill("#term-in", "examine qr");
  await page.press("#term-in", "Enter");

  const qr = page.locator("#term-out .t-qr");
  await expect(qr).toHaveCount(1);

  // ── the code itself survived the DOM, byte for byte ──────────────────────
  const baked = await page.evaluate(() => _QR_STICKER);
  const shown = await qr.evaluate(el => el.textContent);
  expect(shown).toBe(baked);

  const rows = shown.split("\n");
  expect(rows.length).toBe(21);
  for (const r of rows) expect(r.length).toBe(41); // square grid, nothing trimmed
  expect(/^[█▀▄ ]+$/.test(shown.replace(/\n/g, ""))).toBe(true);

  // ── and it is rendered dark modules on a light field, not inverted ────────
  const style = await qr.evaluate(el => {
    const s = getComputedStyle(el);
    return { bg: s.backgroundColor, fg: s.color, ws: s.whiteSpace, lh: s.lineHeight, fs: s.fontSize };
  });
  const lum = c => {
    const [r, g, b] = c.match(/\d+/g).map(Number);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  expect(lum(style.bg)).toBeGreaterThan(200);   // near-white field
  expect(lum(style.fg)).toBeLessThan(60);       // near-black modules
  expect(style.ws).toBe("pre");                 // pre-wrap would reflow the grid

  // line-height must equal the font size: any leading opens a white stripe
  // between every pair of module rows and the code stops scanning
  expect(Math.abs(parseFloat(style.lh) - parseFloat(style.fs))).toBeLessThan(0.6);

  // it must fit a phone without horizontal scrolling, or the right-hand
  // finder pattern is off-screen when the camera looks
  await page.setViewportSize({ width: 390, height: 800 });
  const fits = await qr.evaluate(el => el.scrollWidth <= el.clientWidth + 1);
  expect(fits, "the QR overflows a 390px phone viewport").toBe(true);

  expect(pageErrors).toEqual([]);
});

test("the poster is discoverable, and bare POSTER does not deny it", async ({ page }) => {
  await bootIntoGame(page, INDEX_URL);
  await page.evaluate(() => {
    G.stage = "vacation"; G.flags.act1Done = true; G.room = "lk_entrance";
  });
  // the go-go POSTER verb answers "no poster in here" by default; this room has
  // one, so the bare verb must reach it rather than contradicting the room
  await page.fill("#term-in", "poster");
  await page.press("#term-in", "Enter");
  const out = await page.locator("#term-out").innerText();
  expect(out).toMatch(/QR sticker/);
  expect(out).not.toMatch(/No poster in here/);
});
