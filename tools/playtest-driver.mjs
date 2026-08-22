#!/usr/bin/env node
// Persona-playtest harness (dev-only). One reusable driver so blind-playtest
// agents spend tokens on PLAYING AND JUDGING, not on reinventing Playwright
// plumbing — every agent in the 2026-08-17 rounds hand-built (and mis-built)
// exactly this at ~50-80k tokens a time. Not part of any test suite.
//
//   node tools/playtest-driver.mjs start --dir <sessionDir> [--mobile] [--fresh] [--url <url>]
//   node tools/playtest-driver.mjs cmd   --dir <sessionDir> "beer" "talk to lek" ...
//   node tools/playtest-driver.mjs tap   --dir <sessionDir> "Pinky"        # chip/keyword/button by visible text
//   node tools/playtest-driver.mjs wheel --dir <sessionDir> "Lek" [n]     # open flyout on a keyword; list or pick action n
//   node tools/playtest-driver.mjs fab   --dir <sessionDir> bell|msg|font|mute|n|s|e|w|in|light
//   node tools/playtest-driver.mjs state --dir <sessionDir>               # G snapshot + chips + exits + start menu + device mode (JSON)
//   node tools/playtest-driver.mjs menu  --dir <sessionDir>               # the start screen's buttons (it lives outside the transcript)
//   node tools/playtest-driver.mjs overflow --dir <sessionDir>            # doc + chips scroll widths
//   node tools/playtest-driver.mjs shot  --dir <sessionDir> <name>        # screenshot -> <dir>/<name>.png
//   node tools/playtest-driver.mjs errors --dir <sessionDir>              # console/page errors so far
//   node tools/playtest-driver.mjs raw   --dir <sessionDir> "<js expr>"   # escape hatch, eval in page
//   node tools/playtest-driver.mjs stop  --dir <sessionDir>
//
// Design notes (the bugs previous ad-hoc drivers hit, solved here once):
// - Transcript deltas come from a MutationObserver ledger (window.__ptLines),
//   NOT from counting #term-out children — term.js prunes old lines at a
//   scrollback cap, which silently corrupts count-based capture mid-session.
// - The daemon holds one persistent headless browser; every client invocation
//   is a tiny HTTP call, so an agent plays in cheap batches: cmd a few inputs,
//   read the delta, decide, repeat. If the daemon dies, `start` again — the
//   game's own autosave (lbb_save) restores via the continue prompt, which is
//   itself part of the game and worth exercising.
// - Everything goes through the REAL UI (type + Enter, real clicks), so what
//   the agent tests is what a player touches.

import { mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import http from "node:http";
import path from "node:path";

const args = process.argv.slice(2);
const verb = args[0];
function opt(name, dflt) {
  const i = args.indexOf("--" + name);
  return i !== -1 ? args[i + 1] : dflt;
}
const rest = [];
for (let i = 1; i < args.length; i++) {
  if (args[i].startsWith("--")) { i++; continue; }
  rest.push(args[i]);
}
const dir = opt("dir");
if (!verb || !dir) {
  console.error("usage: playtest-driver.mjs <start|cmd|tap|wheel|fab|state|overflow|shot|errors|raw|stop> --dir <sessionDir> [...]");
  process.exit(2);
}
mkdirSync(dir, { recursive: true });
const portFile = path.join(dir, "port");

// ── the daemon ───────────────────────────────────────────────────────────────
if (verb === "serve") {
  const { chromium, devices } = await import("@playwright/test");
  const mobile = args.includes("--mobile");
  const url = opt("url",
    "file://" + fileURLToPath(new URL("../web/index.html", import.meta.url)));
  const browser = await chromium.launch();
  const ctxOpts = mobile
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
    : { viewport: { width: 1280, height: 900 } };
  const context = await browser.newContext(ctxOpts);
  const page = await context.newPage();
  await page.addInitScript(m => { window.MOBILE = m; }, mobile); // the page can report its device mode
  const errors = [];
  page.on("pageerror", e => errors.push({ t: "pageerror", m: String(e && e.message || e) }));
  page.on("console", m => { if (m.type() === "error") errors.push({ t: "console", m: m.text() }); });
  // --fresh: wipe localStorage before any page script runs, so the game boots to
  // a clean splash instead of inheriting a stale autosave from an earlier session
  // sharing this daemon's browser (both round-three testers hit this). Opt-in, so
  // the default still exercises the real continue-prompt/autosave path.
  if (args.includes("--fresh")) {
    // once per daemon, not on every navigation — an init script re-runs on reload,
    // which wiped any localStorage gate a tester set (lbb_full_on) the moment
    // they reloaded to apply it (round-five testers, 2026-08-22)
    await page.addInitScript(() => {
      try {
        if (!sessionStorage.getItem("__ptFresh")) { localStorage.clear(); sessionStorage.setItem("__ptFresh", "1"); }
      } catch (e) {}
    });
  }
  // the prune-proof transcript ledger, reinstalled on every navigation
  await page.addInitScript(() => {
    window.__ptLines = [];
    const arm = () => {
      const out = document.getElementById("term-out");
      if (!out) return setTimeout(arm, 50);
      new MutationObserver(muts => {
        for (const mu of muts) for (const n of mu.addedNodes) {
          if (n.nodeType === 1 && n.classList && n.classList.contains("t-line"))
            window.__ptLines.push(n.textContent);
        }
      }).observe(out, { childList: true });
    };
    arm();
  });
  await page.goto(url);

  const handlers = {
    async cmd({ inputs }) {
      for (const c of inputs) {
        await page.fill("#term-in", String(c)).catch(() => {});
        await page.keyboard.press("Enter");
        await page.waitForTimeout(120);
      }
      await page.waitForTimeout(180);
      return {};
    },
    async tap({ text }) {
      // chips, decorated keywords, start-menu buttons, any visible button — in that order
      const sels = [
        `#chips button:has-text("${text}")`,
        `#term-out b.kw:has-text("${text}")`,
        `button:has-text("${text}")`,
      ];
      for (const s of sels) {
        const el = page.locator(s).last();
        if (await el.count()) { await el.click().catch(() => {}); await page.waitForTimeout(250); return { hit: s }; }
      }
      return { hit: null };
    },
    async wheel({ text, pick }) {
      const kw = page.locator(`#term-out b.kw:has-text("${text}")`).last();
      if (!await kw.count()) return { actions: null };
      await kw.click({ button: "right" }).catch(() => {});
      await page.waitForTimeout(200);
      const actions = await page.$$eval("#flyout button", bs => bs.map(b => b.textContent.trim()));
      if (pick != null && actions[pick]) {
        await page.locator("#flyout button").nth(pick).click().catch(() => {});
        await page.waitForTimeout(250);
      } else {
        await page.keyboard.press("Escape").catch(() => {});
      }
      return { actions };
    },
    async fab({ which }) {
      const map = { bell: "#bell-fab", msg: "#msg-fab", font: "#font-fab", mute: "#mute-btn" };
      const sel = map[which] || `#nav-fab [data-nav="${which}"]`;
      const el = page.locator(sel);
      if (!await el.count()) return { hit: null };
      await el.click().catch(() => {});
      await page.waitForTimeout(250);
      return { hit: sel };
    },
    // the splash lives OUTSIDE the transcript ledger, so `start` printed only the
    // status header (harness re-review 2026-08-22): report the start screen's
    // visible buttons (and which are disabled) so a blind agent can see the menu
    async menu() {
      return await page.evaluate(() => {
        const ov = document.getElementById("start-overlay");
        if (!ov || ov.hidden) return { splash: false, buttons: [] };
        const lab = b => { // the button's label without its description span
          const t = b.textContent.trim().replace(/\s+/g, " ");
          const d = b.querySelector(".start-mode-desc");
          return d ? t.replace(d.textContent.trim().replace(/\s+/g, " "), "").trim() : t;
        };
        const buttons = [...ov.querySelectorAll("button")]
          .filter(b => b.offsetParent !== null)
          .map(b => ({ label: lab(b), disabled: !!b.disabled }));
        return { splash: true, buttons };
      });
    },
    async state() {
      return await page.evaluate(() => {
        const g = (typeof G !== "undefined" && G) ? {
          room: G.room, day: G.day, nightTurn: G.nightTurn, money: G.money,
          happy: G.happy, drunk: G.soc && G.soc.drunk, hurt: G.hurt, battery: G.battery,
          stage: G.stage, mode: G.mode, pendingEnc: G.pendingEnc,
          pendingChoice: G.pendingChoice, game: G.game && G.game.type,
        } : null;
        const chips = [...document.querySelectorAll("#chips button")].map(b => b.textContent.trim());
        const exits = [...document.querySelectorAll('#term-out b.kw[data-k="exit"]')].slice(-8).map(b => b.textContent);
        const ov = document.getElementById("start-overlay");
        const menu = (ov && !ov.hidden) ? [...ov.querySelectorAll("button")].filter(b => b.offsetParent !== null)
          .map(b => { const t = b.textContent.trim().replace(/\s+/g, " "); const d = b.querySelector(".start-mode-desc");
            return (d ? t.replace(d.textContent.trim().replace(/\s+/g, " "), "").trim() : t) + (b.disabled ? " (disabled)" : ""); }) : null;
        return { g, chips, exits, menu, mobile: MOBILE };
      });
    },
    async overflow() {
      return await page.evaluate(() => ({
        innerW: innerWidth,
        docSW: document.scrollingElement.scrollWidth,
        chipsSW: (document.getElementById("chips") || {}).scrollWidth || 0,
        bodyFontPx: getComputedStyle(document.body).fontSize,
      }));
    },
    async shot({ name }) {
      const p = path.join(dir, (name || "shot") + ".png");
      await page.screenshot({ path: p });
      return { path: p };
    },
    async errors() { return { errors }; },
    async raw({ js }) {
      try { return { value: await page.evaluate(js) }; }
      catch (e) { return { error: String(e && e.message || e) }; }
    },
    async lines({ from }) {
      const all = await page.evaluate(() => window.__ptLines || []);
      return { lines: all.slice(from || 0), total: all.length };
    },
    // `start --fresh` against a LIVE daemon: wipe the page's storage and reload, so
    // the documented "clean boot" holds whether or not a daemon already exists
    // (harness review 2026-08-22: it used to print "daemon already running" and
    // leave the stale session in place).
    async fresh() {
      await page.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} });
      // keep the once-per-daemon wipe marker out of the way so the init script
      // doesn't re-wipe on every later reload
      await page.addInitScript(() => { try { sessionStorage.setItem("__ptFresh", "1"); } catch (e) {} });
      await page.reload();
      await page.waitForTimeout(800);
      return { fresh: true };
    },
    async stop() { setTimeout(() => process.exit(0), 200); return { bye: true }; },
  };

  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", d => body += d);
    req.on("end", async () => {
      try {
        const { op, params } = JSON.parse(body || "{}");
        const out = await (handlers[op] ? handlers[op](params || {}) : { error: "bad op" });
        res.end(JSON.stringify(out));
      } catch (e) { res.end(JSON.stringify({ error: String(e && e.message || e) })); }
    });
  });
  server.listen(0, "127.0.0.1", () => {
    writeFileSync(portFile, String(server.address().port));
    console.log("daemon up on", server.address().port);
  });
} else if (verb === "start") {
  if (existsSync(portFile)) {
    let live = null;
    try { live = await call("state"); } catch { rmSync(portFile); }
    if (live && !!live.mobile !== args.includes("--mobile")) {
      // the device mode is fixed at context creation — a live desktop daemon can't
      // become a phone by reload (harness re-review 2026-08-22): recreate it
      console.log(`daemon already running in ${live.mobile ? "mobile" : "desktop"} mode — recreating for ${args.includes("--mobile") ? "mobile" : "desktop"}`);
      try { await call("stop"); } catch {}
      rmSync(portFile, { force: true });
      await new Promise(r => setTimeout(r, 500));
      live = null;
    }
    if (live) {
      if (args.includes("--fresh")) {
        // a live daemon + --fresh = reset it in place (storage wiped, page reloaded)
        await call("fresh");
        writeFileSync(path.join(dir, "cursor"), "0");
        console.log("daemon already running — reset to a clean boot (--fresh)");
        console.log(await menuLine());
        console.log(await delta());
      } else {
        console.log("daemon already running (state kept; use `start --fresh` to reset it, or `stop` first)");
        console.log(await menuLine());
      }
      process.exit(0);
    }
  }
  const child = spawn(process.execPath,
    [fileURLToPath(import.meta.url), "serve", "--dir", dir,
     ...(args.includes("--mobile") ? ["--mobile"] : []),
     ...(args.includes("--fresh") ? ["--fresh"] : []),
     ...(opt("url") ? ["--url", opt("url")] : [])],
    { detached: true, stdio: "ignore" });
  child.unref();
  for (let i = 0; i < 100; i++) {
    if (existsSync(portFile)) break;
    await new Promise(r => setTimeout(r, 100));
  }
  if (!existsSync(portFile)) { console.error("daemon failed to start"); process.exit(1); }
  writeFileSync(path.join(dir, "cursor"), "0");
  await new Promise(r => setTimeout(r, 800));
  console.log(await menuLine()); // the start screen's buttons (it lives outside the transcript)
  console.log(await delta()); // the boot screen
} else {
  // ── thin client verbs ──────────────────────────────────────────────────────
  const ops = {
    cmd: async () => { await call("cmd", { inputs: rest }); console.log(await delta()); },
    tap: async () => {
      const r = await call("tap", { text: rest[0] });
      if (!r.hit) console.log("(nothing tappable matched: " + rest[0] + ")");
      console.log(await delta());
    },
    wheel: async () => {
      const r = await call("wheel", { text: rest[0], pick: rest[1] != null ? +rest[1] : null });
      if (r.actions) console.log("wheel: " + r.actions.map((a, i) => `[${i}] ${a}`).join("  "));
      else console.log("(no keyword: " + rest[0] + ")");
      console.log(await delta());
    },
    fab: async () => {
      const r = await call("fab", { which: rest[0] });
      if (!r.hit) console.log("(fab not visible: " + rest[0] + ")");
      console.log(await delta());
    },
    state: async () => console.log(JSON.stringify(await call("state"), null, 1)),
    menu: async () => console.log(await menuLine()),
    overflow: async () => console.log(JSON.stringify(await call("overflow"))),
    shot: async () => console.log(JSON.stringify(await call("shot", { name: rest[0] }))),
    errors: async () => console.log(JSON.stringify(await call("errors"), null, 1)),
    raw: async () => console.log(JSON.stringify(await call("raw", { js: rest.join(" ") }))),
    stop: async () => { try { await call("stop"); } catch {} rmSync(portFile, { force: true }); console.log("stopped"); },
  };
  if (!ops[verb]) { console.error("unknown verb: " + verb); process.exit(2); }
  await ops[verb]();
}

