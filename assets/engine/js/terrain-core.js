// 地表内核（引擎件，可复用）：噪声、立方体球映射、布局表 → 区域/环线局部坐标系。
// bespoke 的 terrain.js 只需要写调色板与 sample()；布局永远来自 scene-manifest.js，地表“画的”与场景“摆的”共用同一张表。
(function (root) {
  const MB = root.MB || (root.MB = {});
  const CFG = MB.CONFIG, S = root.MB_SCENE, R = CFG.R;

  function mulberry32(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hash3i(x, y, z) {
    let h = (x * 374761393 + y * 668265263 + z * 1442695041 + CFG.SEED) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  }
  const smooth = t => t * t * (3 - 2 * t);
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const sstep = (a, b, v) => smooth(clamp01((v - a) / (b - a)));
  function vnoise(x, y, z) {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
    const fx = smooth(x - xi), fy = smooth(y - yi), fz = smooth(z - zi);
    const c000 = hash3i(xi, yi, zi), c100 = hash3i(xi + 1, yi, zi), c010 = hash3i(xi, yi + 1, zi), c110 = hash3i(xi + 1, yi + 1, zi);
    const c001 = hash3i(xi, yi, zi + 1), c101 = hash3i(xi + 1, yi, zi + 1), c011 = hash3i(xi, yi + 1, zi + 1), c111 = hash3i(xi + 1, yi + 1, zi + 1);
    const x00 = c000 + (c100 - c000) * fx, x10 = c010 + (c110 - c010) * fx, x01 = c001 + (c101 - c001) * fx, x11 = c011 + (c111 - c011) * fx;
    const y0 = x00 + (x10 - x00) * fy, y1 = x01 + (x11 - x01) * fy;
    return y0 + (y1 - y0) * fz;
  }
  function fbm(x, y, z, oct) {
    let amp = 0.5, sum = 0, norm = 0;
    for (let i = 0; i < oct; i++) { sum += vnoise(x, y, z) * amp; norm += amp; x = x * 2.03 + 11.7; y = y * 2.01 + 7.1; z = z * 1.97 + 19.3; amp *= 0.5; }
    return sum / norm;
  }

  const cubeOut = [0, 0, 0];
  function cubeDir(face, i, j, N) {
    const a = ((i + 0.5) / N * 2 - 1) * Math.PI / 4, b = ((j + 0.5) / N * 2 - 1) * Math.PI / 4;
    const u = Math.tan(a), v = Math.tan(b);
    let x, y, z;
    switch (face) {
      case 0: x = 1; y = v; z = -u; break;
      case 1: x = -1; y = v; z = u; break;
      case 2: x = u; y = 1; z = -v; break;
      case 3: x = u; y = -1; z = v; break;
      case 4: x = u; y = v; z = 1; break;
      default: x = -u; y = v; z = -1;
    }
    const inv = 1 / Math.hypot(x, y, z);
    cubeOut[0] = x * inv; cubeOut[1] = y * inv; cubeOut[2] = z * inv;
    return cubeOut;
  }
  const latLonToDir = (lat, lon) => [Math.cos(lat) * Math.sin(lon), Math.sin(lat), Math.cos(lat) * Math.cos(lon)];
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const norm3 = a => {
    const l = Math.hypot(a[0], a[1], a[2]);
    if (l < 1e-8) throw new Error('direction vectors must be non-zero');
    return [a[0] / l, a[1] / l, a[2] / l];
  };
  // Pick a reference axis that cannot be parallel to d. This keeps tangent
  // frames finite for authored districts at the poles and equatorial rings
  // whose pole is exactly [0, 1, 0].
  const tangent = d => norm3(cross(d, Math.abs(d[1]) > 0.98 ? [1, 0, 0] : [0, 1, 0]));

  // ---------- 布局表 → 局部坐标系 ----------
  const districts = {};
  for (const d of S.districts) {
    const c = latLonToDir(d.lat, d.lon);
    const e = tangent(c);
    const n = cross(c, e);
    districts[d.id] = Object.assign({}, d, { c, e, n });
  }
  const rings = {};
  for (const r of S.rings) {
    const p = norm3(r.pole);
    const e1 = tangent(p), e2 = cross(p, e1);
    rings[r.id] = Object.assign({}, r, { p, e1, e2 });
  }
  const DL = Object.values(districts), RL = Object.values(rings);
  // 局部坐标：x 向东、z 向北（世界单位，正射）
  function toLocal(d, nx, ny, nz, out) { out[0] = R * (nx * d.e[0] + ny * d.e[1] + nz * d.e[2]); out[1] = R * (nx * d.n[0] + ny * d.n[1] + nz * d.n[2]); return out; }
  function fromLocal(id, x, z, out) {
    const d = districts[id], k = Math.sqrt(Math.max(0, 1 - (x * x + z * z) / (R * R)));
    out[0] = d.c[0] * k + (d.e[0] * x + d.n[0] * z) / R;
    out[1] = d.c[1] * k + (d.e[1] * x + d.n[1] * z) / R;
    out[2] = d.c[2] * k + (d.e[2] * x + d.n[2] * z) / R;
    return out;
  }
  function ringPoint(id, t, side, out) {   // side：沿 pole 方向的横向偏移（世界单位）
    const r = rings[id], c = Math.cos(t), s = Math.sin(t), k = (side || 0) / R;
    const x = r.e1[0] * c + r.e2[0] * s + r.p[0] * k, y = r.e1[1] * c + r.e2[1] * s + r.p[1] * k, z = r.e1[2] * c + r.e2[2] * s + r.p[2] * k;
    const l = Math.hypot(x, y, z); out[0] = x / l; out[1] = y / l; out[2] = z / l; return out;
  }

  const mixc = (a, b, t, o) => { o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t; o[2] = a[2] + (b[2] - a[2]) * t; return o; };
  const byte = v => Math.max(0, Math.min(255, Math.round(v)));

  MB.Terrain = {
    cubeDir, fbm, vnoise, hash3i, mulberry32, latLonToDir, smooth, clamp01, sstep, mixc, byte,
    districts, rings, DL, RL, toLocal, fromLocal, ringPoint,
    sample() { throw new Error('terrain.js must define MB.Terrain.sample'); },
  };
})(typeof window !== "undefined" ? window : globalThis);
