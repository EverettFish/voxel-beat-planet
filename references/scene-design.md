# Designing a planet that belongs to one song

## Evidence ladder

Use evidence in this order:

1. explicit user description and exclusions;
2. user-provided lyrics, notes, artwork, or story context;
3. audio metadata such as title, artist, album, and year;
4. audible structure: tempo, groove, instrumentation, dynamics, density, and section changes;
5. culturally recognizable high-level context that can be stated without reproducing protected text;
6. original inference.

Label uncertain inference in the scene bible. Do not claim a lyric or story fact that was not provided or verified.

## Scene-bible checklist

Write a short, decisive document containing:

- **One-line premise:** the emotional metaphor made spatial.
- **Planet anatomy:** 6–10 named regions spread around all sides of the sphere. State what appears on the rear and poles; an attractive front with empty back faces fails.
- **World state:** explicitly choose day/night/twilight, season, weather, atmosphere, and whether the surface is Earth-like, lunar, Martian, oceanic, mechanical, or invented. Base every choice on the music or prompt.
- **Density plan:** what fills foreground, midground, skyline, and negative space.
- **Population:** who lives or moves here, what they do, and how activity changes by section.
- **Systems:** roads, rail, rivers, migration paths, weather, power, agriculture, industry, ritual, or other circulation appropriate to the premise.
- **Hero events:** at least three readable transformations reserved for musically important moments.
- **Camera story:** default silhouette, close-detail destinations, and one guided moment.
- **Palette/materials:** dominant, support, and accent colors with a clear reason.
- **Exclusions:** obvious clichés that would dilute this particular concept.
- **Distant read:** list the five features that remain identifiable in the default whole-planet view without zoom.
- **Typography/portrait decision:** when title or artist identity is known, decide whether monumental voxel lettering or a highly stylized portrait belongs on the sphere and how it moves.

## Uniqueness test

Before implementation, answer:

- Would the same terrain make sense under an unrelated song?
- Are more than half the landmarks generic music symbols?
- Is the world recognizable in a silent screenshot?
- Does every region contain at least one living or mechanical behavior?
- Are the busiest areas visible from the default camera?
- Can a viewer see the surface wave's direction, crest, and delayed propagation from the default camera?
- After a 180-degree rotation, is the opposite hemisphere equally authored and dense?
- Is every tree, rock, house, speaker, vehicle, or crowd present for a song-specific reason rather than as filler?

If the first two answers are yes or any later answer is no, redesign before coding.

## Reusable versus bespoke

Reusable: chunk renderer, cube-sphere mapping, shader interfaces, audio analysis, camera controls, UI, voxel primitive builder, placement math, culling, diagnostics.

Bespoke: planet scale, surface type, time of day, season, weather, palette, terrain functions, traveling-wave fields, region masks, landmark geometry, inhabitants, vehicles, lettering, portraits, event choreography, light groups, camera targets, naming, copy, and scene manifest.
