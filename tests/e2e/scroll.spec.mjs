// Where the view lands after a command. A one-line reply should settle at the
// bottom (where the eye already is); a WALL — a night ending prints the
// barfine, the wake-up, the rent, the hangover and a fresh room description in
// one turn — should put the START of that wall at the top and let you read
// down. Pinning to the bottom scrolls the line you were reading off the screen,
// which is what a playtester hit the morning after a barfine.
//
// DOM-only by nature: scroll geometry is invisible to the vm suite.
import { test, expect } from "@playwright/test";
import { bootIntoGame } from "./_helpers.mjs";

const INDEX_URL = new URL("../../web/index.html", import.meta.url).href;

// distance from the top of the container to the top of the last echoed command
const echoOffset = page => page.evaluate(() => {
  const out = document.getElementById("term-out");
  const echoes = out.querySelectorAll(".t-echo");
  const last = echoes[echoes.length - 1];
  if (!last) return null;
  return Math.round(last.getBoundingClientRect().top - out.getBoundingClientRect().top);
});

test("a short reply settles at the bottom, keeping the previous exchange in view", async ({ page }) => {
  await bootIntoGame(page, INDEX_URL);
  await page.fill("#term-in", "time");
  await page.press("#term-in", "Enter");
  const atBottom = await page.evaluate(() => {
    const o = document.getElementById("term-out");
    return o.scrollHeight - o.clientHeight - o.scrollTop;
  });
  expect(atBottom, "a short reply still pins to the bottom").toBeLessThanOrEqual(2);
});

test("a wall of output starts at the top of the view, not the end", async ({ page }) => {
  await bootIntoGame(page, INDEX_URL);
  // HELP is the longest single output in the game — comfortably taller than the
  // viewport, which is the condition that changes the behaviour.
  await page.fill("#term-in", "help");
  await page.press("#term-in", "Enter");

  const off = await echoOffset(page);
  expect(off, "the echoed command should be at (or very near) the top").not.toBeNull();
  expect(Math.abs(off)).toBeLessThanOrEqual(4);

  // and there is genuinely more below — i.e. we did NOT just land at the end
  const below = await page.evaluate(() => {
    const o = document.getElementById("term-out");
    return o.scrollHeight - o.clientHeight - o.scrollTop;
  });
  expect(below, "a wall leaves unread text below the fold").toBeGreaterThan(20);
});

test("output that merely tips past the viewport still pins to the bottom", async ({ page }) => {
  // The anchor is for WALLS, not for anything that overflows by a line. Two
  // commands in a row behaving differently because one printed a paragraph more
  // is what made this feel like the scrollback moved on its own.
  await bootIntoGame(page, INDEX_URL);
  await page.fill("#term-in", "look");
  await page.press("#term-in", "Enter");
  const fresh = await page.evaluate(() => {
    const out = document.getElementById("term-out");
    const es = out.querySelectorAll(".t-echo");
    const last = es[es.length - 1];
    const top = out.scrollTop + (last.getBoundingClientRect().top - out.getBoundingClientRect().top);
    return { newH: out.scrollHeight - top, view: out.clientHeight,
             gap: out.scrollHeight - out.clientHeight - out.scrollTop };
  });
  // only meaningful while LOOK is under the wall threshold — assert the rule it lands on
  if (fresh.newH < fresh.view * 1.5) {
    expect(fresh.gap, "sub-wall output stays pinned to the bottom").toBeLessThanOrEqual(2);
  }
});
