// What the portrait generator will ACTUALLY be given for a character.
//
// portrait_gen condenses `desc` to its first sentence capped at 20 words, so a
// desc that opens on role or characterisation rather than appearance reaches
// the model as a severed fragment. This prints the exact string, so the answer
// is visible at writing time instead of after a bad render.
//
//   node tools/portrait-prompt.mjs bob        one character
//   node tools/portrait-prompt.mjs --needed   every character missing a `look`
import fs from "node:fs";
import vm from "node:vm";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
for (const f of ["thai", "world"])
  vm.runInThisContext(fs.readFileSync(HERE + "/../web/js/" + f + ".js", "utf8"), { filename: f });

const cond = d => String(d || "").split(/(?<=[.!?])\s/)[0].split(/\s+/).filter(Boolean);
const all = { ...NPCS }; // one cast — the regulars are flagged NPCS entries
const arg = process.argv[2];

if (arg === "--needed") {
  const rows = Object.entries(all)
    .filter(([, c]) => !c.filler && !c.look && cond(c.desc).length > 20)
    .map(([id, c]) => [id, cond(c.desc).length, cond(c.desc).slice(16, 20).join(" ")]);
  console.log(rows.length + " authored characters have no `look` and a severed desc:\n");
  for (const [id, n, tail] of rows) console.log("  " + id.padEnd(15) + n + "w  …cut after: \"" + tail + "\"");
  process.exit(0);
}
const c = all[arg];
if (!c) { console.error("no such character: " + arg); process.exit(1); }
console.log("\n" + (c.name || arg));
if (c.look) {
  console.log("  look (used verbatim):\n    " + c.look);
} else {
  const w = cond(c.desc);
  console.log("  no `look` — the model gets the condensed desc:\n    " + w.slice(0, 20).join(" "));
  if (w.length > 20) console.log("  ⚠ SEVERED: the first sentence is " + w.length + " words; " +
    (w.length - 20) + " are dropped. Write a `look`.");
}
