// Player-POV walkthrough of The Last Baht Bus — a QA tool, not a CI test.
//
//   node tools/walkthrough.mjs
//
// Plays the real index.html in headless Chromium two ways:
//   MOBILE  — iPhone-13 viewport + touch, TAP-FIRST: item/name/exit kws, the
//             flyout wheel (incl. dispatched-pointer long-press), chips, CAPS
//             hints, suggest bar, send button, FABs. Every forced keyboard use
//             is logged loudly (⌨️) — that's the metric to keep near zero.
//   DESKTOP — typed commands, for prose pacing and Tab completion.
//
// Output: tools/out/walkthrough.log (step-by-step: what was tapped/typed and
// what the game printed — read it like a session transcript) and
// tools/out/shots/*.png at each beat. Both also useful for README screenshots.
//
// The route mirrors the Act-1 opening (bottles → bus → Candy Bar), then cheats
// into money (twoweekmillionaire) for the sandbox beats: lady drinks, the
// bell, Connect 4, and one street encounter. Encounters are pre-marked done
// for a deterministic route; the tonic tout is fired deliberately at the end.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "@playwright/test";

const ROOT = new URL("..", import.meta.url);
const INDEX = new URL("web/index.html", ROOT).href;
const SHOTS = fileURLToPath(new URL("out/shots", new URL(import.meta.url)));
fs.mkdirSync(SHOTS, { recursive: true });
const LOG = [];
const log = (s) => { LOG.push(s); };

function section(t) { log(`\n${"═".repeat(70)}\n  ${t}\n${"═".repeat(70)}`); }

