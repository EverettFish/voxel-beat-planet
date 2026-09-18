#!/usr/bin/env python3
"""Structural + rule validation for a generated voxel-beat-planet project. Exit 1 on failure.

Usage: python3 validate_project.py <project-dir>
Checks files, syntax (node --check when node exists), manifest richness, climate completeness, the shared-scale rule,
forbidden leftovers, and runs check_layout.js. It cannot judge beauty — that is what shot.py + qa-checklist.md are for.
"""
import json, pathlib, re, shutil, subprocess, sys
root = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "."); fails = []; warns = []
def fail(m): fails.append(m)
ENGINE = ["config", "terrain-core", "voxelmodel", "kit-core", "placement", "planet", "climate", "glow", "sky", "lighting", "weather", "audio", "controls", "ui", "main"]
BESPOKE = ["scene-manifest", "terrain", "scene", "lights-score", "gallery"]
for n in ENGINE + BESPOKE:
    if not (root / "js" / f"{n}.js").exists(): fail(f"missing js/{n}.js")
for f in ["index.html", "css/style.css", "scene-bible.md"]:
    if not (root / f).exists(): fail(f"missing {f}")
track = root / "assets" / "track.js"
if not track.exists(): fail("missing assets/track.js: the delivered website must include its music")
else:
    track_text = track.read_text(encoding="utf-8", errors="ignore")
    if "window.MB_TRACK = null" in track_text or not re.search(r'window\.MB_TRACK\s*=\s*\{', track_text) or not re.search(r'["\']data["\']\s*:', track_text):
        fail("assets/track.js is still a placeholder: run embed_audio.py so playback works without an upload")
kits = [p for p in (root / "js").glob("kit*.js") if p.name != "kit-core.js"]
if not kits: fail("no bespoke kit file (js/kit*.js)")
node = shutil.which("node")
if node:
    for p in (root / "js").glob("*.js"):
        if subprocess.run([node, "--check", str(p)], capture_output=True).returncode: fail(f"syntax error in {p.name}")
    probe = "const vm=require('vm'),fs=require('fs');const sb={window:{}};vm.createContext(sb);vm.runInContext(fs.readFileSync(process.argv[1],'utf8'),sb);const S=sb.window.MB_SCENE;console.log(JSON.stringify({d:S.districts.length,r:(S.rings||[]).length,c:S.chapters.map(c=>({id:c.id,at:c.at,keys:Object.keys(c.state||{}).sort().join()})),dur:S.duration,cam:(S.cameraTargets||[]).length,hero:(S.heroEvents||[]).length,bind:Object.keys(S.audioBindings||{}).length,ui:!!(S.ui&&S.ui.glyph&&S.ui.headline)}))"
    r = subprocess.run([node, "-e", probe, str(root / "js" / "scene-manifest.js")], capture_output=True, text=True)
    if r.returncode: fail("scene-manifest.js does not evaluate: " + r.stderr[:200])
    else:
        m = json.loads(r.stdout)
        if m["d"] < 8: fail(f"only {m['d']} districts (need >= 8; aim for 10-16)")
        if m["r"] < 1: fail("no ring (rail / road / river / parade route)")
        if len(m["c"]) < 4: fail(f"only {len(m['c'])} climate chapters (need >= 4): the world must change as the song advances")
        if len({c["keys"] for c in m["c"]}) != 1: fail("climate chapters do not all carry the same state keys")
        ats = [c["at"] for c in m["c"]]
        if ats != sorted(ats) or ats[0] != 0: fail("chapters must start at 0 and be ascending")
        if ats and m["dur"] and ats[-1] >= m["dur"]: fail("last chapter starts after the song ends")
        if m["cam"] < 5: fail("fewer than 5 cameraTargets")
        if m["hero"] < 3: fail("fewer than 3 heroEvents")
        if m["bind"] < 5: fail("audioBindings must cover bass/mid/treble/beat/energy/progress")
        if not m["ui"]: fail("ui.glyph / ui.headline missing")
    here = pathlib.Path(__file__).parent / "check_layout.js"
    r = subprocess.run([node, str(here), str(root)], capture_output=True, text=True)
    if r.returncode: fail("layout check failed:\n" + r.stdout)
else: warns.append("node not found: syntax, manifest and layout checks skipped")
src = "\n".join(p.read_text(encoding="utf-8", errors="ignore") for p in kits + [root / "js" / "scene.js"] if p.exists())
units = set(re.findall(r"new\s+(?:MB\.)?(?:VoxelModel|VM)\(\s*([0-9.]+)\s*\)", src))
if len(units) > 3: fail(f"{len(units)} different literal voxel units in the kit {sorted(units)} — one shared CFG.UNIT, at most two exceptions (people, clouds)")
if "waveAt" not in src and "ride(" not in src and "InstSet" not in src: fail("scene never rides the ground wave (no ride()/InstSet/waveAt)")
if src.count("Math.random()") > 3: warns.append("Math.random() in scene/kit: use the seeded rng so screenshots are reproducible")
for bad in ["STARTER", "Replace me", "TODO", "lorem"]:
    for p in (root / "js").glob("*.js"):
        if bad in p.read_text(encoding="utf-8", errors="ignore"): fail(f"leftover '{bad}' in {p.name}")
g = (root / "js" / "gallery.js");
if g.exists() and len(re.findall(r"^\s+\w+:\s*\(\)\s*=>", g.read_text(encoding="utf-8"), flags=re.M)) < 6: fail("gallery.js registers fewer than 6 entries: every landmark must be approved on the turntable")
gi = root / ".gitignore"
if (root / "assets" / "track.local.js").exists() and not (gi.exists() and "track.local.js" in gi.read_text()): warns.append("assets/track.local.js exists but is not git-ignored")
for w in warns: print("WARN ", w)
for f in fails: print("FAIL ", f)
print("OK: structure and rules pass — now run shot.py and walk references/qa-checklist.md" if not fails else f"{len(fails)} failure(s)")
sys.exit(1 if fails else 0)
