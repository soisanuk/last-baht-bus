// docs/pattaya.kml — the whole map as KML, for eyeballing in Google Earth or
// Google My Maps.
//
// Two things are drawn, and the second is the useful one:
//
//   PLACEMARKS — every room at its ROOM_GEO position, foldered by region.
//     Road nodes get one pin, venues another, so the street grid reads apart
//     from the bars hanging off it.
//   EXIT LINES — the bar mat map laid over the real city. Each cardinal exit is
//     a line COLOURED BY HOW FAR ITS COMPASS WORD IS FROM THE TRUTH: green
//     under 45° (the best a four-direction grid can do on a diagonal), amber to
//     60°, red beyond. A red line on the map is the same finding
//     `gen-map.mjs --audit` prints, except you can see WHERE it is and what it
//     crosses.
//
// Non-cardinal exits (out/in/alley/up/down and the named ones) are deliberately
// NOT drawn — they carry no compass claim, so there is nothing to check.
//
// GOOGLE MY MAPS CAPS AT 10 LAYERS and one KML folder becomes one layer, so the
// per-region file (16 folders) would be truncated there. Google Earth — desktop
// or earth.google.com — imports the whole thing. For My Maps use --flat, which
// collapses everything into three layers: streets, venues, exits.
//
//   npm run map:kml                    # both files
//   npm run map:kml -- --copy          # both, plus a copy in ~/Downloads
//   node tools/gen-kml.mjs --flat      # just docs/pattaya-flat.kml
//   node tools/gen-kml.mjs --foldered  # just docs/pattaya.kml
//   node tools/gen-kml.mjs --copy <dir># copy somewhere other than ~/Downloads
//   node tools/gen-kml.mjs --stdout    # print it
import { readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const root = new URL("..", import.meta.url);
const src = p => readFileSync(fileURLToPath(new URL(p, root)), "utf8");
for (const f of ["thai.js", "world.js"]) vm.runInThisContext(src(`web/js/${f}`), { filename: f });

const esc = s => String(s == null ? "" : s)
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/\{\{|\}\}/g, "");

const DIR_DEG = { n: 0, e: 90, s: 180, w: 270 };
const kLon = Math.cos(12.93 * Math.PI / 180);
const deviation = (from, to) => {
  const [a1, o1] = ROOM_GEO[from], [a2, o2] = ROOM_GEO[to];
  const brg = (Math.atan2((o2 - o1) * kLon, a2 - a1) * 180 / Math.PI + 360) % 360;
  return { brg };
};

// KML colours are aabbggrr, not rrggbb.
const styles = `
  <Style id="road"><IconStyle><scale>0.9</scale><color>ff00d7ff</color>
    <Icon><href>http://maps.google.com/mapfiles/kml/shapes/road_shield3.png</href></Icon></IconStyle></Style>
  <Style id="venue"><IconStyle><scale>0.7</scale><color>ffff64ff</color>
    <Icon><href>http://maps.google.com/mapfiles/kml/shapes/bars.png</href></Icon></IconStyle></Style>
  <Style id="ok"><LineStyle><color>c800c878</color><width>3</width></LineStyle></Style>
  <Style id="warn"><LineStyle><color>e600a5ff</color><width>4</width></LineStyle></Style>
  <Style id="bad"><LineStyle><color>ff0000ff</color><width>5</width></LineStyle></Style>`;

