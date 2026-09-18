---
name: voxel-beat-planet
description: Build a production-ready, music-reactive Three.js voxel planet from a specific song, artist, album, soundtrack, lyric concept, or music-inspired prompt — a finely crafted diorama world whose terrain ripples with the beat and whose climate, light and season change as the song advances. Use for requests like "make a [song] voxel planet", "create a music-reactive voxel world", "体素音乐星球", "give this song its own planet", or when the user supplies an audio file and wants a bespoke interactive world.
---

# Voxel Beat Planet

Build one bespoke voxel planet per song. Reuse the engine in `assets/engine/`; redesign everything the viewer can see.

Quality bar: every object is recognisable at a glance, built at one shared fine voxel scale with the feature parts of its category; the ground visibly ripples with the music; the sky, light, weather and ground change as the song moves through its sections. A recoloured copy of an earlier planet is a failure. So is a planet of oversized blobs nobody can name.

## Workflow

### 1. Understand the song — then answer the diagnostic
Collect title, artist, era, genre, tempo/energy, and an audio file the user is authorised to use. A finished playable delivery requires that file; if it is missing, build only a preview and request the audio before final delivery. When details matter, verify facts and **look up the lyrics for imagery only**: never put lyric lines, translations or paraphrased lines into the scene, UI or docs.

With audio: run `python3 scripts/analyze_audio.py <audio>` to get the real section boundaries. Do not guess timestamps.

Then answer every question in [references/scene-design.md](references/scene-design.md) §Diagnostic **before writing code**. If one cannot be answered, keep thinking — do not start building.

### 2. Write the scene bible and the layout table
Write `scene-bible.md` (premise, climate arc, palette, districts, per-object motion, far-read landmarks) and `js/scene-manifest.js` (districts, rings, wave sources, chapters, UI copy/theme). Then gate it:

```bash
node scripts/check_layout.js <project>      # overlaps, rings cutting districts, empty octants, largest empty cap
```
Fix every failure by moving things in the manifest. Terrain and scene both read this one table, so what is painted and what is placed can never disagree.

### 3. Assemble the project
Copy `assets/engine/` to the project. Copy `assets/engine/templates/*.js` into `js/` as starters and replace them completely (`scene-manifest`, `terrain`, `kit*`, `scene`, `lights-score`, `gallery`). Update the module list in `index.html` if the kit is split into several files. Engine files are reused as-is:

`config terrain-core voxelmodel kit-core placement planet climate glow sky lighting weather audio controls ui main`

Embed the supplied track before delivery:

```bash
python3 scripts/embed_audio.py <audio> <project> --name "Title · Artist"
```

This writes `assets/track.js`; the generated website must play immediately after the user's start-button gesture and must not ask the viewer to upload a file. Re-theme `ui.theme` and the UI copy for the song. Tune `config.js` (wave amplitudes, rotation period, camera) to the song's energy.

### 4. Build the kit — and approve it on the turntable
Follow [references/craft-standards.md](references/craft-standards.md): one voxel unit for the whole planet, category feature parts, layered packs (solid / glow / snow), baked AO. Register every landmark in `js/gallery.js` and look at it **off the planet**:

```bash
python3 scripts/shot.py <project> kit_ 1400 700 "gallery=train,swing&az=0.5&el=0.35"
```
If you cannot name the object in one second from the screenshot, rebuild it or delete it. Unrecognisable props are negative assets.

### 5. Place, animate, bind
Place with `MB.Place` anchors (`anchorLocal`, `anchorRing`, `anchorDir`); everything on the ground rides `planet.waveAt()` through its anchor. Give each thing the motion *that thing* makes — never a shared bob. People go to named spots (one or two per landmark, ≤ 16 total), never random scatter. Bind music per [references/music-mapping.md](references/music-mapping.md).

### 6. Make the world change with the song
Define 4–8 climate chapters at the analysed section boundaries, per [references/climate-timeline.md](references/climate-timeline.md). Every system reads `MB.Climate.state`; nothing hard-codes "night" or "day". The arc must come from the song's meaning (a song about autumn ending goes mist → clear → leaf storm → rain → dusk → first snow; a club track might go dusk → neon night → storm → dawn).

### 7. Verify like a product
```bash
python3 scripts/validate_project.py <project>
python3 scripts/shot.py <project> qa_ 1000 720 "shot&fakebeat&norot&t=20&ct=<sec>&freeze=4&cam=372,1.22,0" ...
```
Walk [references/qa-checklist.md](references/qa-checklist.md): four orbit angles, one close-up per landmark, one frame per climate chapter, two wave phases. Fix what the screenshots show, not what the code suggests. Check budgets in [references/performance.md](references/performance.md). Then test the real path once: load, play, seek to a chapter, no console errors.

## Non-negotiable rules
- One shared voxel unit (`CFG.UNIT`); detail comes from voxel count, not voxel size. People may use a slightly finer unit; nothing else.
- Coherent scale: a person is shorter than a door lintel plus a head; a lamp is lower than the eaves; a train fits its platform.
- Every category ships its feature parts (see craft-standards). A box with dots is not a house.
- Ground value > 60 %. Dark colours are for trunks, iron, roofs and outlines.
- Light, sky and weather are derived from the song and change with its progress. No default "planet = black space".
- Lights have an unlit state; windows and lamps stay dark glass in daylight chapters.
- Layout is collision-checked; every octant has content; no ring cuts a district; no crowding at one focus.
- Every ground object rides the wave through an anchor. Built districts get `react ≤ 0.10`, rings `≤ 0.03`, water `≈ 0.16`.
- Shader spotlights carry a range fade. Without it a cone lights the far side of the planet.
- No lyric text anywhere. No audio or video inside the skill repository. The generated deliverable must contain the user-authorised track in `assets/track.js`; never substitute an upload prompt.
- No TODOs, placeholder landmarks, mock data or debug UI left visible.

## Audio
The reusable engine ships with a null placeholder so it remains redistributable. A generated project is not complete until `embed_audio.py` has replaced that placeholder with its built-in track. `--local-only` is available only for private development overrides; it does not satisfy final-delivery validation. Do not publish the generated audio payload unless the user confirms redistribution rights.

## Resources
- [scene-design.md](references/scene-design.md) — diagnostic questions, song-to-world translation, layout rules
- [craft-standards.md](references/craft-standards.md) — scale, feature-part checklists, layered packs, annotated recipes
- [climate-timeline.md](references/climate-timeline.md) — chapter states, what each field drives, arc patterns
- [music-mapping.md](references/music-mapping.md) — feature → behaviour bindings, wave formula contract
- [performance.md](references/performance.md) — budgets, instancing, culling, adaptive quality
- [qa-checklist.md](references/qa-checklist.md) — screenshot protocol, debug parameters, delivery checklist
- [lessons-learned.md](references/lessons-learned.md) — real failures from earlier planets and their root causes

## Delivery
Report: what was built and why it fits the song, how to run it, confirmation that playback is built in, the climate chapters with their timestamps, validation/QA performed, audio licensing notes.