async function call(op, params) {
  const port = readFileSync(portFile, "utf8").trim();
  const res = await fetch(`http://127.0.0.1:${port}/`, {
    method: "POST", body: JSON.stringify({ op, params }),
  });
  const out = await res.json();
  if (out.error) throw new Error(out.error);
  return out;
}

// new transcript lines since the stored cursor, with a compact status header
// The start screen is outside the transcript ledger; describe its buttons.
async function menuLine() {
  try {
    const m = await call("menu");
    if (!m.splash) return "";
    return "start menu: " + m.buttons.map(b => `[${b.label}${b.disabled ? " — disabled" : ""}]`).join(" ") +
      "  (tap one by its text; the full game needs `toggle full` first — see the doc)";
  } catch { return ""; }
}

async function delta() {
  const cursorFile = path.join(dir, "cursor");
  const from = existsSync(cursorFile) ? +readFileSync(cursorFile, "utf8") : 0;
  const { lines, total } = await call("lines", { from });
  writeFileSync(cursorFile, String(total));
  const st = await call("state");
  const g = st.g;
  const head = g
    ? `── [${g.room} · day ${g.day} · nt ${g.nightTurn} · ฿${g.money} · สนุก ${g.happy}` +
      (g.pendingEnc ? ` · ENC:${g.pendingEnc}` : "") +
      (g.pendingChoice ? ` · CHOICE:${g.pendingChoice}` : "") +
      (g.game ? ` · GAME:${g.game}` : "") + `] ──`
    : "── [pre-game] ──";
  return head + "\n" + lines.join("\n");
}
