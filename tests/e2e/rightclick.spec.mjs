// The DESKTOP route to the full action wheel. term.js opens it three ways —
// a 500ms press-and-hold (pointerdown, so mouse as well as finger), and a
// `contextmenu` handler, i.e. right-click. touch.spec covers the hold; nothing
// covered right-click at all, which is how a path quietly dies: it works by
// reading, not by verification. (Same shape as the hotspot check that had been
// pinned to .png for a whole art migration without anyone noticing.)
//
// It matters more than it looks: BARFINE deliberately lives in the full menu
// only — never a quick tap, since it spends four figures and ends the night —
// so on a desktop, right-click is the ONLY pointer route to it.
import { test, expect } from "@playwright/test";
import { bootIntoGame } from "./_helpers.mjs";

const INDEX_URL = new URL("../../web/index.html", import.meta.url).href;

test("right-click on a keyword opens the FULL wheel, not the quick menu", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));
  await bootIntoGame(page, INDEX_URL);

  // stand in a bar with staff, so there are npc keywords with a long action list
  await page.evaluate(() => {
    const bar = Object.keys(ROOMS).find(id => ROOMS[id].barType);
    G.room = bar; G.visited[bar] = true;
    G.stage = "vacation"; G.flags.act1Done = true;
  });
  await page.fill("#term-in", "look");
  await page.press("#term-in", "Enter");
  await expect(page.locator("#term-out .kw[data-k='npc']").first()).toBeVisible();

  // A keyword with a single action fires instead of opening a wheel, and
  // #flyout is built lazily, so walk the npc keywords until one opens.
  //
  // Locators, NOT raw coordinates: with the v0 scene panel on by default the
  // transcript is pushed down the page, and a rect measured before scrolling
  // put the click on the panel instead of the word. Playwright scrolls a
  // locator into view for us, which is the whole reason to prefer it.
  const kws = page.locator("#term-out .kw[data-k='npc']");
  const n = await kws.count();
  expect(n, "the room printed some tappable people").toBeGreaterThan(0);

  let full = null, usedIdx = -1;
  for (let i = 0; i < n; i++) {
    await kws.nth(i).click({ button: "right" });
    await page.waitForTimeout(150);
    full = await page.evaluate(() => {
      const w = document.getElementById("flyout");
      if (!w || getComputedStyle(w).display === "none") return null;
      const b = [...w.querySelectorAll("button")].map(e => e.textContent.trim());
      return b.length ? b : null;
    });
    // a one-row flyout is not a wheel — some keywords carry a single action and
    // would make the richer-than-quick comparison below meaningless
    if (full && full.length > 1) { usedIdx = i; break; }
    full = null;
  }
  expect(full, "right-click should open the action wheel on some NPC").not.toBeNull();

  // the full menu is strictly richer than the quick one — that's what makes it
  // the desktop equivalent of the hold, rather than just another way to tap
  const quickLen = await page.evaluate(i => {
    const el = [...document.querySelectorAll("#term-out .kw[data-k='npc']")][i];
    return el && typeof _npcActions === "function" ? _npcActions(el.dataset.v, false).length : null;
  }, usedIdx);
  if (quickLen != null) expect(full.length).toBeGreaterThan(quickLen);

  expect(pageErrors).toEqual([]);
});

test("HELP tells a desktop player the gesture exists", async ({ page }) => {
  // Right-click-for-more is a convention the game can't assume; the long-press
  // is at least a learned phone gesture, but nothing on screen hints at either.
  await bootIntoGame(page, INDEX_URL);
  await page.fill("#term-in", "help");
  await page.press("#term-in", "Enter");
  await expect(page.locator("#term-out")).toContainText(/RIGHT-CLICK/);
  await expect(page.locator("#term-out")).toContainText(/press and hold/i);
});
