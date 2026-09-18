# Screenshot-driven QA

Code that looks right is not evidence. Render and look.

## Debug parameters
`?shot` skip overlay · `?fakebeat` synthetic beat · `?t=<s>` wave phase · `?ct=<s>` pin climate · `?cam=dist,phi,theta` · `?focus=<landmark id>` snap to the fly-to camera · `?norot` · `?n=96` fast low-res ground · `?freeze=<frames>` stop the loop (title becomes `FROZEN`) · `?gallery=a,b&az=&el=&lights=1` kit turntable.

## Protocol
1. **Turntable** — every landmark, before placement. Nameable in one second? All feature parts present?
2. **Orbit ×4** — `cam=372,1.22,θ` for θ = 0, 1.57, 3.14, −1.57 (add a polar view).
3. **One close-up per camera target** — `focus=<id>`. Check relative scale (people vs doors vs lamps), orientation (the readable side faces the camera), nothing blocking the view, nothing floating or buried.
4. **One frame per climate chapter** — `ct=` mid-chapter. Is the change obvious? Is the darkest chapter still legible? Is water still water-coloured under warm light? Is snow not blown out?
5. **Two wave phases** — same view, different `t`: the ground and the things on it must differ.
6. **Real path once** — open a fresh page → click the start button → the built-in track plays → click a chapter tick → no console errors and no upload step.

## Checklist
- [ ] every landmark recognisable in its close-up; no unidentifiable colour blobs from any angle
- [ ] no overlaps, no crowd at one focus, no ring through a district (`check_layout.js` green)
- [ ] every octant has content; the far side is authored, not leftover
- [ ] one coherent scale; hero exaggeration ≤ 1.35
- [ ] ground is bright and banded, not a dark mass; the sky is not empty
- [ ] lights are off in daylight chapters and on at dusk; no spotlight leaking to the far side
- [ ] clouds never hide the planet; particles do not read as noise
- [ ] each landmark has its own motion; nothing shares a bob
- [ ] clicking a landmark flies there and the landmark answers
- [ ] no lyric text, no TODO/placeholder, debug UI hidden; `assets/track.js` contains the authorised built-in track
- [ ] `validate_project.py` passes; triangle and draw-call budgets respected