function build(flat) {
  const byRegion = {};
  for (const [id, r] of Object.entries(ROOMS)) {
    if (!ROOM_GEO[id]) continue;
    (byRegion[r.region || "(unfiled)"] ||= []).push([id, r]);
  }

  let out = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2"><Document>
  <name>The Last Baht Bus — Pattaya</name>
  <description>${esc(`${Object.keys(ROOMS).length} rooms on real coordinates. Exit lines are coloured by how far each compass word sits from the true bearing: green under 45 degrees (a four-direction grid cannot do better on a diagonal), amber to 60, red beyond.`)}</description>
${styles}
`;

  if (flat) {
    // My Maps: streets and venues as two layers, region moved into each pin
    for (const kind of ["road", "venue"]) {
      out += `  <Folder><name>${kind === "road" ? "Streets" : "Venues"}</name>\n`;
      for (const region of Object.keys(byRegion).sort()) {
        for (const [id, r] of byRegion[region]) {
          if (!!r.bar !== (kind === "venue")) continue;
          const [la, lo] = ROOM_GEO[id];
          out += `    <Placemark><name>${esc(r.bar || r.name || id)}</name>` +
            `<styleUrl>#${kind}</styleUrl>` +
            `<description><![CDATA[<b>${esc(id)}</b><br/>${esc(region)}]]></description>` +
            `<Point><coordinates>${lo},${la},0</coordinates></Point></Placemark>\n`;
        }
      }
      out += `  </Folder>\n`;
    }
  }

  for (const region of flat ? [] : Object.keys(byRegion).sort()) {
    out += `  <Folder><name>${esc(region)}</name>\n`;
    for (const [id, r] of byRegion[region].sort((a, b) => a[0].localeCompare(b[0]))) {
      const [la, lo] = ROOM_GEO[id];
      const isVenue = !!r.bar;
      const tags = [
        r.barType && `type: ${r.barType}`, r.seven && "7-Eleven", r.atm && "ATM",
        r.motosai && "piwin stand", r.busStop && "baht bus", r.closed && "CLOSED",
      ].filter(Boolean).join(" · ");
      const desc = [`<b>${esc(id)}</b>`, tags && esc(tags), esc(String(r.desc || "").slice(0, 400))]
        .filter(Boolean).join("<br/><br/>");
      out += `    <Placemark><name>${esc(r.bar || r.name || id)}</name>` +
        `<styleUrl>#${isVenue ? "venue" : "road"}</styleUrl>` +
        `<description><![CDATA[${desc}]]></description>` +
        `<Point><coordinates>${lo},${la},0</coordinates></Point></Placemark>\n`;
    }
    out += `  </Folder>\n`;
  }

  // the bar mat map, laid over the city
  const seen = new Set();
  let lines = "", counts = { ok: 0, warn: 0, bad: 0 };
  for (const [id, r] of Object.entries(ROOMS)) {
    if (!ROOM_GEO[id]) continue;
    for (const [dir, to] of Object.entries(r.exits || {})) {
      if (!(dir in DIR_DEG) || !ROOM_GEO[to]) continue;
      const key = [id, to].sort().join("|") + "|" + dir;
      if (seen.has(key)) continue;
      seen.add(key);
      const { brg } = deviation(id, to);
      let dev = Math.abs(brg - DIR_DEG[dir]);
      if (dev > 180) dev = 360 - dev;
      const style = dev > 60 ? "bad" : dev > 45 ? "warn" : "ok";
      counts[style]++;
      const [a1, o1] = ROOM_GEO[id], [a2, o2] = ROOM_GEO[to];
      lines += `    <Placemark><name>${esc(`${id} —${dir}→ ${to}`)}</name>` +
        `<styleUrl>#${style}</styleUrl>` +
        `<description><![CDATA[declared <b>${dir}</b>, real bearing ${brg.toFixed(0)}°, off by ${dev.toFixed(0)}°]]></description>` +
        `<LineString><tessellate>1</tessellate><coordinates>${o1},${a1},0 ${o2},${a2},0</coordinates></LineString></Placemark>\n`;
    }
  }
  out += `  <Folder><name>Exits — the bar mat map (${counts.ok} clean · ${counts.warn} amber · ${counts.bad} red)</name>\n${lines}  </Folder>\n`;
  out += `</Document></kml>\n`;
  return { kml: out, counts, rooms: seen.size };
}

// ── CLI ──────────────────────────────────────────────────────────────────────
// A bare run writes BOTH files, because they are two renderings of one map and
// letting them drift means the Earth view and the My Maps view disagree about
// the town. --flat / --foldered narrow it to one; --stdout prints instead of
// writing. --copy lands a copy wherever you actually open them from.
const argv = process.argv.slice(2);
const has = f => argv.includes(f);
const copyArg = argv.findIndex(a => a === "--copy" || a.startsWith("--copy="));

const VARIANTS = [
  { flat: false, name: "docs/pattaya.kml",      note: "foldered by region — Google Earth" },
  { flat: true,  name: "docs/pattaya-flat.kml", note: "3 layers — Google My Maps (caps at 10)" },
];
// narrow only if asked; otherwise both
const want = has("--flat") ? [VARIANTS[1]]
  : has("--foldered") ? [VARIANTS[0]]
  : VARIANTS;

if (has("--stdout")) {
  process.stdout.write(build(has("--flat")).kml);
} else {
  let dest = null;
  if (copyArg !== -1) {
    const inline = argv[copyArg].split("=")[1];
    dest = inline || argv[copyArg + 1] || null;
    if (!dest || dest.startsWith("--")) dest = join(homedir(), "Downloads");
    dest = dest.replace(/^~(?=$|\/)/, homedir());
  }
  for (const v of want) {
    const { kml, counts } = build(v.flat);
    writeFileSync(fileURLToPath(new URL(v.name, root)), kml);
    let line = `${v.name} — ${Object.keys(ROOMS).length} rooms, ` +
      `exit lines: ${counts.ok} clean / ${counts.warn} amber / ${counts.bad} red`;
    if (dest) {
      copyFileSync(fileURLToPath(new URL(v.name, root)), join(dest, basename(v.name)));
      line += `  → ${dest}`;
    }
    console.log(line);
  }
}
