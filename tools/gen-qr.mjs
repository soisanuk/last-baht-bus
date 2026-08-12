#!/usr/bin/env node
// Regenerate the QR sticker printed by EXAMINE QR at the LK Metro mouth
// (docs/ctf.md — the CTF's secondary pointer).
//
//   cd /tmp && npm i qrcode jsqr && node <repo>/tools/gen-qr.mjs
//
// DEV-ONLY, and deliberately not a repo dependency: the game must stay
// install-free and buildless, so the rendered code is BAKED into
// engine-systems.js as `_QR_STICKER` and nothing at runtime encodes anything.
// Re-run this only if the target URL changes; then paste the block below in.
//
// The round-trip at the bottom is the point. Decoding the encoder's own matrix
// would only prove the encoder works — this parses the exact characters the
// game prints back into a bitmap and decodes THAT, so a rendering bug (a
// dropped column, a wrong glyph, a reflowed line) cannot pass.

// Resolved from the CURRENT WORKING DIRECTORY, not from this file: the deps are
// installed in a scratch dir, and a bare ESM import would look for them in the
// repo's own node_modules and fail the invocation documented above.
import { createRequire } from "node:module";
const require = createRequire(process.cwd() + "/");
const QRCode = require("qrcode");
const jsQR = require("jsqr");

// Keep in sync with `_QR_TARGET` in engine-systems.js — the test pins them.
const TARGET = "https://soisanuk.github.io/last-baht-bus/.well-known/security.txt";
const QUIET = 4; // modules, per spec. Also supplied visually by the .t-qr padding.

// Lowest ECC that fits: this is read off a clean screen, not a greasy bar wall,
// and every level up costs modules, which costs terminal columns.
const qr = QRCode.create(TARGET, { errorCorrectionLevel: "L" });
const n = qr.modules.size, data = qr.modules.data;
const S = n + QUIET * 2;
const at = (x, y) => {
  const mx = x - QUIET, my = y - QUIET;
  return mx >= 0 && my >= 0 && mx < n && my < n && !!data[my * n + mx];
};

// Half-block rendering: each text row carries TWO module rows, which halves the
// printed height and — with the .t-qr line-height — gets the modules close to
// square. Full blocks one-per-module would be twice as tall and twice as wide.
const lines = [];
for (let y = 0; y < S; y += 2) {
  let s = "";
  for (let x = 0; x < S; x++) {
    const up = at(x, y), lo = y + 1 < S ? at(x, y + 1) : false;
    s += up && lo ? "█" : up ? "▀" : lo ? "▄" : " ";
  }
  lines.push(s);
}

// ── verify the printed text, not the encoder ────────────────────────────────
const grid = [];
for (const line of lines) {
  const up = [], lo = [];
  for (const ch of line) {
    up.push(ch === "█" || ch === "▀");
    lo.push(ch === "█" || ch === "▄");
  }
  grid.push(up); if (grid.length < S) grid.push(lo);
}
const SC = 8, W = S * SC;
const buf = new Uint8ClampedArray(W * W * 4);
for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
  const v = grid[(y / SC) | 0][(x / SC) | 0] ? 0 : 255, i = (y * W + x) * 4;
  buf[i] = buf[i + 1] = buf[i + 2] = v; buf[i + 3] = 255;
}
const got = jsQR(buf, W, W);
const ok = got && got.data === TARGET;

console.error(`payload : ${TARGET} (${TARGET.length} chars)`);
console.error(`version : ${qr.version}  modules: ${n}  with quiet zone: ${S}`);
console.error(`printed : ${lines[0].length} cols x ${lines.length} rows`);
console.error(`decoded : ${got ? got.data : "(nothing)"}`);
console.error(`ROUND-TRIP: ${ok ? "OK" : "FAILED"}`);
if (!ok) process.exit(1);

console.log("const _QR_STICKER = [");
for (const l of lines) console.log('  "' + l.replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '",');
console.log('].join("\\n");');
