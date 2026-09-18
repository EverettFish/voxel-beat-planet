// 体素模型构建器（引擎件，可复用）。
// - 整数键存储（±511 格），比字符串键快一个量级，模型可以放心做细
// - build() 烘焙逐顶点环境光遮蔽（经典 0fps voxel AO）+ 面朝向明暗：凹角变暗，体块才“立得住”
// - 多层模型（实体 / 发光 / 积雪）用同一个 offset 对齐：先 solid.offset()，再传给其他层
// - snowCap()：自动给每根柱子的最高体素盖一层雪，冬季章节淡入
(function () {
  const FACES = [
    { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] },
    { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
    { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] },
    { n: [0, -1, 0], u: [1, 0, 0], v: [0, 0, 1] },
    { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] },
    { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
  ];
  const FACE_SHADE = [0.86, 0.80, 1.0, 0.55, 0.93, 0.74];
  const AO_CURVE = [0.52, 0.70, 0.86, 1.0];
  const OFF = 512, MASK = 1023;
  const K = (x, y, z) => ((x + OFF) << 20) | ((y + OFF) << 10) | (z + OFF);

  const colorCache = new Map();
  function linearRGB(hex) {
    let c = colorCache.get(hex);
    if (!c) { const col = new THREE.Color(hex); c = [col.r, col.g, col.b]; colorCache.set(hex, c); }
    return c;
  }

  class VoxelModel {
    constructor(unit) { this.unit = unit || MB.CONFIG.UNIT; this.vox = new Map(); }
    set(x, y, z, hex) { this.vox.set(K(Math.round(x), Math.round(y), Math.round(z)), hex); return this; }
    del(x, y, z) { this.vox.delete(K(x, y, z)); return this; }
    has(x, y, z) { return this.vox.has(K(x, y, z)); }
    get(x, y, z) { return this.vox.get(K(x, y, z)); }
    get size() { return this.vox.size; }
    each(fn) { for (const [k, hex] of this.vox) fn((k >> 20 & MASK) - OFF, (k >> 10 & MASK) - OFF, (k & MASK) - OFF, hex); }

    box(x0, y0, z0, x1, y1, z1, hex) {
      for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++)
        for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++)
          for (let z = Math.min(z0, z1); z <= Math.max(z0, z1); z++) this.set(x, y, z, hex);
      return this;
    }
    // 只有外壳的盒子（大体量建筑省体素）
    shell(x0, y0, z0, x1, y1, z1, hex) {
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++)
        if (x === x0 || x === x1 || y === y0 || y === y1 || z === z0 || z === z1) this.set(x, y, z, hex);
      return this;
    }
    clear(x0, y0, z0, x1, y1, z1) {
      for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++) this.del(x, y, z);
      return this;
    }
    // 竖直圆柱 / 圆盘
    cyl(cx, y0, cz, r, y1, hex, hollow) {
      const ri = Math.ceil(r);
      for (let y = y0; y <= y1; y++) for (let x = -ri; x <= ri; x++) for (let z = -ri; z <= ri; z++) {
        const d = Math.hypot(x, z);
        if (d <= r + 0.01 && (!hollow || d > r - 1.0)) this.set(cx + x, y, cz + z, hex);
      }
      return this;
    }
    disc(cx, y, cz, r, hex) { return this.cyl(cx, y, cz, r, y, hex); }
    // 椭球（rx, ry, rz），pick(x,y,z,d) 可返回颜色或 null（用于多色树冠、条纹气球）
    blob(cx, cy, cz, rx, ry, rz, pick, shellOnly) {
      for (let x = -Math.ceil(rx); x <= Math.ceil(rx); x++) for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) for (let z = -Math.ceil(rz); z <= Math.ceil(rz); z++) {
        const d = Math.sqrt((x / rx) ** 2 + (y / ry) ** 2 + (z / rz) ** 2);
        if (d > 1.0) continue;
        if (shellOnly && d < 1 - 1.6 / Math.min(rx, ry, rz)) continue;
        const hex = typeof pick === 'function' ? pick(x, y, z, d) : pick;
        if (hex !== null && hex !== undefined) this.set(cx + x, cy + y, cz + z, hex);
      }
      return this;
    }
    // 3D 直线（链条、拉索、树枝、斜撑）
    line(x0, y0, z0, x1, y1, z1, hex, thick) {
      const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0), 1);
      for (let i = 0; i <= n; i++) {
        const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n), z = Math.round(z0 + (z1 - z0) * i / n);
        this.set(x, y, z, hex);
        if (thick) { this.set(x + 1, y, z, hex); this.set(x, y, z + 1, hex); this.set(x + 1, y, z + 1, hex); }
      }
      return this;
    }
    // 双坡屋顶：屋脊沿 x（axis='x'）或 z。over = 出檐格数。gableHex 给定时补山花三角墙
    gable(x0, x1, z0, z1, y, axis, tile, ridge, over, gableHex) {
      over = over === undefined ? 1 : over;
      const X = axis === 'x';
      const lo = X ? z0 : x0, hi = X ? z1 : x1, l0 = X ? x0 : z0, l1 = X ? x1 : z1;
      const put = (l, yy, w, hex) => X ? this.set(l, yy, w, hex) : this.set(w, yy, l, hex);
      const top = Math.floor((hi - lo) / 2) + over;
      for (let r = 0; r <= top; r++) {
        const a = lo - over + r, b = hi + over - r;
        if (a >= b - 1 || r === top) {
          for (let l = l0 - over; l <= l1 + over; l++) for (let w = Math.min(a, b); w <= Math.max(a, b); w++) put(l, y + r, w, ridge);
          break;
        }
        for (let l = l0 - over; l <= l1 + over; l++) {
          put(l, y + r, a, tile); put(l, y + r, b, tile);
          if (r > 0) { put(l, y + r - 1, a, tile); put(l, y + r - 1, b, tile); }   // 两格厚，瓦层之间出现阶梯暗缝
        }
        if (gableHex) for (const l of [l0, l1]) for (let w = Math.max(lo, a + 1); w <= Math.min(hi, b - 1); w++) put(l, y + r, w, gableHex);
      }
      return this;
    }
    // 四坡攒尖顶（亭、塔、钟楼）
    hip(cx, cz, half, y, tile, step) {
      step = step || 1;
      let r = half, yy = y;
      while (r >= 0) { this.box(cx - r, yy, cz - r, cx + r, yy, cz + r, tile); r -= step; yy++; }
      return yy;
    }
    merge(other, dx, dy, dz) { other.each((x, y, z, hex) => this.set(x + (dx || 0), y + (dy || 0), z + (dz || 0), hex)); return this; }

    bounds() {
      let a = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9];
      this.each((x, y, z) => { if (x < a[0]) a[0] = x; if (y < a[1]) a[1] = y; if (z < a[2]) a[2] = z; if (x > a[3]) a[3] = x; if (y > a[4]) a[4] = y; if (z > a[5]) a[5] = z; });
      return a;
    }
    // x/z 居中、y 落地的偏移。多层模型共用它来保持对齐。
    offset() { const b = this.bounds(); return [-(b[0] + b[3] + 1) / 2, -b[1], -(b[2] + b[5] + 1) / 2]; }

    // 给每根柱子的最高体素盖雪（skip: 不盖雪的颜色集合，如发光体）
    snowCap(hex, minY) {
      const top = new Map();
      this.each((x, y, z) => { const k = x * 4096 + z; const t = top.get(k); if (t === undefined || y > t[1]) top.set(k, [x, y, z]); });
      const s = new VoxelModel(this.unit);
      for (const [x, y, z] of top.values()) if (minY === undefined || y >= minY) s.set(x, y + 1, z, hex || 0xf4f8ff);
      return s;
    }

    // opts.offset: [ox,oy,oz]（缺省 = this.offset()）；opts.ao=false 关闭 AO（发光层）；opts.cull=false 保留内部面
    build(opts) {
      opts = opts || {};
      const unit = this.unit, cull = opts.cull !== false, useAO = opts.ao !== false;
      const off = opts.offset || this.offset();
      const pos = [], nor = [], col = [], idx = [];
      let vi = 0;
      const ao4 = [0, 0, 0, 0];
      this.each((x, y, z, hex) => {
        const c = linearRGB(hex);
        for (let f = 0; f < 6; f++) {
          const F = FACES[f], n = F.n, u = F.u, v = F.v;
          if (cull && this.has(x + n[0], y + n[1], z + n[2])) continue;
          const sh = FACE_SHADE[f];
          const cx = x + off[0] + 0.5 + n[0] * 0.5, cy = y + off[1] + 0.5 + n[1] * 0.5, cz = z + off[2] + 0.5 + n[2] * 0.5;
          const sg = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
          for (let q = 0; q < 4; q++) {
            const su = sg[q][0], sv = sg[q][1];
            let a = 3;
            if (useAO) {
              const bx = x + n[0], by = y + n[1], bz = z + n[2];
              const s1 = this.has(bx + su * u[0], by + su * u[1], bz + su * u[2]) ? 1 : 0;
              const s2 = this.has(bx + sv * v[0], by + sv * v[1], bz + sv * v[2]) ? 1 : 0;
              const cc = this.has(bx + su * u[0] + sv * v[0], by + su * u[1] + sv * v[1], bz + su * u[2] + sv * v[2]) ? 1 : 0;
              a = (s1 && s2) ? 0 : 3 - (s1 + s2 + cc);
            }
            ao4[q] = a;
            const k = sh * AO_CURVE[a];
            pos.push((cx + (su * u[0] + sv * v[0]) * 0.5) * unit, (cy + (su * u[1] + sv * v[1]) * 0.5) * unit, (cz + (su * u[2] + sv * v[2]) * 0.5) * unit);
            nor.push(n[0], n[1], n[2]);
            col.push(c[0] * k, c[1] * k, c[2] * k);
          }
          // AO 各向异性时翻转对角线，避免难看的三角缝
          if (ao4[0] + ao4[2] > ao4[1] + ao4[3]) idx.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3);
          else idx.push(vi + 1, vi + 2, vi + 3, vi + 1, vi + 3, vi);
          vi += 4;
        }
      });
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.setIndex(idx);
      g.computeBoundingSphere();
      g.userData.voxels = this.vox.size;
      return g;
    }
  }

  // ---------- 球面放置 ----------
  const CFG = MB.CONFIG;
  const _up = new THREE.Vector3(), _fwd = new THREE.Vector3(), _right = new THREE.Vector3(), _m = new THREE.Matrix4();
  const _e = new THREE.Vector3(), _n = new THREE.Vector3();
  const Surf = {
    dir(lat, lon, out) { return (out || new THREE.Vector3()).set(Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)); },
    latLon(v) { return [Math.asin(Math.max(-1, Math.min(1, v.y))), Math.atan2(v.x, v.z)]; },
    // 以单位方向 d 为“上”，heading（0=北，顺时针向东）为 +Z 前向，写出四元数
    quatAt(d, heading, outQ) {
      _e.set(d.z, 0, -d.x);
      if (_e.lengthSq() < 1e-8) _e.set(1, 0, 0);
      _e.normalize();
      _n.crossVectors(d, _e);
      _fwd.copy(_n).multiplyScalar(Math.cos(heading)).addScaledVector(_e, Math.sin(heading)).normalize();
      _up.copy(d);
      _right.crossVectors(_up, _fwd).normalize();
      _m.makeBasis(_right, _up, _fwd);
      return outQ.setFromRotationMatrix(_m);
    },
    place(obj, lat, lon, heading, alt) {
      const d = this.dir(lat, lon, obj.position);
      this.quatAt(d.clone(), heading || 0, obj.quaternion);
      obj.position.multiplyScalar(CFG.R + (alt || 0));
      return obj;
    },
    // 从 (lat,lon) 沿 heading 走 dist（世界单位）后的方向（区域内部用局部 x/z 摆放）
    offsetDir(base, east, north, x, z, out) {
      return out.copy(base).multiplyScalar(CFG.R).addScaledVector(east, x).addScaledVector(north, z).normalize();
    },
  };

  MB.VoxelModel = VoxelModel;
  MB.Surf = Surf;
})();
