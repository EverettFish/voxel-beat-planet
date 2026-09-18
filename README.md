# Voxel Beat Planet

**Give any song a one-of-a-kind, music-reactive Three.js voxel planet — whose weather, light and season change as the song plays.**

An agent skill. It does not recolour a template: it reads the song, designs a world for it, builds that world at model-railway detail, and checks its own work from screenshots.

## What's new in v2
- **Reusable engine** in `assets/engine/` (planet shader, baked-AO voxel builder, anchors + instancing, climate, weather, sky, audio analysis, UI) with runnable starter templates for the song-specific files.
- **Climate timeline**: chapters placed at the song's real section boundaries drive sky, sun, haze, clouds, wind, rain, snow, wet ground, frost line, lake ice, lights, stars, aurora and foliage.
- **Craft standards**: one shared fine voxel unit, feature-part checklists per category, layered solid/glow/snow packs, a kit turntable for approving models off-planet.
- **Layout gate**: `check_layout.js` rejects overlaps, rings cutting districts and empty hemispheres.
- **Pole-safe placement**: districts can sit exactly on either pole and equatorial rings no longer produce degenerate tangent frames.
- **Screenshot-driven QA**: `shot.py` + debug parameters + a delivery checklist; `validate_project.py` enforces the rules that can be automated.
- **Built-in playback gate**: generated sites must contain their authorised track and play it after one start-button click—no viewer upload step.
- **Lessons learned** from nine rounds of real feedback.

## Layout
```
SKILL.md
references/   scene-design · craft-standards · climate-timeline · music-mapping · performance · qa-checklist · lessons-learned
scripts/      analyze_audio.py · embed_audio.py · check_layout.js · shot.py · validate_project.py
assets/engine/  index.html · css/ · js/ (engine) · templates/ (starters for bespoke files) · vendor/three.min.js
```
The skill ships no audio, no video and no finished scene.

## Install
Copy this folder into your agent's skills directory (e.g. `~/.claude/skills/voxel-beat-planet` or `$CODEX_HOME/skills/voxel-beat-planet`), then ask: *"Use $voxel-beat-planet to make a planet for <song>."*

## Requirements for the scripts
`node` (layout check, validation) · `python3` + `numpy` + `ffmpeg` (audio analysis) · `playwright` + chromium (screenshots).

## Audio and copyright
The reusable skill ships no song. For each generated website, `embed_audio.py` writes the user-supplied track into `assets/track.js`, so the delivered page plays it without asking the viewer to upload anything. Do not publish that generated audio payload without redistribution rights. Lyrics are used as imagery only and never reproduced.

MIT License. Three.js is MIT (see `assets/engine/vendor/LICENSE-three.txt`).
