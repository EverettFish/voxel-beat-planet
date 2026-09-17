# Voxel Beat Planet design

The skill turns an audio file and optional scene prompt into a bespoke Three.js voxel planet. Its key architectural boundary is between reusable runtime systems and non-reusable scene answers.

Reusable systems include offline/real-time Web Audio analysis, cube-sphere chunk rendering, compact instance attributes, camera controls, UI, culling, diagnostics, and primitive builders. Every generated project must replace the scene manifest, terrain, region masks, traveling-wave field, landmarks, population, vehicles, lettering, lighting choreography, and camera targets.

The default shell uses 104,544 large voxels (\`N=132\`) and a radius near 72–84 units. This makes several-voxel-height traveling waves and 15–50-unit landmarks readable in the whole-planet view. All hemispheres require authored density. Repeated geometry uses \`InstancedMesh\`; chunk visibility uses horizon, frustum, and back-face culling.

Audio motion has hierarchy. Bass drives one or two coherent spatial waves with phase delay. Midrange, treble, onset, beats, heavy beats, and section energy control distinct object classes and events. Uniform sphere scaling, random jitter as the main response, generic filler, and front-only composition are rejection conditions.

Generation begins by deciding time of day, season, weather, atmosphere, surface family, premise, palette, regions, distant-read landmarks, inhabitants, transport, title/portrait treatment, and hero events from user intent and audio evidence. Chrome validation starts at the default orbit distance and covers a full rotation before any close-up review.
