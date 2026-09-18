# Lessons learned — real failures, real root causes

Collected from the first planets made with this skill (a disco planet and an autumn-ballad planet) over nine rounds of user feedback, and from rebuilding the second one from scratch.

| what the user said | root cause | rule now |
|---|---|---|
| "It just shakes to the beat — I want visible waves" | music response implemented as one global shake | displacement is a travelling wave field with sources; objects ride it |
| "Too dark, I want daytime" | default assumption "planet = night + stars" | light and sky are derived from the song's mood |
| "Still dark; I want a clear illustration look; the sky is empty" | palette swapped but still low-value; nothing in the mid sky | ground value > 60 %, posterised bands; clouds + birds |
| "I can't tell what half of these things are" | props chosen from lyrics without a silhouette test (frames, candles, chimes) | silhouette test at 5 units; delete what fails |
| "Why is everyone crowded here? The track runs through the campus! Half the planet is empty" | no layout table, random people scatter | manifest layout + `check_layout.js`; people at named spots |
| "The swing doesn't look like a swing" | pale thick chains read as two pillars; no seat contrast, no rider | swing feature parts; seats as separate pivots |
| "Buildings are just boxes" | one box + window dots | category feature-part checklists |
| (found in code) giant leaf and wind chime buried by the ground | static objects not following the wave | every ground object rides an anchor |
| (found in screenshot) cream-lit far hemisphere | spotlight cone without range fade | `rangeFade` in every spot slot |
| "Ugly, no design, not realistic; the train is crude" | every model used a different voxel unit (0.9–2.4): people as tall as buildings, models made of a dozen cubes | one shared fine unit; detail from voxel count; baked AO |
| (found in screenshot) light leaking through the ground | cube size hard-coded while the cell size depends on N | cube size derived from N |
| (rebuild) clouds hid the planet | clouds sized like landmarks | small, flat, high; count follows cloud cover |
| (rebuild) people taller than the station canopy | model units fine, group scale not checked | close-up scale check in QA |
| (rebuild) piano read as a black slab | lid's back faced the camera; hero scaled too far | orient the readable side to the focus camera; exaggeration ≤ 1.35 |
| (rebuild) lake turned grey at dusk | warm light × blue albedo | water keeps part of its own colour regardless of light |
| (rebuild) snow blown out | no tone-mapping + white albedo | frost albedo ≈ 0.78, keep total light ≈ 1 |
| (rebuild) 3.9 M triangles | hollow crowns draw inner faces | solid dark core inside blobs |
| "The climate should change as the music advances" | world was a static tableau | climate timeline is a required system |
