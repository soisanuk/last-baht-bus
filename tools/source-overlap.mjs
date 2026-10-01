#!/usr/bin/env node
// Source-material overlap scan (docs/source-material-policy.md, "The audit").
//
// Compares every line of prose the game prints — the full corpus from
// `tools/prose-corpus.mjs --json` — against a directory of outside writing
// (essays, columns, trip reports) that is kept OUT of this repository, and
// reports shared runs of N words. Stock English (runs made only of function
// words and the genre's furniture) is dropped, so a hit is a phrase, not an idiom.
//
//   node tools/source-overlap.mjs <essay-dir> [--n 6] [--min 2] [--all]
//
//   <essay-dir>   a folder of .txt files, one per source text (never in-repo)
//   --n           run length in words (default 6)
//   --min         report a (source, record) pair only at this many runs (default 2);
//                 --all reports single-run pairs too
//
// The bar for essay-derived content is ZERO pairs at --min 2. Single-run pairs
// are mostly idiom and are printed only with --all; read them, don't count them.
// Exit code is 1 when any pair at --min or more is found, so a shell chain can
// gate on it. Nothing here touches the game or the essays; it only reads.
import { readFileSync, readdirSync, statSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, basename } from "node:path";

const args = process.argv.slice(2);
const dir = args.find(a => !a.startsWith("--"));
if (!dir) { console.error("usage: node tools/source-overlap.mjs <essay-dir> [--n 6] [--min 2] [--all]"); process.exit(2); }
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? Number(args[i + 1]) : d; };
const N = opt("--n", 6), MIN = args.includes("--all") ? 1 : opt("--min", 2);

const STOCK = new Set(("the a an and of in on at to is it that this you he she i we they for with as by be was are not " +
  "but from have has had his her your my our their one do does did so if or no what who all there here out up down " +
  "like just very more than then when which will can about into over only also because some any every first last " +
  "same other way thing time man men woman girl day night money bar back home new old good long little never nothing " +
  "something somebody everybody nobody").split(" "));
const norm = t => String(t).toLowerCase().replace(/[^a-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);

const here = new URL(".", import.meta.url).pathname;
const corpus = execFileSync("node", [join(here, "prose-corpus.mjs"), "--json"], { encoding: "utf8", maxBuffer: 1 << 28 });
const recs = corpus.split("\n").filter(Boolean).map(l => JSON.parse(l));
const shingles = new Map();
for (const r of recs) {
  const w = norm(r.text);
  for (let i = 0; i + N <= w.length; i++) {
    const k = w.slice(i, i + N).join(" ");
    if (!shingles.has(k)) shingles.set(k, new Set());
    shingles.get(k).add(r.ref);
  }
}
const files = readdirSync(dir).filter(f => f.endsWith(".txt") && statSync(join(dir, f)).isFile());
const hits = new Map(); // "source|ref" → Set(run)
for (const f of files) {
  const w = norm(readFileSync(join(dir, f), "utf8"));
  for (let i = 0; i + N <= w.length; i++) {
    const run = w.slice(i, i + N);
    if (run.every(t => STOCK.has(t))) continue;
    const k = run.join(" ");
    const refs = shingles.get(k);
    if (!refs) continue;
    for (const ref of refs) {
      const key = basename(f, ".txt").slice(0, 40) + "|" + ref;
      if (!hits.has(key)) hits.set(key, new Set());
      hits.get(key).add(k);
    }
  }
}
const pairs = [...hits.entries()].filter(([, v]) => v.size >= MIN).sort((a, b) => b[1].size - a[1].size);
const total = [...hits.values()].reduce((a, v) => a + v.size, 0);
console.log(`${recs.length} game records · ${files.length} sources · N=${N} · ${hits.size} pairs, ${total} shared runs in all`);
console.log(pairs.length ? `${pairs.length} pair(s) at ${MIN}+ runs:` : `no pair at ${MIN}+ runs — clean at the policy's bar`);
for (const [key, v] of pairs) {
  const [src, ref] = key.split("|");
  console.log(`${String(v.size).padStart(3)}  ${src.padEnd(40)}  ${ref}\n       e.g. "${[...v][0]}"`);
}
process.exit(pairs.length ? 1 : 0);