async function makeStepper(page, mode) {
  page.setDefaultTimeout(4000);
  const outCount = () => page.locator("#term-out > div").count();
  async function newLines(before) {
    await page.waitForTimeout(120);
    const n = await outCount();
    const lines = [];
    for (let i = before; i < n; i++) {
      lines.push(await page.locator("#term-out > div").nth(i).innerText());
    }
    return lines;
  }
  async function record(action, before) {
    const lines = await newLines(before);
    log(`\n▶ ${action}`);
    for (const l of lines) log("  │ " + l.replace(/\n/g, "\n  │ "));
    return lines.join("\n");
  }
  return {
    // tap the LAST occurrence of a kw with this data-v (most recent prose)
    async tapKw(v, pick) {
      const before = await outCount();
      const kw = page.locator(`.kw[data-v="${v}"]`).last();
      await kw.scrollIntoViewIfNeeded();
      await kw.tap();
      await page.waitForTimeout(150);
      const fly = page.locator("#flyout button");
      const nfly = await fly.count();
      if (nfly > 0) {
        const labels = [];
        for (let i = 0; i < nfly; i++) labels.push(await fly.nth(i).innerText());
        log(`\n👆 tap [${v}] → wheel: ${labels.join(" · ")}`);
        if (pick) {
          const want = labels.findIndex(l => l.startsWith(pick));
          if (want < 0) { log(`  ✗ wheel has no "${pick}"`); await page.tap("#term-out"); return ""; }
          await fly.nth(want).tap();
          return await record(`   pick "${labels[want]}"`, before);
        }
        return labels.join("|"); // caller inspects, wheel left open
      }
      return await record(`👆 tap [${v}] (fired instantly)`, before);
    },
    async longPressKw(v) {
      // Playwright's synthetic mouse doesn't deliver pointerdown under touch
      // emulation — dispatch real pointer events, exactly what a finger sends.
      const kw = page.locator(`.kw[data-v="${v}"]`).last();
      await kw.scrollIntoViewIfNeeded();
      await kw.evaluate(el => new Promise(res => {
        const r = el.getBoundingClientRect();
        const o = { bubbles: true, clientX: r.x + 4, clientY: r.y + 4, pointerId: 1 };
        el.dispatchEvent(new PointerEvent("pointerdown", o));
        setTimeout(() => { el.dispatchEvent(new PointerEvent("pointerup", o)); res(); }, 650);
      }));
      await page.waitForTimeout(150);
      const fly = page.locator("#flyout button");
      const labels = [];
      for (let i = 0; i < await fly.count(); i++) labels.push(await fly.nth(i).innerText());
      log(`\n👆⏱ long-press [${v}] → full wheel: ${labels.join(" · ")}`);
      return labels;
    },
    async tapFly(prefix) {
      const before = await outCount();
      const fly = page.locator("#flyout button");
      for (let i = 0; i < await fly.count(); i++) {
        const t = await fly.nth(i).innerText();
        if (t.startsWith(prefix)) {
          await fly.nth(i).tap();
          return await record(`   pick "${t}"`, before);
        }
      }
      log(`  ✗ no wheel button "${prefix}"`);
      return "";
    },
    async tapChip(label) {
      const before = await outCount();
      await page.locator(`.chip`, { hasText: label }).first().tap();
      await page.waitForTimeout(100);
      const val = await page.inputValue("#term-in");
      if (val) { log(`\n👆 chip [${label}] → prefills "${val}"`); return val; }
      return await record(`👆 chip [${label}]`, before);
    },
    async tapSuggest(word) {
      const before = await outCount();
      const chips = page.locator("#term-suggest span");
      const n = await chips.count();
      const all = [];
      for (let i = 0; i < n; i++) all.push(await chips.nth(i).innerText());
      log(`  suggest bar: ${all.join(" · ") || "(empty)"}`);
      const idx = all.findIndex(c => c.startsWith(word));
      if (idx < 0) { log(`  ✗ suggest has no "${word}"`); return false; }
      await chips.nth(idx).tap();
      await page.waitForTimeout(100);
      log(`👆 suggest [${word}] → input now "${await page.inputValue("#term-in")}"`);
      return true;
    },
    async tapSend() {
      const before = await outCount();
      await page.tap("#term-send");
      return await record(`👆 [send] button`, before);
    },
    async tapFab(id) {
      const before = await outCount();
      const vis = await page.locator("#" + id).isVisible();
      if (!vis) { log(`\n✗ FAB #${id} not visible`); return ""; }
      await page.tap("#" + id);
      return await record(`👆 FAB [${id}]`, before);
    },
    async type(cmd, why) {
      const before = await outCount();
      await page.fill("#term-in", cmd);
      await page.press("#term-in", "Enter");
      return await record(`⌨️  TYPED "${cmd}"${why ? `  ← ${why}` : ""}`, before);
    },
    async shot(name) {
      await page.waitForTimeout(200);
      await page.screenshot({ path: `${SHOTS}/${name}.png` });
      log(`  📸 ${name}.png`);
    },
    async lastLines(n) {
      const total = await outCount();
      const lines = [];
      for (let i = Math.max(0, total - n); i < total; i++) {
        lines.push(await page.locator("#term-out > div").nth(i).innerText());
      }
      return lines.join("\n");
    },
    outCount,
    record,
  };
}

