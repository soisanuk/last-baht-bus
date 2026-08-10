// The street compass: N/E/S/W plus a flashlight, in the same fab slot the bell
// uses. The bell shows inside a venue and this shows outside one, so they are
// never both up — that mutual exclusion is the whole reason they can share a
// slot, and it's asserted here because nothing else can see it.
import { test, expect } from "@playwright/test";
import { bootIntoGame } from "./_helpers.mjs";

const INDEX_URL = new URL("../../web/index.html", import.meta.url).href;

const goTo = async (page, room) => {
  await page.evaluate(r => { G.room = r; G.visited[r] = true; }, room);
  await page.fill("#term-in", "look");
  await page.press("#term-in", "Enter");
};

test("the compass shows on the street, hides in a venue, and never shares with the bell", async ({ page }) => {
  const pageErrors = [];
  page.on("pageerror", e => pageErrors.push(e.message));
  await bootIntoGame(page, INDEX_URL);

  await goTo(page, "beach_rd_c");                 // a four-way street corner
  await expect(page.locator("#nav-fab")).toBeVisible();
  await expect(page.locator("#bell-fab")).toBeHidden();
  for (const d of ["n", "e", "s", "w"])
    await expect(page.locator(`#nav-fab [data-nav="${d}"]`)).toBeEnabled();

  await goTo(page, "stinky_bar");                 // inside: bell's slot now
  await expect(page.locator("#nav-fab")).toBeHidden();
  await expect(page.locator("#bell-fab")).toBeVisible();

  // a hotel room is a building even though it lists a cardinal exit — one live
  // arrow and three dead ones reads as a broken compass, so it stays hidden
  await goTo(page, "hotel_room");
  await expect(page.locator("#nav-fab")).toBeHidden();

  expect(pageErrors).toEqual([]);
});

test("a dead direction is dimmed, not missing, and a live one walks you", async ({ page }) => {
  await bootIntoGame(page, INDEX_URL);
  // Inside the Soi 6 pocket, which is where bootIntoGame leaves us: the mode
  // confines movement to its own rooms, so walking out of jomtien_beach would
  // be refused and the compass would look broken when it wasn't.
  await goTo(page, "soi6_mid");                   // a straight soi: east and west only
  await expect(page.locator("#nav-fab")).toBeVisible();
  const north = page.locator('#nav-fab [data-nav="n"]');
  await expect(north).toBeVisible();              // the rose keeps its shape…
  await expect(north).toBeDisabled();             // …so your thumb learns one spot per direction

  const before = await page.evaluate(() => G.room);
  await page.locator('#nav-fab [data-nav="e"]').click();
  await expect(async () => {
    expect(await page.evaluate(() => G.room)).not.toBe(before);
  }).toPass();
  // a tap is a typed command, like every other tap in the game
  await expect(page.locator("#term-out .t-echo").last()).toContainText(/^❯ go e$/);
});

test("the flashlight button toggles the torch and reflects its state", async ({ page }) => {
  await bootIntoGame(page, INDEX_URL);
  await goTo(page, "beach_rd_c");
  const light = page.locator('#nav-fab [data-nav="light"]');
  const lit0 = await page.evaluate(() => !!G.lightOn);

  await light.click();
  await expect(async () => {
    expect(await page.evaluate(() => !!G.lightOn)).toBe(!lit0);
  }).toPass();
  await expect(light).toHaveClass(lit0 ? /^(?!.*\bon\b).*$/ : /\bon\b/);
});

