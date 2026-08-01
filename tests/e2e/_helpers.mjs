// Shared E2E boot. A fresh start now shows the mode-select overlay
// (#start-overlay, see main.js) instead of dropping straight into the game, so
// most specs need to click through it — pick Soi 6, press START — to land in a
// live, playing state. A saved night shows a Continue prompt instead and never
// mounts the menu, so the click is guarded by presence.
export async function bootIntoGame(page, url) {
  await page.goto(url);
  const soi6 = page.locator('.start-mode[data-mode="soi6"]');
  if (await soi6.count()) {
    await soi6.click();
    await page.locator("#start-go").click();
  }
  await page.waitForSelector("#term-in");
  // character creation: the taxi-ride intro (pendingChoice "intro") now gates a
  // fresh boot — answer its three picks so specs land in a live, playing state.
  for (let i = 0; i < 3; i++) {
    const inIntro = await page.evaluate(() => typeof G !== "undefined" && G && G.pendingChoice === "intro");
    if (!inIntro) break;
    await page.fill("#term-in", "1");
    await page.press("#term-in", "Enter");
  }
}
