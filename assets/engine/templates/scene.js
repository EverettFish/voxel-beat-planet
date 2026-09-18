// STARTER — copy to js/scene.js. Place the kit on the layout table and give every thing the motion that thing would make.
// Required API: new MB.World(planet) · update(dt,f,time,cl,camera) · feedPlanetLights(uniforms,cl) · pick(raycaster)
//               target(id) · getFocusPose(target,pos,forward,up) · focus{}  (see the engine's main.js / controls.js)
(function () {
  const CFG = MB.CONFIG, T = MB.Terrain, K = MB.Kit, R = CFG.R;
  const { anchorDir, anchorLocal, anchorRing, ride, InstSet, TreeSet, packLayers, meshGroup } = MB.Place;
  const rng = T.mulberry32(CFG.SEED + 41), _res = {}, _v = new THREE.Vector3(), _m = new THREE.Matrix4(), _q = new THREE.Quaternion();

  class World {
    constructor(planet) {
      this.planet = planet; this.group = new THREE.Group(); planet.group.add(this.group);
      this.pickables = []; this.focus = {}; this.riders = []; this.sets = []; this.trees = []; this.pointLights = [];
      this.crownMat = new THREE.MeshLambertMaterial({ vertexColors: true });
      // Scatter: people and landmarks are NEVER scattered — only nature is, and only outside districts / rings / water.
      const spots = [], N = 1600;
      for (let i = 0; i < N; i++) {
        const y = 1 - 2 * (i + 0.5) / N, r = Math.sqrt(1 - y * y), ph = i * 2.399963;
        const d = [r * Math.cos(ph), y, r * Math.sin(ph)]; T.sample(d[0], d[1], d[2], _res);
        if (_res.water || _res.zone || rng() > (_res.forest > 0.3 ? 0.6 : 0.08)) continue;
        const a = anchorDir(d, null, rng() * 6.28, -0.3, 0.85 + rng() * 0.45); a.rnd = rng(); a.bald = a.rnd < 0.3; spots.push(a);
      }
      // bucket by octant so far-side buckets can be culled
      const buckets = {}; for (const a of spots) { const k = (a.d.x > 0 ? 1 : 0) | (a.d.y > 0 ? 2 : 0) | (a.d.z > 0 ? 4 : 0); (buckets[k] || (buckets[k] = [])).push(a); }
      const model = K.makeTree(1); for (const k in buckets) this.trees.push(new TreeSet(this.group, model, buckets[k], this.crownMat));
      this.weather = new MB.Weather(planet, { vortexDir: T.districts.hero.c, mistDir: T.districts.water.c });
    }
    update(dt, f, time, cl, camera) {
      const P = this.planet, wind = cl.wind * (0.5 + f.mid * 0.9);
      const camDir = _v.copy(camera.position).applyMatrix4(_m.copy(P.group.matrixWorld).invert()).normalize().clone();
      K.SNOW.opacity = Math.min(1, Math.max(0, (cl.frost - 0.12) / 0.5)); K.SNOW.visible = K.SNOW.opacity > 0.01;
      for (const t of this.trees) t.update(P, cl, time, wind, camDir);
      for (const s of this.sets) if (s.dynamic) s.write(P);
      for (const r of this.riders) ride(P, r.a, r.obj);
      this.weather.update(dt, f, time, cl);
    }
    feedPlanetLights(uniforms, cl) { const col = uniforms.uPtCol.value; for (let i = 0; i < col.length; i++) col[i].w = 0; }
    pick() { return null; }
    target() { return null; }
    getFocusPose(target, pos, forward, up) { pos.set(0, 0, R); forward.set(0, -1, 0); up.set(0, 0, 1); }
  }
  MB.World = World;
})();