// ─── MOBILE PASS ────────────────────────────────────────────────────────────
async function mobilePass(browser) {
  section("MOBILE PASS — iPhone 13, touch, tap-first (keyboard = failure noise)");
  const ctx = await browser.newContext({
    ...devices["iPhone 13"],
    defaultBrowserType: undefined,
  });
  const page = await ctx.newPage();
  page.on("pageerror", e => log("‼️ PAGE ERROR: " + e.message));
  await page.goto(INDEX);
  await page.waitForTimeout(600);
  const S = await makeStepper(page, "mobile");

  // keep the scripted route deterministic (encounters get their own beat below)
  await page.evaluate(() => {
    G.encDone = Object.fromEntries(Object.keys(ENCOUNTERS).map(k => [k, true]));
  });

  log("\n—— the opening screen, as a new player sees it ——");
  log(await S.lastLines(8));
  await S.shot("m01-intro");

  // Act 1 opening, tap-first
  await S.tapKw("empty Chang bottle", "take");
  await S.tapKw("e");                       // exits-line tap fires instantly
  await S.tapKw("empty Singha bottle", "take");
  // the receipt is in inventory — surface it via the inv chip, then tap it
  await S.tapChip("inv");
  await S.tapKw("7-Eleven receipt", "read");
  await S.shot("m02-receipt");

  // the dark stretch: back W to the beach, N to Dongtan (dark), grab the Leo,
  // E returns to the road. All chips + item taps.
  await S.tapChip("light");
  await S.tapChip("W");
  await S.tapChip("N");
  await S.tapKw("empty Leo bottle", "take");
  await S.tapChip("E");
  await S.tapChip("light");

  // selling the bottles — is there a tap path?
  log("\n—— looking for a tap path to SELL BOTTLES ——");
  const hasSell = await page.locator('.kw[data-v*="SELL"]').count();
  log(`  SELL caps-hint on screen: ${hasSell ? "yes" : "NO"}`);
  if (hasSell) await S.tapKw(await page.locator('.kw[data-v*="SELL"]').last().getAttribute("data-v"));
  else await S.type("sell bottles", "no tap path to selling");

  // to the bus
  await S.tapChip("N");
  log("\n—— hailing the bus: tap path? ——");
  const busHint = await page.locator('.kw[data-k="cmd"]').allInnerTexts();
  log(`  cmd hints on screen: ${busHint.join(" · ") || "(none)"}`);
  // minimal-keyboard path: 2 letters + suggest chips
  await page.fill("#term-in", "ri");
  await page.locator("#term-in").dispatchEvent("input");
  await page.waitForTimeout(120);
  await S.tapSuggest("ride bus to");
  await S.tapSuggest("beach road");   // prefix-matches "beach road south"
  await S.tapSend();
  // the fare
  log("\n—— paying the fare: tap path? ——");
  const fareHints = await page.locator('.kw[data-k="cmd"]').allInnerTexts();
  log(`  cmd hints now: ${fareHints.slice(-4).join(" · ")}`);
  const payHint = page.locator('.kw[data-k="cmd"][data-v*="PAY"]').last();
  if (await payHint.count()) {
    await S.tapKw(await payHint.getAttribute("data-v")); // opens the wheel
    await S.tapFly("pay");                               // prefills "pay "
    const v = await page.inputValue("#term-in");
    log(`  input prefilled "${v}" — can the amount be tapped?`);
    await page.locator("#term-in").dispatchEvent("input");
    await page.waitForTimeout(120);
    if (await S.tapSuggest("15")) await S.tapSend();
    else await S.type(v + "15", "AMOUNT MUST BE TYPED — suggest bar offers nothing");
  } else {
    await S.type("pay 15", "no PAY hint to tap");
  }
  await S.shot("m03-busride");

  // walk to Candy Bar (test route: e, e, n, in)
  await S.tapChip("E"); await S.tapChip("E"); await S.tapChip("N");
  // enter by tapping the bar's own name in the "Step inside:" line
  await S.tapKw("Candy Bar");
  await S.shot("m04-candybar");

  // the social loop by wheel
  await S.tapKw("Candy", "talk");
  await S.tapKw("Candy");            // open wheel, leave it open for the shot
  await S.shot("m05-wheel");
  await S.tapFly("ask about");       // prefills "ask candy about "
  await page.waitForTimeout(150);
  await S.tapSuggest("wallet");
  await S.tapSend();

  // a hostess: full wheel via long-press
  const hostess = await page.evaluate(() => {
    const here = _npcsHere().filter(id => NPC_ROLES[id] === "hostess");
    return here.length ? NPCS[here[0]].name : null;
  });
  if (hostess) {
    await S.longPressKw(hostess);
    await S.shot("m06-fullwheel");
    await S.tapFly("talk");
  }

  // sandbox: cheat into money, then bar life (harness shortcut, noted)
  section("MOBILE — sandbox beats (cheat-funded, testing bar life by tap)");
  await S.type("twoweekmillionaire", "harness shortcut to fund the sandbox");
  if (hostess) {
    await S.tapKw(hostess, "buy her a drink");
    await S.tapKw(hostess, "buy her a drink");
  }
  await S.tapFab("bell-fab");
  await S.shot("m07-bell");

  // a mini-game by taps: PLAY hint fans out
  const playHint = page.locator('.kw[data-k="cmd"][data-v="PLAY"]').last();
  log("\n—— starting a bar game by tap ——");
  if (await playHint.count()) {
    await playHint.tap(); await page.waitForTimeout(150);
    await S.tapFly("play connect");
  } else {
    await S.type("play connect 4", "no PLAY hint visible in scrollback");
  }
  await S.shot("m08-c4");
  // drop counters by tapping the column row
  for (const col of ["4", "4", "5"]) {
    const t = page.locator(`.kw[data-k="cmd"][data-v="${col}"]`).last();
    if (await t.count()) { const b = await S.outCount(); await t.tap(); await S.record(`👆 tap column [${col}]`, b); }
  }
  const q = page.locator('.kw[data-k="cmd"][data-v="Q"]').last();
  if (await q.count()) { const b = await S.outCount(); await q.tap(); await S.record("👆 tap [Q] to quit", b); }

  // one street encounter's tap-flow: the tonic tout's BUY/SHOP/NO hints
  section("MOBILE — encounter reaction by tap (tonic tout)");
  await S.tapChip("out");
  await page.evaluate(() => { G.room = "beach_rd_c"; delete G.encDone.tonic; _startEnc("tonic"); });
  await page.waitForTimeout(200);
  log(await S.lastLines(4));
  const noHint = page.locator('.kw[data-k="cmd"][data-v="NO"]').last();
  if (await noHint.count()) { const b = await S.outCount(); await noHint.tap(); await S.record("👆 tap [NO]", b); }
  else await S.type("no thanks", "no tappable NO hint");
  await S.shot("m09-encounter");

  await ctx.close();
}