test("the chip bar drops the cardinals the compass already shows — and only then", async ({ page }) => {
  // Filtered in term.js, NOT in _chipSet(): the engine keeps offering every
  // exit, because a served or 2D frontend that draws no compass would
  // otherwise lose its only tap route to a cardinal. This asserts the split.
  await bootIntoGame(page, INDEX_URL);
  const chipCmds = () => page.evaluate(() =>
    [...document.querySelectorAll("#chips .chip")].map(b => b.dataset.cmd));

  await goTo(page, "soi6_mid");                    // outdoors: compass is up
  await expect(page.locator("#nav-fab")).toBeVisible();
  const street = await chipCmds();
  expect(street.filter(c => ["n", "s", "e", "w", "in"].includes(c)),
    "cardinals and IN are on the wheel, not doubled in the chips").toEqual([]);
  // the engine still offers them — the view is what dropped them
  const fromEngine = await page.evaluate(() => _chipSet().map(c => c.cmd));
  expect(fromEngine).toContain("e");

  await goTo(page, "hotel_room");                  // indoors: no compass
  await expect(page.locator("#nav-fab")).toBeHidden();
  expect(await chipCmds(), "with no wheel, the chip is the only tap route").toContain("s");
});

test("IN: one door goes straight in, a soi of bars asks which", async ({ page }) => {
  await bootIntoGame(page, INDEX_URL);
  const IN = '#nav-fab [data-nav="in"]';

  // a soi lined with bars carries `venues` and no `in` exit — tapping must not
  // guess for you, it opens the list
  await goTo(page, "soi6_mid");
  await expect(page.locator(IN)).toBeEnabled();
  await page.locator(IN).click();
  await expect(page.locator("#flyout")).toBeVisible();
  const names = await page.evaluate(() =>
    [...document.querySelectorAll("#flyout button")].map(b => b.textContent.trim()));
  expect(names.length).toBeGreaterThan(1);

  // picking one is a typed ENTER, like every other tap
  await page.locator("#flyout button").first().click();
  await expect(page.locator("#term-out .t-echo").last()).toContainText(/^❯ enter /);

  // nothing to enter → the button is dead rather than lying
  await goTo(page, "beach_rd_n");
  const ways = await page.evaluate(() => _navEnter().length);
  if (!ways) await expect(page.locator(IN)).toBeDisabled();
});

test("the flashlight sits under E and still toggles", async ({ page }) => {
  await bootIntoGame(page, INDEX_URL);
  await goTo(page, "soi6_mid");
  const box = await page.locator('#nav-fab [data-nav="light"]').boundingBox();
  const east = await page.locator('#nav-fab [data-nav="e"]').boundingBox();
  expect(Math.abs(box.x - east.x), "same column as E").toBeLessThanOrEqual(2);
  expect(box.y, "the row below it").toBeGreaterThan(east.y);
});

test("an ATM street folds its four chips into one, and the menu still types the commands", async ({ page }) => {
  // Folded in term.js, like the compass chips: the ENGINE still offers all four,
  // so a frontend with no menus keeps every option as its own button.
  await bootIntoGame(page, INDEX_URL);
  const atmRoom = await page.evaluate(() => {
    const id = Object.keys(ROOMS).find(k => ROOMS[k].atm && !ROOMS[k].bar);
    if (id) { G.room = id; G.visited[id] = true; }
    return id || null;
  });
  test.skip(!atmRoom, "no street ATM in the world");
  await page.fill("#term-in", "look");
  await page.press("#term-in", "Enter");

  const cmds = () => page.evaluate(() =>
    [...document.querySelectorAll("#chips .chip")].map(b => b.dataset.cmd));
  const shown = await cmds();
  expect(shown, "one ATM chip, not four").toContain("__atm");
  expect(shown.filter(c => /^withdraw |^check balance$/.test(c)),
    "the four are folded away").toEqual([]);

  // …but the engine still hands them over, unchanged
  const fromEngine = await page.evaluate(() => _chipSet().map(c => c.cmd));
  expect(fromEngine).toContain("withdraw 5000");
  expect(fromEngine).toContain("check balance");

  // pressing it offers them, and picking one types the real command
  await page.locator('#chips .chip[data-cmd="__atm"]').click();
  await expect(page.locator("#flyout")).toBeVisible();
  const rows = await page.evaluate(() =>
    [...document.querySelectorAll("#flyout button")].map(b => b.textContent.trim()));
  expect(rows.length).toBe(4);

  await page.locator("#flyout button").last().click();   // balance
  await expect(page.locator("#term-out .t-echo").last()).toContainText(/^❯ check balance$/);
});
