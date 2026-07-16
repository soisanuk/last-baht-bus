// Exhaustive end-to-end walkthrough of The Last Baht Bus (desktop + mobile).
// Cheat-funded (twoweekmillionaire). Walks EVERY room via the exits graph,
// exercises every subsystem (bar social, games, saleng, encounters, quests,
// quiz, hotels, phone, barfine, tonic/REPORT, vacation-end, expat), and
// randomly SAVEs/RESTOREs (page reload → "YES" continue) plus targeted
// reloads inside every modal state — after each restore an invariant check
// asserts the _renderResume contract: whatever gates input must be visibly
// redrawn. Any violation, page error, or dead-end is logged as ✗ FAIL.
// Usage: node tools/e2e-mega.mjs   (output: tools/out/e2e-mega.log)
// Complements tools/walkthrough.mjs (tap-first UX funnel): this one is the
// breadth sweep — full map, all subsystems, restore-invariant fuzzing.
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { chromium, devices } from "@playwright/test";

const INDEX = new URL("../web/index.html", import.meta.url).href;
const OUT = fileURLToPath(new URL("out", new URL(import.meta.url)));
fs.mkdirSync(OUT, { recursive: true });
const LOG = [];
const FAILS = [];
const log = s => LOG.push(s);
const fail = s => { FAILS.push(s); LOG.push("✗ FAIL: " + s); };

// seeded PRNG so the "random" reload/undo points reproduce
let seed = 12345;
const rnd = () => (seed = (seed * 48271) % 2147483647) / 2147483647;

