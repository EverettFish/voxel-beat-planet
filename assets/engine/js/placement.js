// 球面放置与贴地（引擎件，可复用）。
// anchor = 建造期缓存的 { 方向 d, 朝向 q, 地面高度 h, 律动系数 react, 额外高度 alt, 缩放 s }。
// 每帧贴地只需要一次 planet.waveAt()：不再逐帧采样地形，几百个物体也不掉帧。
//   anchorDir(方向)   anchorLocal(区域id, x东, z北, heading)   anchorRing(环线id, t, side, alt, 'in'|'back')
//   ride(planet, anchor, obj)            独立物体贴地
//   InstSet(parent, layers, anchors)     多图层（实体/发光/积雪）共享一份 instanceMatrix 的实例集合
//   TreeSet(parent, model, anchors, mat) 干/冠/雪三层的树；冠层随气候换色、变稀；按集合中心做背面剔除
(function () {
  const CFG = MB.CONFIG, T = MB.Terrain, Surf = MB.Surf, R = CFG.R;
  const _res = {}, _v = new THREE.Vector3(), _v2 = new THREE.Vector3(), _v3 = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
  const _m = new THREE.Matrix4(), _s = new THREE.Vector3(), _p = new THREE.Vector3(), _a3 = [0, 0, 0];
  const X_AXIS = new THREE.Vector3(1, 0, 0), Z_AXIS = new THREE.Vector3(0, 0, 1);
  const K = { get LAMBERT() { return MB.Kit.LAMBERT; }, get SNOW() { return MB.Kit.SNOW; }, glowMat: g => MB.Kit.glowMat(g) };

  // ---------- anchor ----------
  function quatFwd(d, fwd, out) {
    _v2.copy(fwd).addScaledVector(d, -fwd.dot(d)).normalize();
    _v3.crossVectors(d, _v2).normalize();
    _m.makeBasis(_v3, d, _v2);
    return out.setFromRotationMatrix(_m);
  }
  function anchorDir(dArr, fwd, heading, alt, scale) {
    const d = new THREE.Vector3(dArr[0], dArr[1], dArr[2]).normalize();
    T.sample(d.x, d.y, d.z, _res);
    const q = new THREE.Quaternion();
    if (fwd) quatFwd(d, fwd, q); else Surf.quatAt(d, heading || 0, q);
    return { d, q, h: _res.h * CFG.VOX, react: _res.react, alt: alt || 0, s: scale || 1, zone: _res.zone, water: _res.water };
  }
  // 区域局部坐标（x 东 z 北，世界单位），heading 相对区域的“北”
  function anchorLocal(id, x, z, heading, alt, scale) {
    const D = T.districts[id]; T.fromLocal(id, x, z, _a3);
    const h = heading || 0;
    _v.set(D.n[0] * Math.cos(h) + D.e[0] * Math.sin(h), D.n[1] * Math.cos(h) + D.e[1] * Math.sin(h), D.n[2] * Math.cos(h) + D.e[2] * Math.sin(h));
    return anchorDir(_a3, _v.clone(), 0, alt, scale);
  }
  // 环线：t 参数角，side 横向偏移（沿 pole 方向为正），faceIn = 面朝轨道
  function anchorRing(id, t, side, alt, mode) {
    const r = T.rings[id]; T.ringPoint(id, t, side, _a3);
    const tan = new THREE.Vector3(-Math.sin(t) * r.e1[0] + Math.cos(t) * r.e2[0], -Math.sin(t) * r.e1[1] + Math.cos(t) * r.e2[1], -Math.sin(t) * r.e1[2] + Math.cos(t) * r.e2[2]);
    let fwd = tan;
    if (mode === 'in') fwd = new THREE.Vector3(r.p[0], r.p[1], r.p[2]).multiplyScalar(side > 0 ? -1 : 1);
    if (mode === 'back') fwd = tan.clone().negate();
    return anchorDir(_a3, fwd, 0, alt);
  }
  function ride(planet, a, obj, extraAlt) {
    const w = a.react > 0.05 ? planet.waveAt(a.d.x, a.d.y, a.d.z, a.react) : 0;
    obj.position.copy(a.d).multiplyScalar(R + a.h + w + a.alt + (extraAlt || 0));
  }

  // ---------- 实例集合：多图层共享一份 instanceMatrix ----------
  class InstSet {
    constructor(parent, layers, anchors, dynamic) {
      this.anchors = anchors; this.dynamic = dynamic !== false; this.meshes = [];
      const n = Math.max(1, anchors.length);
      layers.forEach((L, i) => {
        if (!L || !L.geo) return;
        const m = new THREE.InstancedMesh(L.geo, L.mat, n);
        if (this.meshes.length) m.instanceMatrix = this.meshes[0].instanceMatrix;
        m.count = anchors.length; m.frustumCulled = false; if (L.order) m.renderOrder = L.order;
        m.raycast = () => {}; parent.add(m); this.meshes.push(m);
      });
      this.center = new THREE.Vector3(); anchors.forEach(a => this.center.add(a.d)); if (anchors.length) this.center.normalize();
      this.visible = true;
    }
    setVisible(v) { if (v !== this.visible) { this.visible = v; this.meshes.forEach(m => { m.visible = v; }); } }
    write(planet) {
      const m0 = this.meshes[0]; if (!m0) return;
      for (let i = 0; i < this.anchors.length; i++) {
        const a = this.anchors[i];
        const w = (planet && a.react > 0.05) ? planet.waveAt(a.d.x, a.d.y, a.d.z, a.react) : 0;
        _p.copy(a.d).multiplyScalar(R + a.h + w + a.alt); _s.setScalar(a.s);
        _m.compose(_p, a.q, _s); m0.setMatrixAt(i, _m);
      }
      m0.instanceMatrix.needsUpdate = true;
    }
  }
  function packLayers(p) {
    const L = [{ geo: p.solid, mat: K.LAMBERT }];
    for (const g of p.glow || []) L.push({ geo: g.geo, mat: K.glowMat(g.group) });
    if (p.snow) L.push({ geo: p.snow, mat: K.SNOW, order: 2 });
    return L;
  }
  function meshGroup(p) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(p.solid, K.LAMBERT));
    for (const gl of p.glow || []) g.add(new THREE.Mesh(gl.geo, K.glowMat(gl.group)));
    if (p.snow) { const s = new THREE.Mesh(p.snow, K.SNOW); s.renderOrder = 2; g.add(s); }
    return g;
  }

  // ---------- 树：干 / 冠 / 雪三层，冠层按章节换色、变稀；按八分体分桶做背面剔除 ----------
  class TreeSet {
    constructor(parent, model, anchors, crownMat) {
      this.model = model; this.anchors = anchors;
      this.trunk = new InstSet(parent, [{ geo: model.trunk, mat: K.LAMBERT }], anchors);
      this.crown = model.crown ? new InstSet(parent, [{ geo: model.crown, mat: crownMat }, { geo: model.snow, mat: K.SNOW, order: 2 }], anchors) : null;
      this.snowOnly = !model.crown && model.snow ? new InstSet(parent, [{ geo: model.snow, mat: K.SNOW, order: 2 }], anchors) : null;
      if (this.snowOnly) this.snowOnly.meshes[0].instanceMatrix = this.trunk.meshes[0].instanceMatrix;
      this.center = this.trunk.center;
    }
    update(planet, cl, time, wind, camDir) {
      const vis = this.center.dot(camDir) > -0.42;
      this.trunk.setVisible(vis); if (this.crown) this.crown.setVisible(vis); if (this.snowOnly) this.snowOnly.setVisible(vis);
      if (!vis) return;
      const t0 = this.trunk.meshes[0], c0 = this.crown && this.crown.meshes[0], cy = this.model.crownY || 0;
      for (let i = 0; i < this.anchors.length; i++) {
        const a = this.anchors[i];
        const w = a.react > 0.05 ? planet.waveAt(a.d.x, a.d.y, a.d.z, a.react) : 0;
        const rad = R + a.h + w + a.alt;
        // 风里摇：绕局部 x/z 的小角度
        const sw = (0.015 + wind * 0.05) * Math.sin(time * (0.9 + a.rnd) + a.rnd * 40);
        _q.copy(a.q).multiply(_q2.setFromAxisAngle(X_AXIS, sw)).multiply(_q2.setFromAxisAngle(Z_AXIS, sw * 0.7));
        _p.copy(a.d).multiplyScalar(rad); _s.setScalar(a.s); _m.compose(_p, _q, _s); t0.setMatrixAt(i, _m);
        if (c0) {
          // 落叶进度：每棵树阈值不同，三成的树最后掉光，其余变稀
          const drop = Math.max(0, Math.min(1, (cl.bare - a.rnd * 0.35) / 0.65));
          const cs = a.bald ? Math.max(0, 1 - drop * 1.25) : 1 - drop * 0.42;
          _v.set(0, cy * a.s * (1 - cs), 0).applyQuaternion(_q);
          _p.add(_v); _s.setScalar(a.s * cs); _m.compose(_p, _q, _s); c0.setMatrixAt(i, _m);
        }
      }
      t0.instanceMatrix.needsUpdate = true; if (c0) c0.instanceMatrix.needsUpdate = true;
    }
  }

  MB.Place = { quatFwd, anchorDir, anchorLocal, anchorRing, ride, InstSet, TreeSet, packLayers, meshGroup };
})();
