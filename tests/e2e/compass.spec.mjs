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
