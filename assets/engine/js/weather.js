// 天气粒子（引擎件，可复用）：落叶 / 雨 / 雪 / 烟 / 体素云 / 水面薄雾。全部 InstancedMesh，数量与强度读气候状态。
// 粒子活在星球局部空间（跟着星球自转），只更新“当前激活”的那一部分：mesh.count = 激活数。
(function () {
  const CFG = MB.CONFIG, R = CFG.R, T = MB.Terrain;
  const rng = T.mulberry32(CFG.SEED + 909);
  const _m = new THREE.Matrix4(), _p = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _s = new THREE.Vector3(), _e = new THREE.Euler();
  const _a = new THREE.Vector3(), _b = new THREE.Vector3(), _up = new THREE.Vector3();
  const randDir = () => { const y = rng() * 2 - 1, ph = rng() * Math.PI * 2, r = Math.sqrt(1 - y * y); return [r * Math.cos(ph), y, r * Math.sin(ph)]; };

  function leafGeo() {
    const v = new MB.VoxelModel(0.42);
    v.set(0, 0, 0, 0xffffff).set(1, 0, 0, 0xffffff).set(-1, 0, 0, 0xffffff).set(0, 0, 1, 0xffffff).set(0, 0, -1, 0xffffff).set(1, 0, 1, 0xffffff).set(-1, 0, 1, 0xffffff).set(0, 0, -2, 0xffffff);
    return v.build({ offset: [-0.5, 0, -0.5], ao: false });
  }

  function cloudGeo(k) {
    const v = new MB.VoxelModel(1.2), n = 3 + k;
    for (let i = 0; i < n; i++) {
      const x = Math.round((i - (n - 1) / 2) * 4.2 + (rng() - 0.5) * 2), r = 2.6 + rng() * 2.2;
      v.blob(x, 0, Math.round((rng() - 0.5) * 3), r, r * 0.7, r * 0.9, (px, py) => py < -1 ? null : (py < 0 ? 0xdfe4ec : 0xffffff));
    }
    return v.build({ offset: [-0.5, 0, -0.5] });
  }

  class Weather {
    constructor(planet, opts) {
      this.planet = planet; opts = opts || {};
      this.group = new THREE.Group(); planet.group.add(this.group);
      this.vortex = opts.vortexDir || [0, 0, 1];          // 飘落物的涡旋从哪里升起
      this.leafPalette = opts.leafPalette || [0xd8402a, 0xe8762e, 0xb8301f, 0xf0a63a, 0xf6cc5a, 0xc93426];
      this.buildLeaves(opts.leaves || 460); this.buildRain(opts.rain || 760); this.buildSnow(opts.snow || 760);
      this.buildPuffs(56); this.buildClouds(60); this.buildMist(opts.mistDir, 16);
    }
    inst(geo, mat, n) { const m = new THREE.InstancedMesh(geo, mat, n); m.frustumCulled = false; m.count = 0; this.group.add(m); return m; }

    buildLeaves(N) {
      const pal = this.leafPalette;
      this.leaves = this.inst(leafGeo(), new THREE.MeshLambertMaterial({ vertexColors: true }), N);
      this.leafData = []; const c = new THREE.Color();
      for (let i = 0; i < N; i++) {
        this.leafData.push({ d: randDir(), ph: rng() * 100, fall: 0.6 + rng() * 0.9, drift: 0.04 + rng() * 0.08, tumble: 1 + rng() * 2.5, s: 0.8 + rng() * 0.9, vortex: i % 4 === 0 });
        this.leaves.setColorAt(i, c.setHex(pal[i % pal.length]));
      }
      this.leaves.instanceColor.needsUpdate = true;
    }
    buildRain(N) {
      this.rain = this.inst(new THREE.BoxGeometry(0.10, 2.2, 0.10), new THREE.MeshBasicMaterial({ color: 0xcfe2f2, transparent: true, opacity: 0.55, depthWrite: false }), N);
      this.rainData = []; for (let i = 0; i < N; i++) this.rainData.push({ d: randDir(), ph: rng() * 40, sp: 38 + rng() * 16 });
    }
    buildSnow(N) {
      this.snow = this.inst(new THREE.BoxGeometry(0.36, 0.36, 0.36), new THREE.MeshBasicMaterial({ color: 0xffffff }), N);
      this.snowData = []; for (let i = 0; i < N; i++) this.snowData.push({ d: randDir(), ph: rng() * 40, sp: 2.2 + rng() * 2.4, wob: rng() * 6.28 });
    }
    buildPuffs(N) {
      const v = new MB.VoxelModel(0.5); v.blob(0, 0, 0, 2.2, 1.8, 2.2, 0xffffff);
      this.puffMat = new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
      this.puffs = this.inst(v.build({ offset: [-0.5, -0.5, -0.5], ao: false }), this.puffMat, N);
      this.puffs.count = N; this.puffData = []; this.puffNext = 0;
      for (let i = 0; i < N; i++) { this.puffData.push({ life: 0, max: 1, p: new THREE.Vector3(), v: new THREE.Vector3(), s: 1 }); _m.makeScale(0, 0, 0); this.puffs.setMatrixAt(i, _m); }
    }
    // 在星球局部坐标 pos 处吐一团烟/汽。vel 为初速（局部空间），size 起始大小
    puff(pos, vel, size, life) {
      const d = this.puffData[this.puffNext]; this.puffNext = (this.puffNext + 1) % this.puffData.length;
      d.p.copy(pos); d.v.copy(vel); d.s = size || 1; d.life = d.max = life || 2.4;
    }
    buildClouds(N) {
      this.cloudMat = new THREE.MeshLambertMaterial({ vertexColors: true });
      this.cloudSets = [0, 1, 2].map(k => this.inst(cloudGeo(k), this.cloudMat, Math.ceil(N / 3)));
      this.cloudData = [];
      for (let i = 0; i < N; i++) this.cloudData.push({ lat: (rng() - 0.5) * 2.6, lon: rng() * Math.PI * 2, alt: 50 + rng() * 26, sp: 0.010 + rng() * 0.02, th: rng(), s: 0.55 + rng() * 0.6, set: i % 3, idx: Math.floor(i / 3) });
      this.cloudSets.forEach(s => { s.count = Math.ceil(N / 3); });
    }
    buildMist(dirArr, N) {
      this.mistDir = dirArr || null; if (!dirArr) return;
      const v = new MB.VoxelModel(1.1); v.blob(0, 0, 0, 5, 1.2, 3, 0xffffff);
      this.mistMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
      this.mist = this.inst(v.build({ offset: [-0.5, 0, -0.5], ao: false }), this.mistMat, N); this.mist.count = N;
      this.mistData = []; for (let i = 0; i < N; i++) this.mistData.push({ a: rng() * 6.28, r: 4 + rng() * 22, sp: (rng() - 0.5) * 0.08, s: 0.7 + rng() * 0.9 });
    }

    place(mesh, i, d, alt, quat, s) { _p.set(d[0], d[1], d[2]).multiplyScalar(R + alt); _s.setScalar(s); _m.compose(_p, quat, _s); mesh.setMatrixAt(i, _m); }

    update(dt, f, time, cl) {
      const wind = cl.wind * (0.55 + f.mid * 0.9);
      // ---- 落叶：数量随章节，速度随风；每 4 片里 1 片属于 vortexDir 处升起的涡旋 ----
      const nLeaf = Math.round(this.leafData.length * Math.min(1, cl.leaf * (0.75 + 0.4 * f.energy)));
      this.leaves.count = nLeaf;
      const V = this.vortex;
      for (let i = 0; i < nLeaf; i++) {
        const L = this.leafData[i];
        let dx, dy, dz, alt;
        if (L.vortex) {
          const k = ((time * (0.10 + wind * 0.10) + L.ph) % 1), ang = k * 9 + L.ph * 6, rad = 0.05 + k * 0.42;
          // 以 vortexDir 为极点的螺旋：角半径随升空变大
          _up.set(V[0], V[1], V[2]); _a.set(V[2], 0, -V[0]).normalize(); _b.crossVectors(_up, _a);
          _p.copy(_up).multiplyScalar(Math.cos(rad)).addScaledVector(_a, Math.sin(rad) * Math.cos(ang)).addScaledVector(_b, Math.sin(rad) * Math.sin(ang));
          dx = _p.x; dy = _p.y; dz = _p.z; alt = 18 + k * 34 * (0.5 + cl.wind * 0.5) - k * k * 30;
        } else {
          const lon = L.ph + time * L.drift * (0.3 + wind);
          const c = Math.cos(lon * 0.2), s = Math.sin(lon * 0.2);
          dx = L.d[0] * c + L.d[2] * s; dz = -L.d[0] * s + L.d[2] * c; dy = L.d[1];
          alt = 24 - ((time * L.fall * (0.8 + wind) + L.ph * 7) % 25);
        }
        _q.setFromEuler(_e.set(time * L.tumble + L.ph, time * L.tumble * 0.7, L.ph));
        _p.set(dx, dy, dz).multiplyScalar(R + Math.max(0.6, alt)); _s.setScalar(L.s); _m.compose(_p, _q, _s); this.leaves.setMatrixAt(i, _m);
      }
      this.leaves.instanceMatrix.needsUpdate = true;

      // ---- 雨：沿径向快速下落的细丝 ----
      const nRain = Math.round(this.rainData.length * cl.rain); this.rain.count = nRain;
      for (let i = 0; i < nRain; i++) {
        const D = this.rainData[i], alt = 46 - ((time * D.sp + D.ph * 9) % 46);
        _up.set(D.d[0], D.d[1], D.d[2]); _q.setFromUnitVectors(_b.set(0, 1, 0), _up);
        this.place(this.rain, i, D.d, alt, _q, 1);
      }
      if (nRain) this.rain.instanceMatrix.needsUpdate = true;

      // ---- 雪：慢、左右飘、高音时闪一下 ----
      const nSnow = Math.round(this.snowData.length * cl.snow); this.snow.count = nSnow;
      for (let i = 0; i < nSnow; i++) {
        const D = this.snowData[i], alt = 40 - ((time * D.sp * (1 + wind * 0.6) + D.ph * 5) % 40);
        const w = Math.sin(time * 0.7 + D.wob) * 0.012 * (1 + wind);
        _p.set(D.d[0] + w * D.d[2], D.d[1], D.d[2] - w * D.d[0]).normalize().multiplyScalar(R + alt);
        _q.identity(); _s.setScalar(0.8 + 0.5 * Math.sin(D.wob + time)); _m.compose(_p, _q, _s); this.snow.setMatrixAt(i, _m);
      }
      if (nSnow) this.snow.instanceMatrix.needsUpdate = true;

      // ---- 烟团 ----
      for (let i = 0; i < this.puffData.length; i++) {
        const P = this.puffData[i];
        if (P.life <= 0) continue;
        P.life -= dt; P.p.addScaledVector(P.v, dt); P.v.multiplyScalar(1 - dt * 0.6);
        const k = 1 - Math.max(0, P.life) / P.max, s = P.life <= 0 ? 0 : P.s * (0.5 + k * 1.6) * (k > 0.7 ? (1 - k) / 0.3 : 1);
        _q.identity(); _s.setScalar(s); _m.compose(P.p, _q, _s); this.puffs.setMatrixAt(i, _m);
      }
      this.puffs.instanceMatrix.needsUpdate = true;
      const night = 1 - Math.min(1, (cl.ambCol[0] + cl.ambCol[1]) * 1.0);
      this.puffMat.color.setRGB(0.95 - night * 0.2, 0.95 - night * 0.2, 0.97);

      // ---- 体素云：云量阈值决定出场的云朵数，颜色跟章节 ----
      this.cloudMat.color.setRGB(cl.cloudCol[0], cl.cloudCol[1], cl.cloudCol[2]);
      for (const c of this.cloudData) {
        c.lon += dt * c.sp * (0.4 + wind * 1.4);
        const show = Math.max(0, Math.min(1, (cl.cloud * 1.15 - c.th) * 6));
        const d = T.latLonToDir(c.lat, c.lon);
        MB.Surf.quatAt(_up.set(d[0], d[1], d[2]), 1.57, _q);
        _p.copy(_up).multiplyScalar(R + c.alt); _s.set(c.s * show * (1 + cl.rain * 0.35), c.s * show * 0.8, c.s * show * (1 + cl.rain * 0.35)); _m.compose(_p, _q, _s);
        this.cloudSets[c.set].setMatrixAt(c.idx, _m);
      }
      this.cloudSets.forEach(s => { s.instanceMatrix.needsUpdate = true; });

      // ---- 湖面薄雾 ----
      if (this.mist) {
        this.mistMat.opacity = cl.mist * 0.34; this.mist.visible = cl.mist > 0.02;
        if (this.mist.visible) {
          const M = this.mistDir; _up.set(M[0], M[1], M[2]); _a.set(M[2], 0, -M[0]).normalize(); _b.crossVectors(_up, _a);
          this.mistData.forEach((D, i) => {
            D.a += dt * D.sp;
            _p.copy(_up).multiplyScalar(R).addScaledVector(_a, Math.cos(D.a) * D.r).addScaledVector(_b, Math.sin(D.a) * D.r).normalize();
            MB.Surf.quatAt(_p, D.a, _q); _p.multiplyScalar(R + 1.5 + Math.sin(time * 0.4 + i) * 0.6); _s.setScalar(D.s); _m.compose(_p, _q, _s); this.mist.setMatrixAt(i, _m);
          });
          this.mist.instanceMatrix.needsUpdate = true;
        }
      }
    }
  }
  MB.Weather = Weather;
})();
