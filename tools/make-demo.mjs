// The Last Baht Bus — a narrated demo of the Soi 6 week, built from stills.
// Adapted from the thaicab session's make.mjs (2026-10-29): narration by macOS `say`, one
// 720x1280 still per beat (Playwright at 360x640, DPR 2), ffmpeg crossfades the stills and
// lays every narration clip at its computed time. Each beat here PLAYS the real game — its
// `do` list is typed commands, clicks and evals — then takes the still.
// Needs the Playwright dev install (`npm install && npx playwright install chromium`), ffmpeg,
// and the two macOS voices (EN_VOICE / TH_VOICE override them; `say -v '?'` lists what is installed).
//   node tools/make-demo.mjs                       → ~/Downloads/lbb-soi6-demo.mp4 (OUTFILE moves it)
//   STILLS_ONLY=1 node tools/make-demo.mjs         — stills + timeline, no audio/video (a quick look)
import { createRequire } from "module";
import { execFileSync } from "child_process";
import fs from "fs";
import path from "path";
import os from "os";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const require = createRequire(path.join(ROOT, "package.json"));
// Stills, narration clips and the timeline land outside the repo; DEMO_BUILD moves them.
const OUT = process.env.DEMO_BUILD || path.join(os.tmpdir(), "lbb-demo-build");
const FINAL = process.env.OUTFILE || path.join(os.homedir(), "Downloads", "lbb-soi6-demo.mp4");
const EN_VOICE = process.env.EN_VOICE || "Ava (Premium)";
const TH_VOICE = process.env.TH_VOICE || "Narisa (Enhanced)";
const APP = "file://" + path.join(ROOT, "web", "index.html");
const VW = 360, VH = 640, DPR = 2, FADE = 0.4, FPS = 30;
const LEAD = 0.45, GAP = 0.35, TAIL = 0.9;
const SEED = 424242;   // G.rng after the taxi: the same night on every render

