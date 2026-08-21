#!/usr/bin/env node
// Layer 2 of the prose-defect strategy (docs/prose-defects.md): turn prose into
// CLAIMS about the world, then check the claims mechanically — forever, with no
// model in the loop.
//
//   node tools/prose-claims.mjs --slots        # attribute conflicts per subject
//   node tools/prose-claims.mjs --locations    # "X works at Y" vs where X is
//   node tools/prose-claims.mjs --affordances  # invitations vs the verb set
//   node tools/prose-claims.mjs                # all three
//   node tools/prose-claims.mjs --json         # machine-readable findings
//
// The doctrine, one level up from "finding is node, judging is the model":
// EXTRACTION is mechanical where it can be (a vocabulary per attribute slot),
// and the model's job shrinks to adjudicating the handful of conflicts that
// come out. A conflict is a QUESTION, not a verdict — a character may honestly
// own a car and a motorbike — so genuine ones are recorded in CLAIMS_OK below
// with the reason, exactly like the reference lint's collision list.
//
// Why slots and not free-form NLP: the minibus bug was two values in one slot
// (vehicle) for one subject (Tan). That shape is cheap to detect and covers the
// defects that actually happened; anything cleverer is speculative.

import fs from "node:fs";
import vm from "node:vm";
import { execFileSync } from "node:child_process";

const JS = new URL("../web/js/", import.meta.url);
for (const f of ["thai", "world"])
  vm.runInThisContext(fs.readFileSync(new URL(f + ".js", JS), "utf8"), { filename: f });

