# Voxel Beat Planet

## Give a song a planet.

Drop in an MP3. Add one sentence—or add nothing at all. The skill listens for the pulse, reads the available song context, and designs a whole voxel world that could belong to that track and no other.

Not a green ball with speakers glued on.  
Not an equalizer bent into a sphere.  
Not the same moon base wearing a different palette.

The result might be a midnight disco city wrapped in railway lines, a winter ocean planet crossed by migrating lanterns, a dusty red broadcast colony, or a daylight carnival whose streets fold around the poles. Time of day, season, surface type, architecture, people, transport, typography, weather, and choreography are all decided again for every song.

## The promise

- **One song, one world.** Every run begins with a new scene bible and scene manifest.
- **Readable from orbit.** Roughly 100,000 deliberately large surface voxels make the wave motion and landmarks visible without zooming.
- **A full sphere, not a pretty front.** Every hemisphere and pole receives authored regions, buildings, characters, transport, and events.
- **Waves that travel.** Bass creates visible crests and troughs with spatial phase delay—not a camera shake disguised as music response.
- **Different things do different things.** Trains accelerate, crowds change pose, doors open, light sweeps chase, signs lift stroke by stroke, and landmarks transform by section.
- **Song identity can become geography.** When appropriate, the title may be carved into the surface in monumental voxel lettering or the artist may become a stylized hero landmark.
- **The engine is reusable; the answer is not.** Chunk rendering, audio analysis, culling, controls, and voxel primitives persist. The world design does not.

## What goes in

\`\`\`text
required:  an MP3, WAV, OGG, M4A, FLAC, or AAC file
optional:  a scene description, visual constraints, motifs, or exclusions
\`\`\`

If the prompt is sparse, the skill uses metadata and audible evidence—tempo, groove, energy arc, density, timbre, and era—to propose the most fitting world. It does not invent or reproduce song lyrics.

## What comes out

\`\`\`text
interactive-planet/
├─ index.html
├─ scene-bible.md
├─ js/
│  ├─ scene-manifest.js   # unique world decisions
│  ├─ terrain.js          # unique surface and traveling wave masks
│  ├─ scene.js            # unique landmarks, population, vehicles, events
│  ├─ planet.js           # reusable chunked voxel renderer
│  ├─ audio.js            # reusable Web Audio analysis
│  └─ ...
└─ assets/
\`\`\`

The page includes orbit and zoom controls, play/pause, volume, drag-to-replace audio, loading feedback, reduced-motion support, and optional diagnostics.

## Use the skill

Copy this repository into your Codex skills directory, then ask:

\`\`\`text
Use $voxel-beat-planet with this MP3.
Build a stormy night-time railway world about missed connections.
Make the wave motion obvious from the full-planet view.
\`\`\`

Or provide only the audio:

\`\`\`text
Use $voxel-beat-planet with this MP3 and design the scene from the song.
\`\`\`

The skill first writes the world design, then builds and validates the webpage.

## Performance architecture

The default surface is \`6 × 132² = 104,544\` large voxels. A cube-sphere is split into chunks and rendered with compact instanced attributes. Position, orientation, displacement, and lighting are reconstructed in the vertex shader. CPU horizon culling, Three.js frustum culling, and GPU back-face culling work together; repeated scene props use \`InstancedMesh\`.

The smaller shell is intentional: the visual budget belongs to the song-specific city, characters, vehicles, lettering, portraiture, and set pieces—not to millions of tiny terrain cubes that disappear at orbit distance.

## Included tools

- \`scripts/analyze_audio.py\` — dependency-light audio/metadata profile using FFmpeg.
- \`scripts/embed_audio.py\` — creates a local JavaScript audio payload when the user has the right to use the track.
- \`scripts/validate_project.py\` — checks structure, large-voxel defaults, spatial wave evidence, scene-manifest completeness, instancing, and forbidden unfinished placeholders.

## Audio and copyright

Audio stays local by default. The repository ignores embedded and source music files, and public projects should not redistribute copyrighted recordings without permission. Generated scene code can name a track and respond to it without shipping the recording.

## License

MIT. Build strange little worlds.