// A beat: { do: [...], cap, audio }. `do` items: "command" (typed + Enter), {click: selector},
// {key: "Escape"}, {eval: "js"} (bare globals: G, CHEATS_ENABLED…), {scene: true|false}, {wait: ms}.
// Cards: { kind: "title"|"outro", title, sub, audio }.
const SEGMENTS = [
  { kind: "title", title: "The Last Baht Bus", sub: "Soi 6 · a Pattaya text adventure",
    audio: [["en", "The Last Baht Bus is a text adventure set in Pattaya, Thailand: the bars, the women who work them, and the men who keep coming back. This is the Soi 6 week. One street, seven nights."]] },
  { do: [{ boot: "age" }], cap: "18+, said up front — one tap, remembered on this device",
    audio: [["en", "It's for adults, and it says so up front. You play a man the town takes for a customer, and you can always say no."]] },
  { do: [{ boot: "mode" }], cap: "The Soi 6 week — any browser, nothing to install",
    audio: [["en", "Pick the Soi 6 week. It runs in any phone or desktop browser, with nothing to install, and it saves as you go."]] },
  { do: [{ boot: "go" }], cap: "Tan drives — and asks three questions",
    audio: [["en", "Tan picks you up at the airport. He drives, and he fixes things. On the way down he asks three questions: what you left behind back home, how you come across in a room, and what you're here for."]] },
  { do: ["2", "2", "1", { eval: `G.rng = ${SEED}; 1` }], cap: "Your answers set who the town thinks you are",
    audio: [["en", "Your answers set your back story and your personality, and the town reads you by them. Then Tan's one piece of advice. In this town, you ask. Nobody reads a sign."]] },
  { do: ["look"], cap: "Cash · clock · day 1 of 7 · drink, food, water, battery",
    audio: [["en", "You start in a room above the Queen Vic, an English pub in the quiet middle of the soi. Along the top: your cash, the clock, the day, and four meters. How drunk you are, food, water, and your phone's battery."]] },
  { do: ["balcony"], cap: "Every command moves the clock",
    audio: [["en", "Every command moves the clock. A night runs from six in the evening to six in the morning, and time is spent like money."]] },
  { do: ["down"], cap: "Every name is a person",
    audio: [["en", "Downstairs, the pub's regulars. Every name in the game is a person, with a history, a voice, and their own read of the street."]] },
  { do: ["out", { scene: true }], cap: "Painted scenes — one tap to open on a phone",
    audio: [["en", "Out on the soi. Rooms come with painted scene art. On a phone it starts folded away, to leave room for the words, and one tap opens it."]] },
  { do: [{ scene: false }, "map"], cap: "About a hundred fronts, five stretches",
    audio: [["en", "Soi 6 is about a hundred bar fronts in five stretches. The map lists the bars you'll get to know, and marks the ones one company has been quietly buying up."]] },
  { do: ["w", "w", { scene: true }], cap: "The west end: the loud end",
    audio: [["en", "The west end is the loud end. Open fronts, the music up, and the girls out on the pavement working everyone who walks past."]] },
  { do: [{ scene: false }, "withdraw 3000"], cap: "The bank's fee, named",
    audio: [["en", "There's an ATM and a seven-eleven. The bank takes its fee, and the morning ledger will account for every baht of it."]] },
  { do: ["enter pink lotus", { scene: true }], cap: "The room tells you who's working",
    audio: [["en", "Walk into a bar and the room tells you who's working tonight."]] },
  { do: [{ scene: false }, "examine licence"], cap: "The paper by the till says whose bar it is",
    audio: [["en", "And the frame by the till says whose bar it really is. Here, the group's own company: the same paper in every room it runs."]] },
  { do: ["out", "e", "e", "enter shady lady", { scene: true }], cap: "A hostess, a mamasan, a cashier",
    audio: [["en", "Back in the quiet middle, the Shady Lady. A small beer bar with a long rail, and three women working it: a hostess, the mamasan who runs the floor, and the cashier at the till."]] },
  { do: [{ scene: false }, "talk to pukky"], cap: "Every Soi 6 hostess is written by hand",
    audio: [["en", "Every hostess on Soi 6 is written by hand. Her own English, her own story, her own reasons for being here. She'll ask you things too. Answer in your own words, or pick a reply."]] },
  { do: ["2"], cap: "Topics come up as chips — tap instead of typing",
    audio: [["en", "Conversation runs on short questions, not free chat. The things she'll talk about come up as chips along the bottom, so you can play it with one thumb."]] },
  { do: [{ click: '#term-out .kw[data-k="npc"]', last: true }, { wait: 400 }], cap: "Tap any name for a wheel of actions",
    audio: [["en", "Tap any name in the text for a wheel of what you can do with that person. Talk, ask, buy a drink."]] },
  { do: [{ key: "Escape" }, "buy pukky a drink"], cap: "สนุก — sanuk, fun — the long-game score",
    audio: [["en", "A lady drink is how the bar earns from her time. A hundred and fifty baht here. That pink number is sanuk, fun, the score that matters over the long game."]] },
  { do: ["ask pukky about family"], cap: "Ask, and she tells you",
    audio: [["en", "Ask about home and you hear it. Her mother and sisters in Isan, and one sister now at university, the first in the family, paid for from this bar."]] },
  { do: ["sawatdee kha"], cap: "Thai is part of the game",
    audio: [["en", "Thai is part of the game. Say hello with the women's ending, and she'll put you right."], ["th", "สวัสดีครับ"], ["en", "One word of Thai buys more than a round of drinks."]] },
  { do: ["tao rai"], cap: "เท่าไหร่ — tao rai — how much?",
    audio: [["th", "เท่าไหร่"], ["en", "How much? The cashier gives you the bar's whole price list. Prices never change behind your back. The only surprise is not asking."]] },
  { do: ["play connect 4", "4", "4"], cap: "Connect Four and Jackpot in every beer bar",
    audio: [["en", "Every beer bar keeps a Connect Four frame and a dice box. The girls play every shift, and they don't let you win."]] },
  { do: ["quit", "ring the bell"], cap: "The bell: a round for the whole room",
    audio: [["en", "Ring the bell and you've bought the whole room a drink, priced per head, so it costs more when the bar is full."]] },
  { do: ["phone"], cap: "Texts, real headlines, the weather",
    audio: [["en", "Your phone keeps the numbers you collect, the texts that follow, and today's real Pattaya headlines and weather. Mind the battery."]] },
  { do: ["time"], cap: "The town keeps its own calendar",
    audio: [["en", "The town keeps its own calendar. Killer pool league every third night, quiz nights, a live band at the weekend."]] },
  { do: ["bye", "out", { eval: "G.nightTurn = 79; 1" }, "wait"], cap: "Later — everything on Soi 6 shuts at two",
    audio: [["en", "Everything on Soi 6 shuts at two. What you do with the night is yours. One bar or ten, one long conversation or none at all."]] },
  { do: [{ eval: "G.room = _hotelRoomId(); 1" }, "sleep", "sleep"], cap: "The morning ledger, to the baht",
    audio: [["en", "Sleep, and the morning ledger squares your night to the baht, and counts your sanuk. Then the neon comes on again, and it's night two."]] },
  { do: ["share"], cap: "A share card for every night",
    audio: [["en", "Every night makes a share card, like a daily puzzle result, for comparing weeks with your mates."]] },
  { kind: "outro", title: "The Last Baht Bus", sub: "Free in your browser<br>soisanuk.github.io/last-baht-bus",
    audio: [["en", "Seven nights on one street. Then play another week, or cancel your ticket home and stay. The Last Baht Bus is free in your browser, at soi sanuk dot github dot io."]] },
];

