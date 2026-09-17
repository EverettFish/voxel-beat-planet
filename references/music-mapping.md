# Musical feature mapping

Use a small set of stable audio features and map them to meaning, not decoration.

| Feature | Best uses | Avoid |
| --- | --- | --- |
| sub/bass envelope | traveling terrain crests, vehicle momentum, large-scale sway | uniform radius scaling or per-frame hard jumps |
| mid envelope | crowds, foliage, architecture mechanisms, weather density | making every object scale |
| treble envelope | window shimmer, particles, surface micro-ripples | large camera shake or random whole-sphere jitter |
| onset/tick | footfalls, sparks, shutters, small lamps | global flash on every transient |
| beat pulse | coordinated actions with a readable decay | binary on/off flicker |
| heavy beat | rare collective accents and hero-event triggers | triggering every frame above a threshold |
| section energy | lighting, population, camera distance, event intensity | changing the scene premise |
| silence/idle | believable ambient motion | freezing the world completely |

## Timing

Prefer offline analysis before playback and index features against `AudioContext.currentTime`. Compensate for output latency when available. Smooth continuous envelopes with separate attack and release; drive discrete actions from onset crossings with cooldowns.

Give each object class one primary driver and at most two secondary drivers. Reserve collective flashes or palette shifts for heavy beats and section transitions so the hierarchy remains legible.

## Traveling surface waves

The surface must show propagation. Build displacement from spatial phase, for example:

- longitude sweep: `sin(lon * bands - phase)`;
- latitude rings: `sin(lat * bands - phase * speed)`;
- great-circle wave from a hero landmark using angular distance;
- authored route wave that follows a railway, road, title stroke, coastline, or crowd formation.

Combine no more than two large waves plus a small high-frequency ripple. Multiply by region masks and per-voxel reactivity, but keep neighboring voxels phase-coherent. Bass amplitude should span several large voxel heights at energetic moments. Buildings should remain anchored to the displaced surface or intentionally counter-move; they must not appear to detach accidentally.

Reject an implementation when a still camera makes the planet look as if it only vibrates in place. A crest must visibly enter one region, cross it, and leave later.

## Semantic examples

These are mapping patterns, not scene prescriptions:

- a train can accelerate with energy and compress its suspension on beats;
- a wetland can inhale with bass while fireflies answer treble;
- apartment windows can form a chorus-scale illumination wave;
- animals can change formation at section boundaries;
- a storm front can advance with spectral brightness.
- monumental song-title letters can lift stroke by stroke as a crest crosses the inscription;
- a large portrait can change pose or lighting by section while nearby districts use different beat actions.

The same feature must produce a different visible behavior when the story changes.
