# Climate timeline — the world changes as the song advances

`js/climate.js` interpolates `MB_SCENE.chapters[].state` over song time into one continuous `MB.Climate.state`. Every system reads that object each frame. Chapter boundaries come from `analyze_audio.py`; blends are 6–14 s and are low-passed, so seeking never hard-cuts. With no audio the timeline auto-tours; when another track is dropped in, song time is rescaled to `MB_SCENE.duration`.

## State fields and who reads them
| field | range | drives |
|---|---|---|
| `skyTop` `skyHor` | display rgb | dome gradient, water tint |
| `sunCol` `ambCol` | light multipliers | planet shader + scene lights (keep lit top faces ≈ 1.0 total; there is no tone-mapping) |
| `sunElev` | 0–1 | sun height: 0.12 = long dusk light, 0.75 = noon |
| `haze` `hazeCol` | 0–1 | ground wash + atmosphere rim |
| `cloud` `cloudCol` | 0–1 | dome cloud cover, number/size/colour of voxel clouds |
| `wind` | 0–1.5 | leaf speed, tree sway, sails, cloud drift, flags |
| `leaf` `rain` `snow` | 0–1 | particle counts (leaf = the song's falling thing: petals, confetti, embers, notes) |
| `wet` | 0–1 | ground darkens and saturates |
| `frost` | 0–1 | frost line advances from the poles and from high ground; snow layers on roofs and crowns fade in |
| `ice` | 0–1 | water freezes; boats stop |
| `lights` | 0–1 | windows, lamps, halos, beams, point-light pools; chimney smoke |
| `stars` `aurora` | 0–1 | sky points and curtain |
| `canopy` `bare` | 0–1 | crown tint shift; crowns thin tree by tree, 30 % go fully bare |
| `mist` | 0–1 | low puffs over water |

All chapters must carry the same keys. Add fields when the song needs them (lava glow, tide height, bloom) and read them where relevant — that is the point of the single state object.

## Designing the arc
1. Put a chapter at every real section change. Quiet sections get calm weather; full sections get the event (storm, lights-on, first snow).
2. Each chapter changes **at least three visible systems** (sky + ground + inhabitants), otherwise nobody notices.
3. Tie a hero event to each big transition and write it in `heroEvents`: the falling thing spirals up from the hero landmark; umbrellas open; lights switch on and the beam starts; the frost line closes and the lake freezes.
4. The last chapter must be reachable within the song: end with the world transformed, not mid-transition.
5. Night chapters stay legible: ambient ≥ 0.4, snow/frost brightens the ground, lights carry the warmth. "Too dark" has been a real user complaint.

Arc patterns: season turn (mist → clear → storm of leaves → rain → dusk → first snow → snow night) · one night out (golden hour → neon → rain on asphalt → blue hour → dawn) · voyage (harbour morning → open sea → squall → aurora → landfall) · memory (overexposed noon → sepia → fog → clear starlight).

## Debug
`?ct=<seconds>` pins the climate; combine with `freeze` for one screenshot per chapter. The player shows the chapter name and tick marks; clicking a tick seeks there.
