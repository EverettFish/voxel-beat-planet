# Craft standards

The reference level is a fine-scale voxel model railway: small voxels, many of them, dense composition, soft shading in every inside corner. The failure level is a handful of big cubes with dots on them.

## 1. One scale
- `CFG.UNIT` (≈ 0.6 world units) is the voxel size of **every** model. People may use 0.5. Clouds may be coarser. Nothing else. `validate_project.py` fails a kit with more than three literal units.
- Ground voxels are sized from N automatically (`CFG.CELL`); never hard-code the cube size — a wrong constant leaks light through the ground.
- Size budget in voxels (w × d × h): person 3×2×11 · car 5×11×7 · bus 7×19×11 · coach 9×25×15 · locomotive 9×30×18 · house 11×9×16 (2 floors) · landmark building 35×11×40 · hero tree 45×45×46.
- Hero exaggeration is allowed **by group scale ≤ 1.35**, never by bigger voxels. Check relative scale in a close-up: people vs doors vs lamps vs platforms.

## 2. Feature parts — a category is recognisable only when all of these are present
| category | must have |
|---|---|
| house | buried foundation skirt · plinth · corner quoins · floor band · windows with sill + lintel (+ shutters or flower box) · framed door, step, door lamp · overhanging gable roof two voxels thick · gable wall · chimney |
| institutional | all of the above + portico with columns and pediment · tower with clock faces on four sides · hip roof · flag |
| station | long low building · raised platform with safety line · canopy on posts with toothed valance · clock gable · name board · benches, luggage |
| steam train | boiler cylinder with brass bands · smokebox + door + headlamp · chimney, dome, sandbox · cab with roof overhang and side windows · running boards · cowcatcher · spoked driving wheels + rod + cylinder · tender with coal · coaches with a window band, two-tier roof, bogies, couplers · tail car with balcony and red lamps |
| swing | Π beam on **A-frame legs** · thin dark chains (a pale thick chain reads as a white pillar) · large contrasting seat · **a rider** · each seat its own pivot, amplitude 0.3–0.75 rad, seats in antiphase |
| grand piano | curved bentside body · raised lid on a prop stick showing strings/soundboard · key slip with 2-3 grouped black keys · three legs with brass casters · pedal lyre · bench · pianist; orient the **open side** to the viewer |
| pagoda / tower | solid body per tier · double-layer overhanging eaves · upturned corners · lantern under each corner · railings · stone base with stairs · finial |
| windmill | tapered round tower · gallery · cap · four lattice sails with half cloth, rotating as a separate mesh |
| lighthouse | banded taper · gallery with railing · glazed lamp room (glow) · dome · rotating beam |
| ferris wheel | twin A-frames · two rims + spokes · bulbs on the rim (two alternating glow groups) · gondolas as separate meshes that stay upright |
| tree | visible trunk with root flare and branches · crown of 3–9 overlapping blobs in 4–5 height-graded colours with leaf gaps · **solid dark core** (halves triangles) · separate crown layer |
| person | 3×3×3 head with hair and eyes · scarf or collar line · coat · separate arms · two legs · pose variant for sitting |
| vehicle | wheels with hubs · window band as glow · head/tail lamps · two-tone body |

Every object contrasts with its ground: dark things on light ground, light things on dark.

## 3. Layered packs
`MB.Kit.pack(solid, [{vm, group}], opts)` → **solid** (Lambert, vertex colours, baked AO) + **glow** layers (unlit colour by day, lit by `climate.lights`) + **snow** (`snowCap()` auto-generated, fades in with `climate.frost`). Layers share one offset so they align; instanced sets share one `instanceMatrix`. Use `packGround()` for buildings: y = 0 is ground level and the foundation skirt sits below it, so a rippling ground never shows a gap.

Windows: delete the wall voxel, put the glass in the glow layer, add a protruding sill and a lintel (`Kit.win`). Brick/plank variation: `Kit.brickNoise`. Roofs: `VoxelModel.gable()` / `hip()`.

## 4. VoxelModel toolbox
`box shell clear cyl disc blob line gable hip merge snowCap build`. `build()` bakes per-vertex ambient occlusion and flips quad diagonals on anisotropic AO — this is what makes small voxels read as form. Keep AO on for solids, off for glow and snow.

## 5. Annotated recipe (technique, not content)
```js
// swing seat as its own pivot: geometry hangs below y=0, pivot sits on the beam
const s = new VM(U);
s.line(-2, 0, 0, -2, -11, 0, IRON); s.line(2, 0, 0, 2, -11, 0, IRON);      // thin dark chains
s.box(-3, -12, -1, 3, -12, 1, SEAT);                                       // big contrasting seat
/* rider: torso, legs forward, scarf row, head, hands on the chains */
const geo = s.build({ offset: [-0.5, 0.5, -0.5] });
// scene: pivot.position = beam point; pivot.rotation.x = sin(t·rate + i·π) · (0.34 + energy·0.3)
```
Do not paste recipes from earlier planets. The checklists transfer; the objects do not.

## 6. Approve on the turntable
Register each landmark in `js/gallery.js`; render `?gallery=name`. Judge silhouette, feature parts and relative scale there. Only then place it.
