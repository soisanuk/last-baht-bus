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

    // Hover the LOCATOR, then hold — do not measure a rect and click at it.
    // With the v0 scene panel on by default the transcript sits lower on the
    // page, so a coordinate captured before scrolling can land on the panel
    // instead of the word; that made this test flaky at about 1 in 4 the day
    // v0 was switched on. locator.hover() scrolls into view and positions the
    // mouse, and the press below is still a real 700ms hold.
    const kws = page.locator("#term-out .kw[data-k='npc']");
    const n = await kws.count();
    expect(n, "the room printed some tappable people").toBeGreaterThan(0);

    let rows = null;
    for (let i = 0; i < n; i++) {
      await kws.nth(i).hover();
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

// The scene panel on a phone: it boots FOLDED (art + cast hidden, HUD + exits
// kept), the fold is labelled and tappable, and the choice persists. Measured
// 2026-08-22 on 390×844: the open panel left the transcript 38% of the screen.
test.describe("phone scene panel", () => {
  test.use(IPHONE);

  test("boots folded with a labelled toggle; opening it sticks", async ({ page }) => {
    await bootIntoGame(page, INDEX_URL);
    await page.fill("#term-in", "look");
    await page.press("#term-in", "Enter");
    await expect(page.locator("#scene")).toHaveClass(/collapsed/);
    await expect(page.locator("#scene-art")).toHaveCount(0);
    const tog = page.locator("#scene-toggle");
    await expect(tog).toHaveText(/scene/);
    const h = await tog.evaluate(e => e.getBoundingClientRect().height);
    expect(Math.round(h), "toggle tall enough for a thumb").toBeGreaterThanOrEqual(30);
    // the transcript owns most of the screen when folded
    const share = await page.evaluate(() => {
      const b = document.getElementById("term-out").getBoundingClientRect();
      return (Math.min(innerHeight, b.bottom) - Math.max(0, b.top)) / innerHeight;
    });
    expect(share, "transcript share of the viewport when folded").toBeGreaterThan(0.5);
    await tog.click();
    await expect(page.locator("#scene")).not.toHaveClass(/collapsed/);
    await expect(page.locator("#scene-art img")).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem("lbb_scene_off"))).toBe("0");
  });
});

// ── round 24: Pauline, 64, on a phone, arthritis in both thumbs ─────────────

test.describe("touch device", () => {
  test.use(IPHONE);

  test("the floating buttons never sit on top of tappable words", async ({ page }) => {
    // She tapped a bar name repeatedly with nothing happening and concluded the
    // game was broken. Measured: the compass occupied x 268-376 of a 390px
    // screen, floating over a SCROLLING transcript — so whichever tappable word
    // happened to scroll under it was unreachable. Intermittent, which is worse
    // than always.
    await bootIntoGame(page, INDEX_URL);
    await page.evaluate(() => { try { doCommand("out"); } catch (e) {} });
    await page.waitForTimeout(250);
    const bad = await page.evaluate(() => {
      const stack = document.getElementById("fab-stack");
      if (!stack) return [];
      const s = stack.getBoundingClientRect();
      if (!s.height) return [];
      return [...document.querySelectorAll("#term-out .kw")]
        .filter(k => { const r = k.getBoundingClientRect();
          return r.right > s.left && r.left < s.right && r.bottom > s.top && r.top < s.bottom; })
        .map(k => k.textContent.trim());
    });
    expect(bad, "tappable words hidden under the floating buttons").toEqual([]);
  });

  test("the floating buttons clear the chip bar", async ({ page }) => {
    await bootIntoGame(page, INDEX_URL);
    await page.evaluate(() => { try { doCommand("out"); } catch (e) {} });
    await page.waitForTimeout(250);
    const r = await page.evaluate(() => {
      const s = document.getElementById("fab-stack").getBoundingClientRect();
      const c = document.getElementById("chips").getBoundingClientRect();
      return { stackBottom: s.bottom, chipsTop: c.top, up: s.height > 0 };
    });
    if (r.up) expect(r.stackBottom, "the bell must not sit inside the chips").toBeLessThanOrEqual(r.chipsTop + 1);
  });

  test("an overflowing chip bar says so", async ({ page }) => {
    // 957px of chips on a 390px screen at the taxi intro: five of the game's
    // first eight answers were off the edge with no arrow, fade or hint.
    await page.goto(INDEX_URL);
    await page.waitForTimeout(400);
    const shadows = await page.evaluate(() => {
      const c = document.getElementById("chips");
      return getComputedStyle(c).backgroundImage.includes("radial-gradient");
    });
    expect(shadows, "the chip bar carries scroll shadows").toBe(true);
  });
});

