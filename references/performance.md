# Performance

Targets: 60 fps on a mid-range laptop GPU at N = 192; ≤ ~2.5 M triangles and ≤ ~300 draw calls in a typical view (`I` opens the stats panel; `shot.py` prints `INFO calls/tris`).

- **Planet**: 6·N² instanced voxels, 16 bytes each, per-chunk horizon culling. Default N = 192 (221 k); `?n=144` for weak machines. Voxel size derives from N.
- **Models**: face-culled merged geometry with baked AO. Crowns, balloons and other blobs get a **solid core** so inner faces are culled — this alone halved the triangle count of the reference planet.
- **Instancing**: anything that appears ≥ 4 times goes into an `InstSet`; layers share one matrix buffer. Trees are bucketed by octant and whole buckets are skipped (no update, not drawn) when they face away.
- **Anchors**: terrain is sampled once at build time. Per frame an object costs one `waveAt()` and one matrix compose. Static sets (track, signals) are written once with `dynamic = false`.
- **Particles**: `mesh.count = active`; only active particles are updated.
- **Lights**: no real point lights. 16 shader light pools + 4 range-faded spot slots in the planet shader; glow is unlit material colour.
- **Adaptive**: `main.js` drops the pixel ratio to 1 after 3 s below 28 fps.
- Avoid per-frame allocation in `update()`; reuse module-level vectors/quaternions. Use the seeded rng so screenshots are reproducible.