const records = execFileSync("node",
  [new URL("prose-corpus.mjs", import.meta.url).pathname, "--json"],
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  .trim().split("\n").filter(Boolean).map(l => JSON.parse(l));

// ── subjects (same pivot the corpus dossier uses) ───────────────────────────
const WORDY = new Set(["Best", "Proud", "Near", "Nice", "Hong", "Som", "May", "Win",
  "Arm", "Gift", "Mind", "Joy", "Dear", "Ice", "View", "Bee", "Mem", "Pim", "Nong"]);
function subjects() {
  const out = new Map();
  const put = (name, id, extra) => {
    if (!name || name.length < 3 || WORDY.has(name)) return;
    const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    out.set(name, { id, re: new RegExp(`\\b(${[name, ...(extra || [])].filter(Boolean).map(esc).join("|")})\\b`) });
  };
  for (const [id, n] of Object.entries(NPCS)) if (!n.filler) put(n.name, id, [n.th]);
  for (const [id, p] of Object.entries(PATRONS)) put(p.name, id);
  return out;
}

// ── attribute slots ─────────────────────────────────────────────────────────
// A slot is a closed vocabulary of mutually-exclusive values. Two different
// values of one slot, for one subject, is the minibus shape.
const SLOTS = {
  vehicle: {
    // what they DRIVE or arrive in — not what they ride as a passenger
    minibus: /\bminibus\b/i, sedan: /\b(grey|gray) sedan\b|\bsedan\b/i,
    van: /\bvan\b/i, pickup: /\bpickup truck\b/i, tuktuk: /\btuk-?tuk\b/i,
  },
  // the two numbers the game states outright and would notice drifting
  dancerNumber: { n71: /\bnumber seventy-one\b|\bNo\. 71\b|\b71\b/, n72: /\bnumber seventy-two\b|\b72\b/ },
};
// NATIONALITY was tried and dropped, deliberately: characters describe each
// OTHER's nationality constantly ("Ryan Powers. British, though he's got a
// voice on now — half American"), so the slot fires on correct prose more often
// than wrong prose. A slot only works when its values are mutually exclusive
// AND the prose containing them is reliably about the subject. Don't re-add it
// without solving attribution properly.

// Conflicts that are TRUE — recorded with the reason, not silenced.
const CLAIMS_OK = new Set([
  // Oy was 71, Daeng was 72, and Daeng's own lines name both — that's the
  // shared history, not a contradiction about one person.
  "Daeng/dancerNumber",
  "Madam Oy/dancerNumber",
  // Mem gave Oy the number and quotes it while being Thai herself.
  "Mamasan Mem/dancerNumber",
]);

// Attribution has to happen at SCENE scope, not record scope. The corpus splits
// prose at line/literal granularity, so a scene's subject and its attributes
// routinely land in different records — the minibus line never contains the word
// "Tan" at all; his name is in the next _say. Grouping by container (a function,
// a pool, an NPC entry) and asking "who is named anywhere in this scene?" is
// what makes the claim attachable.
//
// A container speaks for a subject when they are the ONLY subject named in it
// (or they own it). That keeps Bert's desc from making Candy American, while
// still letting _taxiIntro — where Tan is the only character on the page — say
// what Tan drives.
const SUBS = subjects();
const container = ref => ref.replace(/\[\d+\]$/, "").replace(/\.(desc|text|short|q|cap)$/, "")
  .replace(/\.dialogue.*$/, "").replace(/\.(asks|choices).*$/, "");
const BY_CONTAINER = new Map();
for (const r of records) {
  const c = container(r.ref);
  if (!BY_CONTAINER.has(c)) BY_CONTAINER.set(c, []);
  BY_CONTAINER.get(c).push(r);
}
// container → the sole subject it speaks for, or null
const SPEAKS_FOR = new Map();
for (const [c, rs] of BY_CONTAINER) {
  const blob = rs.map(r => r.text).join("\n");
  const named = [...SUBS].filter(([n, s]) => s.re.test(blob) || rs.some(r => r.speaker === n));
  const owner = [...SUBS].find(([, s]) => new RegExp(`^(npc|patron)\\.${s.id}$`).test(c));
  SPEAKS_FOR.set(c, owner ? owner[0] : (named.length === 1 ? named[0][0] : null));
}
function attributable(name) {
  return records.filter(r => SPEAKS_FOR.get(container(r.ref)) === name);
}
function slotFindings() {
  const out = [];
  for (const [name, { id, re }] of SUBS) {
    const mine = attributable(name);
    if (!mine.length) continue;
    for (const [slot, vocab] of Object.entries(SLOTS)) {
      const seen = new Map();
      for (const r of mine)
        for (const [val, vre] of Object.entries(vocab))
          if (vre.test(r.text) && !seen.has(val)) seen.set(val, r.ref);
      if (seen.size > 1 && !CLAIMS_OK.has(`${name}/${slot}`))
        out.push({ kind: "slot", subject: name, slot,
          values: [...seen].map(([v, ref]) => `${v} (${ref})`) });
    }
  }
  return out;
}

// ── location claims ─────────────────────────────────────────────────────────
// "X works at <Venue>" / "X is at <Venue>" must agree with where X actually is.
// NPCs with a `bars` rotation legitimately appear at any of them.
function locationFindings() {
  const bars = new Map(); // display name → room id
  for (const [rid, r] of Object.entries(ROOMS)) if (r.bar) bars.set(r.bar, rid);
  const out = [];
  const PAT = /\b([A-Z][a-z]+)\b[^.]{0,40}?\b(?:works?|is|sits?)\b[^.]{0,25}?\bat (?:the )?([A-Z][A-Za-z' ]+(?:Bar|Lounge|Club|Inn|Corner|Pop|Kiss|Dragon|Dreams|Palace|Vic))\b/g;
  for (const r of records) {
    for (const m of r.text.matchAll(PAT)) {
      const [, who, venueRaw] = m;
      const venue = venueRaw.trim();
      const id = Object.keys(NPCS).find(k => NPCS[k].name === who || NPCS[k].name.split(" ").pop() === who);
      if (!id || !bars.has(venue)) continue;              // unknown person or venue: not our business
      const room = bars.get(venue);
      const n = NPCS[id];
      const ok = n.bars ? n.bars.includes(room) : n.room === room;
      if (!ok) out.push({ kind: "location", subject: n.name, ref: r.ref,
        claimed: venue, actual: n.bars ? n.bars.join("/") : n.room });
    }
  }
  return out;
}

// ── affordance claims ───────────────────────────────────────────────────────
// A spoken invitation is a promise. Either a verb delivers it, or the line
// carries a (CAPS) hint that the promise lint already checks, or it's prose
// with nothing behind it — the "Come, I know a place" bug.
const INVITE = /\b(come with me|follow me|come,? I know|let me show you|come see me|come find me|meet me (?:at|outside)|I take you to)\b/i;
// Invitations that ARE delivered, just not through a (CAPS) hint. Each needs a
// reason naming the mechanic — that's the whole discipline; an empty allowlist
// entry is how this check rots into decoration.
const AFFORDANCE_OK = new Map([
  // a barker shouting about you to a rival bar — not addressed to the player
  ["room.soi6_street.revisit[5]", "third-party speech, not an invitation to you"],
]);
// Ref PREFIXES whose every invite line is delivered by a real system — keyed by
// prefix, not [index], so adding/rewording a sibling line can't shift a brittle
// index off its excuse. The contact-invite texts are all honoured by
// G.phone.invite in _doGo when you show up at her bar.
const AFFORDANCE_OK_PREFIX = [
  "engine-systems.js:_maybeIncomingText",
];
function affordanceFindings() {
  return records.filter(r => INVITE.test(r.text))
    .filter(r => !/\([^)]*[A-Z]{2,}[^)]*\)/.test(r.text))   // no command hint at all
    .filter(r => !AFFORDANCE_OK.has(r.ref) && !AFFORDANCE_OK_PREFIX.some(p => r.ref.startsWith(p)))
    .map(r => ({ kind: "affordance", ref: r.ref,
      line: (r.text.match(new RegExp(`[^."]*(?:${INVITE.source})[^."]*`, "i")) || [""])[0].trim() }));
}

// ── report ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const want = f => args.includes("--" + f) || !args.some(a => ["--slots", "--locations", "--affordances"].includes(a));
const findings = [
  ...(want("slots") ? slotFindings() : []),
  ...(want("locations") ? locationFindings() : []),
  ...(want("affordances") ? affordanceFindings() : []),
];

if (args.includes("--json")) {
  console.log(JSON.stringify(findings, null, 2));
} else {
  const byKind = {};
  for (const f of findings) (byKind[f.kind] = byKind[f.kind] || []).push(f);
  for (const [kind, list] of Object.entries(byKind)) {
    console.log(`\n════ ${kind} — ${list.length} ════`);
    for (const f of list) {
      if (kind === "slot") console.log(`  ${f.subject}: two ${f.slot} values — ${f.values.join("  vs  ")}`);
      else if (kind === "location") console.log(`  ${f.subject} claimed at ${f.claimed}, actually ${f.actual}  [${f.ref}]`);
      else console.log(`  ${f.ref}\n     ${f.line}`);
    }
  }
  console.log(`\n[${findings.length} findings — a conflict is a question, not a verdict]`);
}
process.exit(0);