function say(kind, text, file) {
  const args = kind === "th" ? ["-v", TH_VOICE, "-r", "140"] : ["-v", EN_VOICE, "-r", "178"];
  execFileSync("say", [...args, "-o", file, text]);
  const m = execFileSync("afinfo", [file]).toString().match(/estimated duration:\s*([\d.]+)/);
  if (!m) throw new Error("no duration for " + file);
  return Number(m[1]);
}
const ff = args => execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args]);
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(OUT, { recursive: true });
const STILLS_ONLY = !!process.env.STILLS_ONLY;

// 1. narration clips, and the timeline they imply
const clips = [], starts = []; let t = 0;
SEGMENTS.forEach((seg, i) => {
  starts.push(t);
  let u = t + LEAD;
  seg.audio.forEach(([kind, text], j) => {
    const file = path.join(OUT, `clip-${i}-${j}.aiff`);
    const d = STILLS_ONLY ? text.split(/\s+/).length / 2.9 : say(kind, text, file);
    clips.push({ file, start: u });
    u += d + (j < seg.audio.length - 1 ? GAP : 0);
  });
  t = u + TAIL;
});
const total = t;
console.log(`narration: ${clips.length} clips, ${total.toFixed(1)}s (${(total / 60).toFixed(2)} min)`);

// 2. one 720x1280 still per beat, playing the game for real
const { chromium, devices } = require("@playwright/test");
const browser = await chromium.launch();
const ctx = await browser.newContext({ ...devices["iPhone 13"], viewport: { width: VW, height: VH }, deviceScaleFactor: DPR });
const page = await ctx.newPage();
await page.goto(APP);
await page.addStyleTag({ content: `
  .vid-overlay { position:fixed; inset:0; z-index:9999; display:flex; flex-direction:column; align-items:center;
    justify-content:center; gap:12px; background:#0d0015; text-align:center; padding:24px; }
  .vid-overlay h1 { color:#ff3d8b; font:700 30px/1.15 system-ui, sans-serif; margin:0; text-shadow:0 0 18px #ff006688; }
  .vid-overlay p  { color:#c9a0dc; font:400 15px/1.5 system-ui, sans-serif; margin:0; }
  .vid-overlay.off, .vid-cap.off { display:none; }
  .vid-cap { position:fixed; left:12px; right:12px; bottom:190px; z-index:9998; background:rgba(10,0,20,.94);
    color:#fff; font:600 14.5px/1.4 system-ui, 'Noto Sans Thai', sans-serif; padding:9px 11px; border-radius:9px;
    border:1px solid #ff006670; text-align:center; pointer-events:none; }` });
