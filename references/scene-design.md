# Scene design

## Diagnostic — answer all of these before writing code

**1. Mood → light and sky.** What hour and weather is this song? Derive sky, sun colour and elevation, ambient and haze from that answer. A wistful autumn ballad is a pale-blue afternoon with warm sun and drifting cloud; a midnight dance track is a neon night. Stars must obey the key light: in a daytime chapter they are at 0. The sky is never empty — clouds and birds by day, nebulae and meteors by night — and sky elements react to the music too.

**2. Where does the song go?** Name the arc from first bar to last (arrival → loss, dusk → dawn, calm → storm → calm). This becomes the climate timeline. A world that looks the same at 0:10 and 3:40 has not listened to the song.

**3. Palette from a real picture.** Name the concrete image the song evokes and sample from it (for an autumn campus song: gold grass, maple red, lake blue, sky cyan). Ground value > 60 %. Keep one high-contrast structural colour (paths, field rows, a road) so the ground has texture without looking dirty. Self-test: if an orbit screenshot reads as "one brown/black mass", re-do the palette.

**4. Landmarks: silhouette first, fewer is better.** List the song's images. For each ask: *at five voxel-units wide, is the silhouette still nameable?* If not, enlarge it until it is, or delete it.
- good silhouettes: grand piano (raised lid, legs, bench), pagoda (tiered taper), swing (frame + hanging seat + rider), ferris wheel, windmill, lighthouse, steam train, lake
- bad silhouettes: picture frame, candle, wind chime, microphone — a pole with a small thing on it reads as noise from orbit. Use them only as close-up detail beside a real landmark.
Quantity order: theme element everywhere (hundreds of leaves / lanterns / notes) > 10–16 districts > people as punctuation (≤ 16).

**5. Motion per object.** Write the verb for each landmark: the swing swings, the mill turns, the beam sweeps, the train circles and the gates drop, the bell tolls, the boat drifts and freezes in. "Everything bobs together" is forbidden.

**6. Layout table first.** List every area (lat, lon, angular radius) and every ring (great-circle pole, half-width) in the manifest and run `check_layout.js`. Rules it enforces: edge gap between districts ≥ 0.04 rad; rings clear of districts unless the district declares `onRing`; every octant occupied; largest empty cap < 0.62 rad (fill anything > 0.5). Flattened low-`react` pads carry buildings; high-`react` wild land carries nature.

**7. Far read.** Name the five things recognisable from the default orbit distance. One of them should be painted into the terrain itself (a mosaic, a court, field stripes, a road).

## Song → world translation
- title and imagery → biomes, landmarks, the painted ground
- era and place → architecture, vehicles, signage style, UI type
- arrangement → what moves with what (see music-mapping)
- structure → climate chapters and hero events
- emotion → light, colour temperature, weather

Every planet needs: a one-sentence premise, 10–16 districts on both hemispheres and both poles, 1–3 rings with something travelling on them, a hero district at lon 0, a second wave source elsewhere, inhabitants at named spots, ≥ 3 hero events tied to chapters, ≥ 5 camera targets, and clickable landmarks that *answer* (the swing goes higher, the train whistles, the piano sends a ripple).

## Districts worth stealing the structure of (never the content)
hero hill or plaza · water body with something on it · a street of 10+ varied houses · an institutional building with a tower · a working landscape (fields, harbour, quarry) · a fairground or stage · a mountain with snowline · two distinct poles · 2–3 small hamlets that fill gaps · a station or crossing where rings meet.
