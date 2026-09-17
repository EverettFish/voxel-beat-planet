# Performance contract

## Surface shell

- Default grid: `N=132`, exactly `6 * N * N = 104,544` large surface voxels.
- Keep the planet radius around 72–84 world units so a surface voxel is visually substantial and hero props can occupy 10–35% of the diameter.
- Partition every cube-sphere face into chunks; `CHUNK=22` yields 216 chunks. Other divisors are valid when they preserve useful chunk-level culling.
- Use one shared indexed five-face voxel geometry and one shared material.
- Store compact per-instance direction/height/color/reactivity attributes. Reconstruct position, tangent basis, displacement, and lighting in the vertex shader.
- Do not allocate an `instanceMatrix` for the planet surface.

## Culling

Use all three layers:

1. CPU horizon/back-side culling at chunk granularity.
2. Three.js frustum culling with conservative chunk bounding spheres.
3. GPU triangle back-face culling with front-side material.

Keep region props spatially grouped. Use `InstancedMesh` for repeated song-specific props such as dancers, lights, speakers, vehicles, title voxels, track sleepers, stage decorations, or crowd members. Do not add generic vegetation or buildings merely to raise density.

## Budgets

- Cap device pixel ratio at 1.5 by default.
- Avoid real-time shadows; fake contact shadows and baked face shading are usually clearer for voxel art.
- Target fewer than 220 visible draw calls from the default camera and fewer than 140 close to the surface.
- Reuse geometries and materials; update instance matrices only for classes that visibly move.
- Keep expensive FFT work out of the render loop.
- Spend the saved surface-voxel budget on readable landmarks, characters, architecture, lettering, vehicles, and distinct animations distributed across all six faces.

## Verification

Expose an `i` diagnostics panel showing FPS, draw calls, total/visible chunks, and audio features. Test at whole-planet and close-detail distances in current Chrome with hardware acceleration. First inspect a full 360-degree rotation at the default distance: every side must stay dense, large props must remain legible, and a traveling crest must be obvious without zoom. A passing syntax check is not a rendering test.