// ── 2026-10-03: "Mobile UI is pretty cluttered" (Mario) ─────────────────────
// The floating stack reserved a 134px right margin on a 390px screen whenever
// the compass was up, and the exits were printed five times. On a phone the
// buttons now dock in a row above the chips; and a conversation shows a card.
test.describe("phone dock and the conversation card", () => {
  test.use(IPHONE);
  const run = async (page, c) => { await page.fill("#term-in", c); await page.press("#term-in", "Enter"); await page.waitForTimeout(200); };

  test("on the street the transcript keeps its full width and the compass sits above the chips", async ({ page }) => {
    await bootIntoGame(page, INDEX_URL);
    await run(page, "down"); await run(page, "out");
    await expect(page.locator("#nav-fab")).toBeVisible();
    const r = await page.evaluate(() => {
      const out = document.getElementById("term-out"), nav = document.getElementById("nav-fab");
      return { pr: parseFloat(getComputedStyle(out).paddingRight), outBottom: out.getBoundingClientRect().bottom,
        navTop: nav.getBoundingClientRect().top, chipsTop: document.getElementById("chips").getBoundingClientRect().top,
        navBottom: nav.getBoundingClientRect().bottom, exitsRail: !!document.getElementById("scene-exits") };
    });
    expect(r.pr, "no right margin reserved for floating buttons").toBeLessThan(30);
    expect(r.navTop, "the compass is below the transcript").toBeGreaterThanOrEqual(r.outBottom - 1);
    expect(r.navBottom).toBeLessThanOrEqual(r.chipsTop + 1);
    expect(r.exitsRail, "folded on a phone, the exits rail is not printed a fifth time").toBe(false);
  });

  test("talking to somebody shows who, and the ✕ ends it", async ({ page }) => {
    await bootIntoGame(page, INDEX_URL);
    // a street encounter on the way out would eat the next command (seeded off Math.random)
    await page.evaluate(() => { for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2; G.lastSaleng = 9e9; });
    await run(page, "down"); await run(page, "out"); await run(page, "enter shady lady");
    const nm = await page.evaluate(() => NPCS[_npcsHere().find(i => NPC_ROLES[i] === "hostess")].name);
    await run(page, "talk to " + nm);
    const card = page.locator("#convo-card");
    await expect(card).toBeVisible();
    await expect(card).toContainText(nm);
    await expect(page.locator("#term-in")).toHaveAttribute("placeholder", new RegExp(nm));
    await card.locator("button").click();
    await page.waitForTimeout(200);
    await expect(card).toBeHidden();
    expect(await page.evaluate(() => G.convo)).toBeFalsy();
    await expect(page.locator("#term-in")).toHaveAttribute("placeholder", "what do you do?");
  });

  // ── round 65: three personas on phones ──
  test("a new chip set starts at its first chip, not where the last one was scrolled to", async ({ page }) => {
    await bootIntoGame(page, INDEX_URL);
    await page.evaluate(() => { for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2; });
    await page.evaluate(() => { document.getElementById("chips").scrollLeft = 300; });
    await run(page, "down");
    expect(await page.evaluate(() => document.getElementById("chips").scrollLeft)).toBe(0);
  });

  test("indoors the dock offers the way out as a button, and a woman on your arm has a card", async ({ page }) => {
    await bootIntoGame(page, INDEX_URL);
    await page.evaluate(() => { for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2; });
    await run(page, "look");   // upstairs at the Queen Vic: DOWN is the only way
    await expect(page.locator("#nav-extra button")).toHaveText(["DOWN"]);
    await page.evaluate(() => { G.room = "pink_lotus"; G.visited.pink_lotus = true;
      const id = _npcsHere().find(i => NPC_ROLES[i] === "hostess"); G.party = { ids: [id], stops: 0, spent: 0, seen: {} }; });
    await run(page, "look");
    await expect(page.locator("#convo-card")).toBeVisible();
    await expect(page.locator("#convo-card")).toContainText(/out with you/);
  });

  test("the conversation card stands down while a game owns the input", async ({ page }) => {
    await bootIntoGame(page, INDEX_URL);
    await page.evaluate(() => { for (const k in ENCOUNTERS) G.encDone[k] = true; G.peddlerNight = 2; G.room = "pink_lotus"; G.money = 5000; });
    const nm = await page.evaluate(() => NPCS[_npcsHere().find(i => NPC_ROLES[i] === "hostess")].name);
    await run(page, "talk to " + nm);
    await expect(page.locator("#convo-card")).toBeVisible();
    await page.evaluate(() => { G.game = { type: "c4" }; _term.updateFabs(); });
    await expect(page.locator("#convo-card")).toBeHidden();
  });
});
