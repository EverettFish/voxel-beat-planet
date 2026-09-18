#!/usr/bin/env node
// Layout collision + hemisphere balance check for a voxel-beat-planet project.
// Usage: node check_layout.js <project-dir> [--min-gap 0.04] [--ring-gap 0.04]
// Reads js/scene-manifest.js (window.MB_SCENE = {...}) and verifies:
//   1. no two districts overlap (edge gap >= min-gap radians)
//   2. no ring (rail/road/lyric belt...) cuts through a district, unless the district lists the
//      ring id in `onRing` (stations, crossings) or sets `besideRing`
//   3. every octant of the sphere holds at least one district centre (no empty back side / poles)
// Exit code 1 on any failure so it can gate delivery.
const fs = require("fs"), path = require("path"), vm = require("vm");
const dir = process.argv[2] || ".";
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? parseFloat(process.argv[i + 1]) : d; };
const MIN_GAP = arg("--min-gap", 0.04), RING_GAP = arg("--ring-gap", 0.04);
const file = path.join(dir, "js", "scene-manifest.js");
if (!fs.existsSync(file)) { console.error("missing " + file); process.exit(1); }
const sandbox = { window: {} }; vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(file, "utf8"), sandbox);
const S = sandbox.window.MB_SCENE;
if (!S || !Array.isArray(S.districts)) { console.error("MB_SCENE.districts[] is required"); process.exit(1); }
const dirOf = (lat, lon) => [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(a, b))));
const norm = a => { const l = Math.hypot(...a); return a.map(x => x / l); };
let fails = 0;
const D = S.districts.map(d => ({ ...d, v: dirOf(d.lat, d.lon) }));
console.log(`districts: ${D.length}   rings: ${(S.rings || []).length}`);
for (let i = 0; i < D.length; i++) for (let j = i + 1; j < D.length; j++) {
  const gap = ang(D[i].v, D[j].v) - D[i].r - D[j].r;
  if (gap < MIN_GAP) { fails++; console.log(`  OVERLAP  ${D[i].id} <-> ${D[j].id}  edge gap ${gap.toFixed(3)} rad (need >= ${MIN_GAP})`); }
}
for (const ring of S.rings || []) {
  const p = norm(ring.pole);
  for (const d of D) {
    const dist = Math.abs(Math.asin(Math.max(-1, Math.min(1, dot(p, d.v)))));   // centre -> great circle
    const gap = dist - d.r - (ring.half || 0);
    const allowed = (d.onRing || []).includes(ring.id);
    if (allowed) { if (dist > d.r) { fails++; console.log(`  OFF-RING ${d.id} claims onRing:${ring.id} but sits ${dist.toFixed(3)} rad away`); } continue; }
    if (gap < RING_GAP) { fails++; console.log(`  CUT      ring ${ring.id} runs through/too close to ${d.id}  gap ${gap.toFixed(3)} rad`); }
  }
}
// octant coverage
const oct = new Array(8).fill(0);
for (const d of D) oct[(d.v[0] > 0 ? 1 : 0) | (d.v[1] > 0 ? 2 : 0) | (d.v[2] > 0 ? 4 : 0)]++;
oct.forEach((n, i) => { if (!n) { fails++; console.log(`  EMPTY    octant x${i & 1 ? "+" : "-"} y${i & 2 ? "+" : "-"} z${i & 4 ? "+" : "-"} has no district`); } });
// largest empty cap: sample the sphere, find the point farthest from every district edge / ring
let worst = 0, worstAt = null;
for (let i = 0; i < 4000; i++) {
  const y = 1 - 2 * (i + 0.5) / 4000, r = Math.sqrt(1 - y * y), ph = i * 2.399963;
  const v = [r * Math.cos(ph), y, r * Math.sin(ph)];
  let m = Infinity;
  for (const d of D) m = Math.min(m, ang(v, d.v) - d.r);
  for (const ring of S.rings || []) m = Math.min(m, Math.abs(Math.asin(dot(norm(ring.pole), v))));
  if (m > worst) { worst = m; worstAt = v; }
}
const wl = [Math.asin(worstAt[1]), Math.atan2(worstAt[0], worstAt[2])];
console.log(`largest empty cap: ${worst.toFixed(3)} rad around lat ${wl[0].toFixed(2)} lon ${wl[1].toFixed(2)}` + (worst > 0.5 ? "   <-- fill this (add a district or a scatter biome)" : ""));
if (worst > 0.62) fails++;
console.log(fails ? `FAIL: ${fails} layout problem(s)` : "OK: layout is collision-free and balanced");
process.exit(fails ? 1 : 0);
