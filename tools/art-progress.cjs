// Where the art actually stands, read off the filesystem — the one source that
// cannot be wrong and cannot be forgotten.
//
// Written for an UNATTENDED run. Generating 200 scene images means 200 tool
// calls, which fills a context window and triggers compaction; compaction
// summarises, and what thins out first is exactly the operational detail —
// which regions are finished, whether the output should be WebP, whether a
// district was already done an hour ago. An agent that trusts its recollection
// after compaction will redo work or skip it.
//
// So: don't remember, look. `node tools/art-progress.cjs` after any restart or
// compaction and the repo tells you where you are.
//
//   done       has art (either extension)
//   still-PNG  has art but not yet converted to WebP
//   todo       no art at all — falls back to the region image
//
// Usage: node tools/art-progress.cjs
const fs=require("fs"),vm=require("vm");
for (const f of ["thai","world"]) vm.runInThisContext(fs.readFileSync("web/js/"+f+".js","utf8"),{filename:f});
const dir="web/art/rooms";
const have=new Map();
for (const f of fs.readdirSync(dir)) { const m=f.match(/^(.+)\.(webp|png)$/); if(m) have.set(m[1], m[2]); }
const by={};
for (const [id,r] of Object.entries(ROOMS)) {
  const g=r.region||"?"; by[g]=by[g]||{done:0,png:0,todo:[]};
  const ext=have.get(id);
  if (!ext) by[g].todo.push(id); else { by[g].done++; if(ext==="png") by[g].png++; }
}
let td=0,tp=0,tt=0;
console.log("region            done  still-PNG  todo");
for (const [g,v] of Object.entries(by).sort((a,b)=>b[1].todo.length-a[1].todo.length)) {
  td+=v.done; tp+=v.png; tt+=v.todo.length;
  console.log("  "+g.padEnd(17)+String(v.done).padStart(3)+String(v.png).padStart(10)+String(v.todo.length).padStart(7)+
    (v.todo.length&&v.todo.length<=4?"   "+v.todo.join(" "):""));
}
console.log("  "+"TOTAL".padEnd(17)+String(td).padStart(3)+String(tp).padStart(10)+String(tt).padStart(7));
