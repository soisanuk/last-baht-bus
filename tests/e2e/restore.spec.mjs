// Mid-encounter restore — a DOM/boot-path feature the node:vm suite can't reach.
//
// The vm tests prove _renderEncounter() replays the stashed prompt, but the
// wiring that calls it — main.js's continue prompt after a reload — only runs
// in the real page. This drives it: park a saleng, let the autosave fire, reload
// index.html, answer YES to continue, and confirm the cart pitch and its BUY
// options come back BEFORE the player moves (otherwise the encounter's exit line
// fires blind on the next command, which is the bug this fixes).
import { test, expect } from "@playwright/test";

const INDEX_URL = new URL("../../web/index.html", import.meta.url).href;

test("restoring mid-saleng redraws the cart prompt before the next move", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));
  await page.goto(INDEX_URL);
  await page.waitForSelector("#term-in");

  // Park a saleng snacks cart in the live state, exactly as the tick would.
  await page.evaluate(() => {
    G.room = "candy_bar";
    G.money = 500;
    G.salengCart = "snacks";
    G.pendingEnc = "saleng";
    G.encPrompt = [
      ["A ซาเล้ง drifts to a stop — a som tam station and drinks cooler bolted to " +
        "the back. \"Som tam! Very fresh!\"", "alert"],
      ["(BUY SOM TAM ฿50 · BUY FRUIT ฿30 · BUY <item> FOR <lady> · NO.)", "dim"],
    ];
  });

  // The real autosave fires on the command whose tick spawned the cart, so the
  // parked encounter lands in localStorage with pendingEnc still set. Persist it
  // the same way (a consuming command here would resolve the saleng instead).
  const saved = await page.evaluate(() => {
    localStorage.setItem("lbb_save", serializeGame());
    const s = JSON.parse(localStorage.getItem("lbb_save"));
    return { pendingEnc: s.pendingEnc, lines: (s.encPrompt || []).length };
  });
  expect(saved.pendingEnc).toBe("saleng");
  expect(saved.lines).toBe(2);

  // Reload: main.js sees the save and offers to continue.
  await page.reload();
  await page.waitForSelector("#term-in");
  await expect(page.locator("#term-out")).toContainText(/continue/i);

  // Answer YES — the room text returns AND the saleng prompt redraws with it.
  await page.fill("#term-in", "yes");
  await page.press("#term-in", "Enter");
  const out = page.locator("#term-out");
  await expect(out).toContainText(/ซาเล้ง/);
  await expect(out).toContainText(/BUY SOM TAM/);
  expect(await page.evaluate(() => G.pendingEnc)).toBe("saleng");

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
