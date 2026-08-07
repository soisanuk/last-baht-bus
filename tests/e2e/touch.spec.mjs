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
// Covered: the send button, the chip rail, and the long-press wheel's rows.
// Deliberately not covered: the inline prose keywords — see the closing note.
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

  // Long-press is the only route to anything past the chip rail on a phone, so
  // the wheel's rows are load-bearing. Opening one takes a little work: a
  // keyword with a SINGLE action fires it immediately instead of opening a
  // wheel, and #flyout is built lazily, so a long-press on the wrong name
  // leaves no element at all. Walk the NPC keywords until one opens.
  test("the long-press wheel's rows meet the 44px minimum", async ({ page }) => {
    await bootIntoGame(page, INDEX_URL);
    await page.fill("#term-in", "down");
    await page.press("#term-in", "Enter");
    await page.fill("#term-in", "out");
    await page.press("#term-in", "Enter");
    // drop into the first bar the world defines, so there are staff to tap
    await page.evaluate(() => {
      const bar = Object.keys(ROOMS).find(id => ROOMS[id].barType);
      G.room = bar; G.visited[bar] = true;
    });
    await page.fill("#term-in", "look");
    await page.press("#term-in", "Enter");
    await expect(page.locator("#term-out .kw[data-k='npc']").first()).toBeVisible();

    const cands = await page.evaluate(() =>
      [...document.querySelectorAll("#term-out .kw")]
        .filter(e => e.dataset.k === "npc" && e.getBoundingClientRect().width > 0)
        .map(e => { const b = e.getBoundingClientRect();
                    return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }));

    let rows = null;
    for (const t of cands) {
      await page.mouse.move(t.x, t.y);
      await page.mouse.down();
      await page.waitForTimeout(700);          // term.js opens the wheel at 500ms
      await page.mouse.up();
      await page.waitForTimeout(250);
      rows = await page.evaluate(() => {
        const w = document.getElementById("flyout");
        if (!w || getComputedStyle(w).display === "none") return null;
        const b = [...w.querySelectorAll("button")];
        return b.length ? b.map(e => ({ label: e.textContent.trim().slice(0, 24),
                                        h: Math.round(e.getBoundingClientRect().height) })) : null;
      });
      if (rows) break;
    }

    expect(rows, "a long-press should open the action wheel on some NPC").not.toBeNull();
    const short = rows.filter(r => r.h < MIN_TAP);
    expect(short.map(r => `${r.label} (${r.h}px)`), "wheel rows under 44px tall").toEqual([]);
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

// A note on measuring this. The play-test that prompted these fixes first
// reported the wheel rows at 23px, which was wrong: the probe measured every
// leaf element in #flyout, including the non-interactive .fly-head label and
// the portrait. The actionable buttons were 40px all along — a 4px gap, not a
// 21px one. Hence this test asserts over `button` elements specifically.
//
// Left as-is on purpose: the inline prose keywords (.kw, ~15-18px). They're the
// most-tapped thing in the game, but 44px line boxes would wreck the reading
// rhythm of a game that is entirely reading. A real tradeoff, not an oversight.
