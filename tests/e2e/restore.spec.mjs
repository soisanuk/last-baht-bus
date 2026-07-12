// Mid-fixture restore — a DOM/boot-path feature the node:vm suite can't reach.
//
// A parked saleng is a room fixture (salengCart/salengRoom/salengUntil), not a
// modal, so on reload it must re-announce itself through the ROOM DESCRIPTION —
// otherwise a restore is blind to the cart parked outside. The wiring that
// redraws the room — main.js's continue prompt after a reload — only runs in the
// real page. This drives it: park a cart, save, reload, answer YES, and confirm
// the cart line and its BUY options come back with the room text.
import { test, expect } from "@playwright/test";

const INDEX_URL = new URL("../../web/index.html", import.meta.url).href;

test("restoring with a parked saleng redraws the cart with the room", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));
  await page.goto(INDEX_URL);
  await page.waitForSelector("#term-in");

  // Park a saleng snacks cart in the live state, exactly as the tick would.
  await page.evaluate(() => {
    G.room = "candy_bar";
    G.money = 500;
    G.salengCart = "snacks";
    G.salengRoom = "candy_bar";
    G.salengUntil = G.turns + 6;
  });

  const saved = await page.evaluate(() => {
    localStorage.setItem("lbb_save", serializeGame());
    const s = JSON.parse(localStorage.getItem("lbb_save"));
    return { cart: s.salengCart, room: s.salengRoom };
  });
  expect(saved.cart).toBe("snacks");
  expect(saved.room).toBe("candy_bar");

  // Reload: main.js sees the save and offers to continue.
  await page.reload();
  await page.waitForSelector("#term-in");
  await expect(page.locator("#term-out")).toContainText(/continue/i);

  // Answer YES — the room text returns AND the parked cart redraws with it.
  await page.fill("#term-in", "yes");
  await page.press("#term-in", "Enter");
  const out = page.locator("#term-out");
  await expect(out).toContainText(/som-tam saleng is parked/);
  await expect(out).toContainText(/BUY SOM TAM/);
  expect(await page.evaluate(() => G.salengCart)).toBe("snacks");

  expect(pageErrors).toEqual([]);
});

test("restoring mid-jackpot redraws the box and the FLIP hint", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));
  await page.goto(INDEX_URL);
  await page.waitForSelector("#term-in");

  // Drive a real jackpot game to a two-way roll, then persist it.
  const pending = await page.evaluate(() => {
    for (let seed = 1; seed <= 300; seed++) {
      newGame(); G.lastSaleng = 99999; G.flags.jpLearned = true; // past the tutorial
      G.room = "candy_bar"; G.rng = seed;
      doCommand("play jackpot");
      if (G.game && G.game.pending && G.game.pending.length === 2) break; // a real two-way roll
    }
    localStorage.setItem("lbb_save", serializeGame());
    return G.game.pending.length;
  });
  expect(pending).toBe(2);

  // Reload → continue → the box and a single FLIP hint come back with the room.
  await page.reload();
  await page.waitForSelector("#term-in");
  await expect(page.locator("#term-out")).toContainText(/continue/i);
  await page.fill("#term-in", "yes");
  await page.press("#term-in", "Enter");
  const out = page.locator("#term-out");
  await expect(out).toContainText(/still in progress/);
  await expect(out).toContainText(/\[ 1 2 3/);         // the tile box
  await expect(out).toContainText(/\(FLIP .* or /);     // one FLIP, choices joined by "or"
  // the redrawn FLIP is tappable (a cmd kw), so mobile can act with no keyboard
  expect(await page.locator('#term-out .kw[data-k="cmd"]').count()).toBeGreaterThan(0);
  expect(await page.evaluate(() => G.game && G.game.type)).toBe("jp");

  expect(pageErrors).toEqual([]);
});