async function run(pass, browser, ctxOpts) {
  log(`\n${"█".repeat(72)}\n  ${pass} PASS\n${"█".repeat(72)}`);
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  page.setDefaultTimeout(5000);
  page.on("pageerror", e => fail(`[${pass}] PAGE ERROR: ${e.message}`));
  await page.goto(INDEX);
  await page.waitForTimeout(500);

  const evalG = (fn, arg) => page.evaluate(fn, arg);
  const lastLines = n => page.evaluate(nn => {
    const out = document.getElementById("term-out");
    return [...out.children].slice(-nn).map(d => d.innerText).join("\n");
  }, n);

  let ncmd = 0, nreload = 0, nundo = 0;
  let keepGame = false; // set around phases that WANT a live game (quiz)
  let chaosOff = false;  // suspend random reload/undo in delicate segments
  async function cmd(c, opts = {}) {
    ncmd++;
    await page.fill("#term-in", c);
    await page.press("#term-in", "Enter");
    await page.waitForTimeout(60);
    if (opts.echo) log(`  ❯ ${c}\n` + (await lastLines(opts.echo)).split("\n").map(l => "    " + l).join("\n"));
    return c;
  }

  // ── the restore invariant: everything gating input must be back on screen ──
  async function verifyResume(where) {
    const st = await evalG(() => ({
      room: G.room, roomName: ROOMS[G.room] ? ROOMS[G.room].name : "??",
      game: G.game && G.game.type, enc: G.pendingEnc,
      encFrag: G.encPrompt && G.encPrompt[0] ? String(G.encPrompt[0][0]).slice(0, 30) : null,
      fare: !!G.pendingFare, choice: G.pendingChoice,
      saleng: !!(G.salengCart && G.salengRoom === G.room),
      salengFrag: G.salengCart ? _SALENG_CARTS[G.salengCart].here.slice(0, 25) : null,
      rain: G.rain > 0, unread: typeof _unreadCount === "function" ? _unreadCount() : 0,
    }));
    const txt = await lastLines(30);
    const need = (cond, frag, label) => {
      if (cond && !txt.includes(frag)) fail(`[${pass}] resume@${where}: ${label} not redrawn (state says it gates input). Last lines:\n${txt.slice(-400)}`);
    };
    if (!txt.includes(st.roomName)) fail(`[${pass}] resume@${where}: room "${st.roomName}" not described after restore`);
    if (st.game) need(true, st.game === "c4" ? "1  2" : st.game === "quiz" ? "?" : "", `live ${st.game} game`);
    if (st.enc && st.encFrag) need(true, st.encFrag, `encounter ${st.enc} prompt`);
    need(st.fare, "PAY <amount>", "fare demand");
    if (st.choice === "vacation_end") need(true, "NEW VACATION", "vacation-end choice");
    if (st.choice === "checkout") need(true, "STAY", "checkout choice");
    if (st.saleng && st.salengFrag) need(true, st.salengFrag, "parked saleng");
    if (st.rain) { if (!/rain|downpour|monsoon/i.test(txt)) fail(`[${pass}] resume@${where}: rain not re-announced`); }
    if (st.unread > 0 && !/unread|📱/.test(txt)) fail(`[${pass}] resume@${where}: unread-texts nudge missing`);
  }

  async function reloadRestore(where) {
    nreload++;
    await page.reload();
    await page.waitForTimeout(400);
    const prompt = await lastLines(3);
    if (!/Continue your night/.test(prompt)) { fail(`[${pass}] reload@${where}: no continue prompt`); return; }
    await cmd("yes");
    await page.waitForTimeout(200);
    await verifyResume(where);
  }

  // ── after-command reflexes: resolve unexpected gates so the route survives ──
  async function settle() {
    for (let i = 0; i < 4; i++) {
      const st = await evalG(() => ({
        bf: !!G.pendingBf,
        enc: G.pendingEnc, fare: G.pendingFare ? G.pendingFare.price : null,
        choice: G.pendingChoice, game: G.game && G.game.type,
        hurt: G.hurt, thirst: G.thirst, hunger: G.hunger, battery: G.battery,
        drunk: G.soc.drunk, over: G.over,
      }));
      if (st.bf) { await cmd("long time"); continue; }
      if (st.enc) { await cmd("no thanks"); continue; }
      if (st.fare) { await cmd("pay " + st.fare); continue; }
      if (st.choice === "vacation_end") { log("  (week over mid-run → NEW VACATION, re-fund)"); await cmd("new vacation"); await cmd("twoweekmillionaire"); continue; }
      if (st.choice === "checkout") { await cmd("stay"); continue; }
      if (st.game && !keepGame) { await cmd("q"); continue; }
      return st;
    }
    return null;
  }

  // maybe inject chaos (used during the map walk only)
  async function chaos(where) {
    if (chaosOff) return;
    const r = rnd();
    if (r < 0.06) await reloadRestore(where);
    else if (r < 0.09) { nundo++; await cmd("undo"); await settle(); }
  }

  // ── walk helper: BFS a path from the current room and execute it ──────────
  async function goTo(target) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const path = await evalG(t => {
        const prev = {}; const q = [G.room]; const seen = { [G.room]: true };
        while (q.length) {
          const r = q.shift();
          if (r === t) break;
          for (const [dir, to] of Object.entries(ROOMS[r].exits || {})) {
            if (!seen[to]) { seen[to] = true; prev[to] = [r, dir]; q.push(to); }
          }
        }
        if (!seen[t]) return null;
        const steps = [];
        for (let r = t; r !== G.room; r = prev[r][0]) steps.unshift(prev[r][1]);
        return steps;
      }, target);
      if (path === null) { log(`  (goTo ${target}: no exits path from ${await evalG(() => G.room)})`); return false; }
      for (const dir of path) {
        // dark-room prep: light on when the NEXT room is dark
        const nxt = await evalG(d => {
          const to = (ROOMS[G.room].exits || {})[d];
          return to && ROOMS[to] ? { dark: !!ROOMS[to].dark, lightOn: G.lightOn } : null;
        }, dir);
        if (nxt && nxt.dark && !nxt.lightOn) await cmd("light on");
        if (nxt && !nxt.dark && nxt.lightOn) await cmd("light off");
        await cmd("go " + dir);
        const st = await settle();
        if (st && (st.thirst > 70)) { await cmd("buy water"); }
        await chaos("walk");
      }
      const here = await evalG(() => G.room);
      if (here === target) return true;
      // derailed (night end respawn etc.) — recompute from wherever we are
    }
    log(`  (goTo ${target} failed after 3 attempts — at ${await evalG(() => G.room)})`);
    return false;
  }

  // ═══ P0: fresh start, fund ════════════════════════════════════════════════
  await evalG(() => localStorage.removeItem("lbb_save"));
  await page.reload();
  await page.waitForTimeout(400);
  await cmd("twoweekmillionaire");
  // finish act 1 instantly so the whole map/systems are open: do it legitimately-ish
  await evalG(() => {
    G.flags.act1Done = true; G.flags.hasWallet = true; G.stage = "vacation";
    G.itemLoc.wallet = "inventory"; G.encDone = Object.fromEntries(Object.keys(ENCOUNTERS).map(k => [k, true]));
    G.day = 2; doCommand("look");
  });
  log(`\n— P0 funded. stage=vacation, ฿2M —`);

  // ═══ P1: visit EVERY room reachable over the exits graph ═══════════════════
  log(`\n— P1: full map walk (every room, look everywhere, random reload/undo) —`);
  const allRooms = await evalG(() => Object.keys(ROOMS));
  const visited = new Set();
  let unreachable = [];
  for (const target of allRooms) {
    const here = await evalG(() => G.room);
    visited.add(here);
    if (visited.has(target)) continue;
    const ok = await goTo(target);
    if (!ok) { unreachable.push(target); continue; }
    visited.add(target);
    await cmd("look");
    await settle();
  }
  // the Darkside is motosai-only by design — ride out, walk the island, ride back
  log("  — Darkside by motosai —");
  chaosOff = true;
  await goTo("buakhao_s");
  await cmd("motosai to darkside", { echo: 2 });
  await settle(); // pays the fare
  for (const r of ["khao_talo", "khao_talo_bar", "sukhumvit_crossing", "lake_mabprachan"]) {
    if (await goTo(r)) { visited.add(r); await cmd("look"); await settle(); }
  }
  await cmd("talk to daeng", { echo: 3 });
  await goTo("sukhumvit_crossing"); // the island's motosai stand is at the crossing
  await cmd("motosai to soi buakhao");
  await settle();
  if (await evalG(() => G.room) === "buakhao_market") log("  back on the mainland ✓");
  else fail(`[${pass}] motosai back from the Darkside failed — at ${await evalG(() => G.room)}`);
  // Madam Oy's office (the Act-1 door trick, flag set directly — the trick
  // itself is vm-tested; this covers the ROOM and its safe prose)
  await goTo("rainbow_girls");
  await evalG(() => { G.flags.officeOpen = true; });
  await cmd("go office", { echo: 3 });
  visited.add(await evalG(() => G.room));
  await cmd("look");
  await cmd("out");
  chaosOff = false;
  const missing = allRooms.filter(r => !visited.has(r));
  log(`  rooms visited: ${visited.size}/${allRooms.length}` +
    (missing.length ? ` — unreachable by exits: ${missing.join(", ")}` : " — full coverage"));

  // ═══ P2: bar life at Candy Bar (social, phone, games, saleng) ══════════════
  log(`\n— P2: bar social + phone + games + saleng —`);
  await evalG(() => { G.day = 2; });   // Candy home; even day
  if (!await goTo("candy_bar")) fail(`[${pass}] P2 could not reach Candy Bar`);
  await cmd("talk to candy", { echo: 4 });
  await cmd("wai candy");
  for (const c of ["buy drink for nan", "buy drink for nan", "buy drink for nan",
    "flirt nan", "tip nan 300", "contact nan", "kiss nan"]) await cmd(c);
  await cmd("buy drink for candy");        // mama treat
  await cmd("ring bell");
  await cmd("buy bra for nan");
  await cmd("throw cover at nan", { echo: 3 });
  await cmd("talk to patron", { echo: 3 });
  await cmd("apologize");
  // messaging
  await cmd("message nan", { echo: 2 });
  await cmd("send 500 to nan", { echo: 2 });
  await cmd("contacts", { echo: 3 });
  // undo + reload inside plain bar state
  await reloadRestore("bar-social");
  // connect 4 — reload MID-GAME (the classic redraw bug)
  await cmd("play connect 4");
  await cmd("4");
  await reloadRestore("mid-c4");
  await cmd("q");
  // jackpot with tutorial — reload mid-tutorial
  await cmd("play jackpot", { echo: 4 });
  await cmd("roll");
  await reloadRestore("mid-jackpot");
  await cmd("q");
  // saleng: park a cart here and reload with it parked
  await evalG(() => { G.salengCart = "food"; G.salengRoom = G.room; G.salengUntil = G.turns + 10; doCommand("look"); });
  await cmd("buy moo ping", { echo: 2 });
  await cmd("buy noodles for nan", { echo: 2 });
  await reloadRestore("saleng-parked");
  // pool at a pool bar
  if (!await goTo("stinky_bar")) fail(`[${pass}] P2 could not reach the Stinky Bar`);
  await cmd("play pool", { echo: 3 });
  await cmd("shoot");
  await reloadRestore("mid-pool");
  await cmd("q");
  await cmd("talk to bert", { echo: 3 });

  // ═══ P3: encounters — fire each, varied reactions, reload inside one ═══════
  log(`\n— P3: encounters (every ENCOUNTERS id, varied reactions) —`);
  const encs = await evalG(() => Object.keys(ENCOUNTERS).map(id => [id, ENCOUNTERS[id].rooms[0], !!ENCOUNTERS[id].interactive]));
  const reactions = {
    katoey: "hold my pockets", brit: "sorry mate", powerbank: "yes please",
    tonic: "follow him to the shop", peddler: "haggle", freelancer: "no thanks",
    bkktourist: "hello", jptourist: "money?", britles: "cheers, which bar is good?",
    punterwife: "hello", bargirl: null, selfbf: "no",
  };
  for (const [id, room, interactive] of encs) {
    if (!await goTo(room)) fail(`[${pass}] P3 could not reach ${room} for ${id}`);
    await evalG(i => { delete G.encDone[i]; _startEnc(i); }, id);
    await page.waitForTimeout(80);
    if (id === "tonic") await reloadRestore("mid-tonic-encounter"); // reload inside a pendingEnc
    if (interactive) {
      const r = reactions[id] !== undefined ? reactions[id] : "no thanks";
      if (r) await cmd(r, { echo: 3 });
      await settle(); // two-steps (shop, jp offer) answered
    }
    log(`  encounter ${id}: done`);
  }
  // the tonic shop fleeced us (or the walk-away branch fired) — file the report
  const owed = await evalG(() => G.tonicOwed);
  if (owed > 0) {
    await goTo("police_station");
    await cmd("report", { echo: 3 });
  } else {
    log("  (tonic: escape branch rolled — no claim to report)");
  }

  // ═══ P4: quests + quiz night ═══════════════════════════════════════════════
  log(`\n— P4: quests + quiz —`);
  await evalG(() => { G.day = 2; });
  await goTo("candy_bar");
  await cmd("talk to candy");
  await cmd("accept sangsom", { echo: 2 });
  await cmd("quests", { echo: 4 });
  await goTo("candy_bar_2");
  await cmd("give sang som to bee", { echo: 3 });
  // quiz: force Thursday in-window at a quiz bar
  await evalG(() => { G.day = 4; G.nightTurn = 25; });
  const quizBar = await evalG(() => _quizBars()[0]);
  keepGame = true;
  await goTo(quizBar);
  await page.waitForTimeout(100);
  const inQuiz = await evalG(() => G.game && G.game.type === "quiz");
  if (inQuiz) {
    await reloadRestore("mid-quiz");
    for (let i = 0; i < 3; i++) { await cmd("1"); await page.waitForTimeout(60); }
    const still = await evalG(() => G.game && G.game.type);
    if (still) await cmd("quit");
    log("  quiz: played (answers submitted)");
  } else fail(`[${pass}] quiz did not start at ${quizBar} on day 4 turn 25`);
  keepGame = false;
  await settle();

  // ═══ P5: hotels, checkout choice reload, barfine, night end, ATM ═══════════
  log(`\n— P5: hotel/checkout/barfine/sleep/ATM —`);
  chaosOff = true;
  await goTo("jomtien_7eleven");
  await cmd("buy charger", { echo: 2 });
  await goTo("hotel_room");
  await cmd("charge phone", { echo: 2 });
  // the desk runs checkout before 19:00 — set the clock AT the desk
  await evalG(() => { G.nightTurn = 5; });
  await cmd("checkout", { echo: 3 });
  if (await evalG(() => G.pendingChoice) !== "checkout")
    fail(`[${pass}] checkout choice did not open (turn ${await evalG(() => G.nightTurn)})`);
  await reloadRestore("mid-checkout");
  await cmd("queen vic inn", { echo: 3 });
  if (await evalG(() => G.hotel) !== "queenvic") fail(`[${pass}] hotel move to Queen Vic failed`);
  await settle();
  // the new room: covers qv_room (up from the pub — the fixed exit)
  await goTo("queen_vic");
  await cmd("talk to terry", { echo: 3 });
  await cmd("up");
  if (await evalG(() => G.room) !== "qv_room") fail(`[${pass}] GO UP as a Queen Vic guest didn't reach qv_room`);
  visited.add("qv_room");
  await cmd("look");
  await cmd("down");
  // move once more to the Metropole and walk in from Buakhao North
  await cmd("up");
  await evalG(() => { G.nightTurn = 5; });
  await cmd("checkout");
  await cmd("lk metropole", { echo: 3 });
  if (await evalG(() => G.hotel) !== "metropole") fail(`[${pass}] hotel move to Metropole failed`);
  await settle();
  await goTo("buakhao_n");
  await cmd("go hotel");
  if (await evalG(() => G.room) !== "metropole_room") fail(`[${pass}] GO HOTEL as a Metropole guest didn't reach the room`);
  visited.add("metropole_room");
  await cmd("look");
  await cmd("withdraw", { echo: 2 });
  chaosOff = false;
  // barfine: favor up a girl then barfine her (ends the night grandly)
  await evalG(() => { G.day = 3; G.nightTurn = 60; });
  await goTo("candy_bar");
  for (let i = 0; i < 5; i++) await cmd("buy drink for bua");
  await cmd("barfine bua", { echo: 4 });
  if (!(await evalG(() => G.room === _hotelRoomId() || G.over || G.day > 3)))
    log("  (barfine: " + (await lastLines(2)).replace(/\n/g, " / ") + ")");
  await settle();
  log("  after barfine: " + JSON.stringify(await evalG(() => ({ day: G.day, room: G.room, happy: G.happy }))));
  await cmd("score", { echo: 3 });

  // ═══ P6: end of week → reload during vacation_end → expat ═════════════════
  log(`\n— P6: vacation end (reload inside the choice) → expat —`);
  await evalG(() => { G.day = 7; G.nightTurn = 99; });
  await cmd("wait 3");
  await settle().catch(() => {});
  // force the choice if the wait resolved it oddly
  const choice = await evalG(() => G.pendingChoice);
  if (choice !== "vacation_end") { await evalG(() => { G.day = 8; _endNight("dawn"); }); await page.waitForTimeout(150); }
  await reloadRestore("vacation-end-choice");
  await cmd("move to pattaya", { echo: 5 });
  await cmd("look", { echo: 3 });
  await cmd("diagnose", { echo: 2 });

  log(`  final coverage: ${visited.size}/${allRooms.length} rooms`);
  log(`\n— ${pass} pass done: ${ncmd} commands, ${nreload} reloads, ${nundo} undos —`);
  await ctx.close();
}

const browser = await chromium.launch();
try {
  await run("DESKTOP", browser, { viewport: { width: 1280, height: 800 } });
  seed = 98765; // different chaos points on mobile
  await run("MOBILE", browser, { ...devices["iPhone 13"], defaultBrowserType: undefined });
} catch (e) {
  fail("HARNESS CRASH: " + e.message + "\n" + e.stack.split("\n").slice(0, 3).join("\n"));
} finally {
  await browser.close();
  log(`\n${"═".repeat(72)}\nTOTAL FAILURES: ${FAILS.length}`);
  for (const f of FAILS) log("  ✗ " + f.split("\n")[0]);
  fs.writeFileSync(OUT + "/e2e-mega.log", LOG.join("\n"));
  console.log(LOG.join("\n"));
}