// ─── DESKTOP PASS ───────────────────────────────────────────────────────────
async function desktopPass(browser) {
  section("DESKTOP PASS — 1280×800, typed play, prose pacing");
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.on("pageerror", e => log("‼️ PAGE ERROR: " + e.message));
  await page.goto(INDEX);
  await page.waitForTimeout(600);
  const S = await makeStepper(page, "desktop");
  await page.evaluate(() => {
    G.encDone = Object.fromEntries(Object.keys(ENCOUNTERS).map(k => [k, true]));
  });
  log("\n—— opening ——");
  log(await S.lastLines(8));
  for (const c of ["look", "x receipt", "take bottle", "e", "take bottle", "sell bottles",
    "diagnose", "smell", "listen", "help"]) {
    await S.type(c);
  }
  await S.shot("d01-desktop");
  // Tab completion check
  await page.fill("#term-in", "ta");
  await page.press("#term-in", "Tab");
  log(`\n⌨️  Tab on "ta" → input: "${await page.inputValue("#term-in")}"`);
  await page.fill("#term-in", "");
  await ctx.close();
}

// step guard: a failed locator logs and the walkthrough continues
async function safe(label, fn) {
  try { return await fn(); } catch (e) { LOG.push(`\n✗ step failed [${label}]: ${e.message.split("\n")[0]}`); }
}

const browser = await chromium.launch();
try {
  await mobilePass(browser);
  await desktopPass(browser);
} catch (e) {
  log("\n‼️ WALKTHROUGH CRASHED: " + e.message + "\n" + e.stack.split("\n").slice(0, 4).join("\n"));
} finally {
  await browser.close();
  fs.writeFileSync(SHOTS + "/../walkthrough.log", LOG.join("\n"));
  console.log("\n(log: tools/out/walkthrough.log · shots: tools/out/shots/)");
  console.log(LOG.join("\n"));
}
