// Touch tap-target sizes — the mobile half of "is this playable with a thumb?"
//
// A mobile play-test (2026-08-07) measured every interactive control below the
// 44px minimum both Apple's HIG and Material use: the send button at 44×38, the
// chip rail at 28px. The fix is a `(pointer: coarse)` block in index.html —
// gated on the INPUT DEVICE, not the screen width, because a narrow desktop
// window still has a mouse and a large tablet still doesn't.
//
// This guards the fix the same way the de-coverage ceilings guard the catalog:
// the numbers are cheap to measure and silent to regress. A CSS tidy-up that
// drops a min-height reads as harmless in review and is only felt by someone
// playing on a phone, which is nobody on this repo.
//
// Deliberately NOT asserted here: the inline prose keywords (.kw, ~15-18px).
// They're inline text spans, and 44px line boxes would wreck the reading rhythm
// of a game that is entirely reading. That's a real tradeoff, not an oversight.
// The flyout wheel rows (~23px) are a genuine gap still open — see the note at
// the end of this file.
import { test, expect, devices } from "@playwright/test";
import { bootIntoGame } from "./_helpers.mjs";

const INDEX_URL = new URL("../../web/index.html", import.meta.url).href;
const MIN_TAP = 44;

// The device descriptor carries `defaultBrowserType`, which Playwright refuses
// inside a describe (it would force a new worker). Drop it — we only want the
// viewport, DPR, UA and, crucially, hasTouch/isMobile, which is what flips
// `(pointer: coarse)` on.
const { defaultBrowserType: _ignored, ...IPHONE } = devices["iPhone 13"];

test.describe("touch device", () => {
  test.use(IPHONE);

  test("the thumb path meets the 44px minimum", async ({ page }) => {
    await bootIntoGame(page, INDEX_URL);
    await page.fill("#term-in", "look");
    await page.press("#term-in", "Enter");
    await expect(page.locator(".chip").first()).toBeVisible();

    const m = await page.evaluate(() => {
      const box = el => { const b = el.getBoundingClientRect(); return { w: b.width, h: b.height }; };
      const send = document.getElementById("term-send");
      const chips = [...document.querySelectorAll(".chip")]
        .filter(e => e.getBoundingClientRect().width > 0)
        .map(e => ({ label: e.textContent.trim(), ...box(e) }));
      return { send: box(send), chips };
    });

    expect(m.chips.length, "chips should be on screen after a look").toBeGreaterThan(0);

    expect(Math.round(m.send.w), "send button width").toBeGreaterThanOrEqual(MIN_TAP);
    expect(Math.round(m.send.h), "send button height").toBeGreaterThanOrEqual(MIN_TAP);

    const short = m.chips.filter(c => Math.round(c.h) < MIN_TAP);
    expect(short.map(c => `${c.label} (${Math.round(c.h)}px)`), "chips under 44px tall").toEqual([]);
  });

  test("no horizontal page scroll on a phone", async ({ page }) => {
    // The chip RAIL scrolls sideways by design; the PAGE must not — a body that
    // scrolls horizontally on a phone is the classic broken-mobile tell.
    await bootIntoGame(page, INDEX_URL);
    await page.fill("#term-in", "help");        // the longest output in the game
    await page.press("#term-in", "Enter");
    const o = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    expect(o.scrollW, "document scrollWidth vs clientWidth").toBeLessThanOrEqual(o.clientW + 1);
  });
});

test.describe("mouse device", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  // The other half of the contract: touch sizing must NOT leak to the desktop,
  // where 44px chips are chunky and cost scrollback for nothing. If this fails,
  // someone moved the rule out of its (pointer: coarse) block.
  test("desktop chips stay compact", async ({ page }) => {
    await bootIntoGame(page, INDEX_URL);
    await page.fill("#term-in", "look");
    await page.press("#term-in", "Enter");
    await expect(page.locator(".chip").first()).toBeVisible();
    const h = await page.evaluate(() =>
      Math.round(document.querySelector(".chip").getBoundingClientRect().height));
    expect(h, "desktop chip height").toBeLessThan(MIN_TAP);
  });
});

// STILL OPEN, from the same play-test: the long-press flyout wheel renders rows
// ~23px tall. Long-press is how a phone player reaches anything past the chips,
// so a thin row between two other rows is a mis-tap waiting to happen. Not
// asserted here because it isn't fixed yet — adding a failing test would just
// get skipped. Fix the rows, then add the assertion.