await page.evaluate(() => {
  const o = document.createElement("div"); o.className = "vid-overlay off"; o.id = "vid-overlay";
  o.innerHTML = "<h1></h1><p></p>"; document.body.appendChild(o);
  const c = document.createElement("div"); c.className = "vid-cap off"; c.id = "vid-cap"; document.body.appendChild(c);
});
const send = async c => { await page.fill("#term-in", c); await page.press("#term-in", "Enter"); await page.waitForTimeout(450); };
let sceneOpen = false;
async function act(a) {
  if (typeof a === "string") return send(a);
  if (a.boot === "age") { await page.waitForSelector("#start-age-ok", { state: "visible" }); return; }
  if (a.boot === "mode") { await page.locator("#start-age-ok").click(); await page.locator('.start-mode[data-mode="soi6"]').click(); return; }
  if (a.boot === "go") { await page.locator("#start-go").click(); await page.waitForSelector("#term-in"); await page.waitForTimeout(500); return; }
  if (a.eval) return page.evaluate(a.eval);
  if (a.key) return page.keyboard.press(a.key);
  if (a.wait) return page.waitForTimeout(a.wait);
  if (a.click) { const loc = page.locator(a.click); await (a.last ? loc.last() : loc.first()).click(); return; }
  if ("scene" in a) {
    if (a.scene !== sceneOpen) { await page.locator("#scene-toggle").click(); sceneOpen = a.scene; await page.waitForTimeout(600); }
    return;
  }
  throw new Error("unknown action " + JSON.stringify(a));
}
const stills = [];
for (let i = 0; i < SEGMENTS.length; i++) {
  const seg = SEGMENTS[i];
  await page.evaluate(() => { document.getElementById("vid-overlay").classList.add("off"); document.getElementById("vid-cap").classList.add("off"); });
  for (const a of seg.do || []) await act(a);
  await page.evaluate(seg => {
    const o = document.getElementById("vid-overlay"), c = document.getElementById("vid-cap");
    if (seg.kind) { o.querySelector("h1").innerHTML = seg.title; o.querySelector("p").innerHTML = seg.sub; o.classList.remove("off"); return; }
    if (seg.cap) { c.textContent = seg.cap; c.classList.remove("off"); }
  }, { kind: seg.kind, title: seg.title, sub: seg.sub, cap: seg.cap });
  await page.waitForTimeout(250);
  const file = path.join(OUT, `still-${String(i).padStart(2, "0")}.png`);
  await page.screenshot({ path: file });
  stills.push(file);
}
await browser.close();
fs.writeFileSync(path.join(OUT, "timeline.json"), JSON.stringify({ total, starts }, null, 1));
if (STILLS_ONLY) { console.log(`stills in ${OUT}`); process.exit(0); }

// 3. narration track: every clip at its computed time
const narration = path.join(OUT, "narration.wav");
const delays = clips.map((c, k) => `[${k}:a]aresample=48000,adelay=${Math.round(c.start * 1000)}:all=1[a${k}]`).join(";");
const mix = clips.map((_, k) => `[a${k}]`).join("") + `amix=inputs=${clips.length}:normalize=0:dropout_transition=0[out]`;
ff([...clips.flatMap(c => ["-i", c.file]), "-filter_complex", `${delays};${mix}`, "-map", "[out]", "-t", String(total), narration]);

// 4. video from the stills: still i lasts until beat i+1 starts, plus the fade that overlaps it
const durs = SEGMENTS.map((_, i) => (i + 1 < SEGMENTS.length ? starts[i + 1] - starts[i] + FADE : total - starts[i]));
const vin = stills.flatMap((f, i) => ["-loop", "1", "-t", durs[i].toFixed(3), "-framerate", String(FPS), "-i", f]);
const norm = stills.map((_, i) => `[${i}:v]fps=${FPS},format=yuv420p,setsar=1,settb=AVTB[v${i}]`).join(";");
let chain = "", prev = "v0";
for (let i = 1; i < stills.length; i++) {
  chain += `;[${prev}][v${i}]xfade=transition=fade:duration=${FADE}:offset=${starts[i].toFixed(3)}[x${i}]`;
  prev = `x${i}`;
}
fs.mkdirSync(path.dirname(FINAL), { recursive: true });
ff([...vin, "-i", narration, "-filter_complex", norm + chain, "-map", `[${prev}]`, "-map", `${stills.length}:a`,
  "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k",
  "-t", String(total), "-movflags", "+faststart", FINAL]);
console.log(`wrote ${FINAL} | ${(total / 60).toFixed(2)} min | ${EN_VOICE} + ${TH_VOICE}`);
