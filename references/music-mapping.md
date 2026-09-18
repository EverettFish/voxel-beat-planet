# Music mapping

`audio.js` analyses the whole track offline (beats, ticks, kick, band envelopes, energy, slow/warm sections) and returns a feature frame `f` each tick: `bass mid treble energy beat tick kick heavy tempo bpm beatPhase beatIndex tickIndex active`.

## The ground moves as travelling waves, never as a global shake
Vertex-shader displacement = swell + concentric ripples from **two wave sources** (`MB_SCENE.waveSources`, usually the hero landmark and the water/stage) + a beat pulse that rides outward along the ripple rings + treble jitter, scaled by per-voxel `react`, quantised to whole voxel steps. `planet.waveAt(dx,dy,dz,react)` is the JS mirror of that formula; change one, change both. Everything on the ground rides it through its anchor.

`react` budget: wild land 0.6–1.0 · hero hill 0.3 · farmland/meadow districts 0.25 · built districts ≤ 0.10 (they move as a raft, foundations hide the step) · water 0.16 (water sways, it does not jump) · rings and stations ≤ 0.03 (track stays put).

Tune `WAVE_AMP` / `PULSE_AMP` to the genre: ballad 4–5 / 3–4, dance 7–9 / 7–9 world units.

## Bind each feature to something with meaning in this song
| feature | typical bindings |
|---|---|
| bass | swell amplitude · hero crown breathing · burner flames |
| mid (strings, pads) | wind: falling-thing speed, sails, tree sway, bird cruise |
| treble | key sparkle · water glints · bell · snow/star twinkle |
| beat | ripple pulse from the instrument · lamp breath · alternating bulb chase (`beatIndex & 1`) |
| energy | vehicle speed · swing amplitude · smoke rate · particle density |
| progress | climate chapters and hero events |

Record the final table in `MB_SCENE.audioBindings`. Glow groups are scored in `js/lights-score.js`; each group has a lit and an unlit colour and is gated by `climate.lights` unless it is a fire.

Idle state (no audio): a gentle swell (`bass + 0.32` when inactive) and slow breathing so the planet is alive before play.
