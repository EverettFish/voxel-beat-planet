---
name: voxel-beat-planet
description: Build a one-of-a-kind interactive Three.js voxel planet from an MP3 plus an optional scene description. Use for music-reactive 3D planet visualizers where terrain, buildings, nature, transport, characters, events, and camera language must be newly designed for each song rather than copied from a fixed theme.
---

# Voxel Beat Planet

Create a bespoke playable webpage, not a reskinned preset. Reuse the rendering and audio engine; redesign the world itself every time.

## Inputs

Require an audio file. Treat the user's scene description as the strongest creative constraint. When it is sparse, inspect audio metadata and analyze the track, then infer a coherent world from its mood, arrangement, era, pacing, dynamics, and any lawfully available high-level song context. Never invent quoted lyrics or reproduce copyrighted lyrics.

## Non-negotiable invariant

Before writing scene code, create `scene-bible.md` and `scene-manifest.js`. They must newly define:

- the planet's premise and emotional arc;
- 6–10 surface regions distributed across the entire sphere, each with a distinct silhouette and no empty back side;
- terrain, architecture, nature, transport, inhabitants, ambient life, and at least three hero events;
- day or night, season, weather, Earth-/Moon-/Mars-like or wholly invented surface character, a restrained palette, material language, lighting arc, camera moments, and audio mappings;
- why every major object belongs to this particular song or prompt.

Do not default to instruments, equalizers, spacecraft, neon cities, green terrain, trees, or any object library's demo content. A train, disco, portrait, market, glacier, village, animal migration, sound system, or impossible weather system is valid only when supported by the input. Density filler is forbidden: every repeated prop must have a song-specific reason. If two different requests would yield substantially the same landmark list, redesign.

When the song title is known, consider a monumental voxel title carved into or raised from the surface. Use it only when it strengthens the scene, and make its letters participate in the traveling surface wave without losing legibility. A recognizable artist portrait or era-specific iconography may become a hero landmark when it is clearly relevant and can be created without copying protected artwork.

Read [references/scene-design.md](references/scene-design.md) while deriving the world. Read [references/music-mapping.md](references/music-mapping.md) when binding motion. Read [references/performance.md](references/performance.md) before implementing the planet shell or validating performance.

## Workflow

1. Run `scripts/analyze_audio.py <track>` to obtain duration, energy curve, estimated BPM, section candidates, and transient density. Use metadata to identify the track when possible.
2. Write the scene bible and manifest before geometry. Preserve the user's explicit motifs; fill missing dimensions with evidence from the audio.
3. Reuse only the rendering/audio architecture. Implement bespoke `js/terrain.js`, `js/scene-manifest.js`, and `js/scene.js`; do not reuse a finished scene answer.
4. Target about 100,000 large surface voxels by default (`6 * 132^2 = 104,544`). Keep the planet radius near 72–84 world units so major props and rhythmic displacement read from the default whole-planet camera. Expose quality parameters rather than silently changing the composition.
5. Implement spatially coherent traveling waves, not uniform shake. Bass should create visible crests and troughs that propagate across longitude, latitude, paths, or authored region masks with phase delay; use several voxel-heights of displacement. High frequencies may add a smaller secondary ripple, never random whole-planet jitter as the primary effect.
6. Map musical features to semantically appropriate motion. Give different landmark classes different motion systems—translation, rotation, opening, marching, lighting sweeps, vehicle speed, pose changes, or staged transformations—so the planet feels choreographed rather than uniformly pulsed.
7. Include orbit/zoom controls, play/pause, volume, drag-to-replace audio, a loading state, reduced-motion handling, and an optional performance panel.
8. Run `scripts/embed_audio.py` only for a local, user-authorized copy. Keep copyrighted audio out of public repositories unless redistribution rights are explicit.
9. Validate with `scripts/validate_project.py <project-dir>`, syntax checks, and a real Chrome render. Treat the default whole-planet view as the primary acceptance test: large voxels, traveling waves, title/hero landmarks, dense activity, and multiple distinct motions must all be readable without zooming.

## Delivery bar

Deliver a folder that opens through a tiny local server, plus a clear README. The finished page must look authored for its input, remain visually dense on every visible rotation from the default camera, and visibly synchronize low, mid, high, onset, beat, section energy, and silence states without turning every object into an equalizer. Reserve much of the visual budget for song-specific characters, architecture, vehicles, lettering, and set pieces rather than spending it on an oversized generic terrain shell.
