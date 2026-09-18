// 造物库内核（引擎件，可复用）：把体素模型打包成 实体 / 发光 / 积雪 三层，外加建造通用件（窗、砖纹、轮子、带地基打包）。
// bespoke 的造物库（kit-*.js）只写“这首歌需要的东西长什么样”。
(function () {
  const VM = MB.VoxelModel, CFG = MB.CONFIG, T = MB.Terrain, U = CFG.UNIT, H3 = T.hash3i;
  const C = { white: 0xf5f1e6, black: 0x23222a, gold: 0xe2b33c };

  // ---------- pack 工具 ----------
  function pack(solid, glows, opts) {
    opts = opts || {};
    const off = opts.offset || solid.offset();
    const p = { solid: solid.build({ offset: off }), glow: [], snow: null, off, unit: solid.unit, bounds: solid.bounds() };
    for (const g of glows || []) if (g.vm.size) p.glow.push({ geo: g.vm.build({ offset: off, ao: false, cull: false }), group: g.group, lit: g.lit, offHex: g.off });
    if (opts.snow !== false) { const s = solid.snowCap(0xf4f8ff, opts.snowMinY); if (s.size) p.snow = s.build({ offset: off, ao: false }); }
    p.height = (p.bounds[4] - p.bounds[1] + 1) * solid.unit;
    return p;
  }
  const LAMBERT = new THREE.MeshLambertMaterial({ vertexColors: true });
  const SNOW = new THREE.MeshLambertMaterial({ color: 0xdfe6f2, transparent: true, opacity: 0, depthWrite: false });
  const GLOW_DEF = {};   // 由 bespoke 造物库登记：Kit.defineGlow({ 组名: [点亮色, 熄灭色] })
  function defineGlow(defs) { Object.assign(GLOW_DEF, defs); }
  function glowMat(group) { const d = GLOW_DEF[group] || [0xffffff, 0x222222]; return MB.Glow.mat(group, d[0], d[1]); }
  function toGroup(p) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(p.solid, LAMBERT));
    for (const gl of p.glow) g.add(new THREE.Mesh(gl.geo, glowMat(gl.group)));
    if (p.snow) { const s = new THREE.Mesh(p.snow, SNOW); s.renderOrder = 2; g.add(s); }
    g.userData.pack = p;
    return g;
  }

  // 窗：玻璃进发光层；窗台外凸、过梁、可选百叶/花箱。plane 'z'：墙面 z=const，dir=±1 为外法向
  function win(v, g, plane, a, y, c, w, h, dir, o) {
    o = o || {};
    const frame = o.frame || 0xf5f1e6;
    for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) {
      const x = plane === 'z' ? a + i : c, z = plane === 'z' ? c : a + i;
      v.del(x, y + j, z); g.set(x, y + j, z, 0xffffff);
    }
    for (let i = -1; i <= w; i++) {
      const x = plane === 'z' ? a + i : c + dir, z = plane === 'z' ? c + dir : a + i;
      v.set(x, y - 1, z, o.flower ? (i & 1 ? 0xc9412b : 0xe8862e) : frame);
      if (i >= 0 && i < w) { const lx = plane === 'z' ? a + i : c, lz = plane === 'z' ? c : a + i; v.set(lx, y + h, lz, frame); }
    }
    if (o.shutter) for (const i of [-1, w]) for (let j = 0; j < h; j++) {
      const x = plane === 'z' ? a + i : c + dir, z = plane === 'z' ? c + dir : a + i;
      v.set(x, y + j, z, o.shutter);
    }
  }
  function brickNoise(v, x0, y0, z0, x1, y1, z1, dark, seed) {
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) for (let z = z0; z <= z1; z++)
      if (v.has(x, y, z) && H3(x + seed, y * 3, z + seed * 2) < 0.13) v.set(x, y, z, dark);
  }

  // 带地基的 pack：y=0 即地面，y<0 埋入地下
  function packGround(v, glows, snowMinY) {
    const off = v.offset(); off[1] = 0;
    const p = { solid: v.build({ offset: off }), glow: [], off, unit: v.unit, bounds: v.bounds() };
    for (const gl of glows || []) if (gl.vm.size) p.glow.push({ geo: gl.vm.build({ offset: off, ao: false, cull: false }), group: gl.group });
    p.snow = v.snowCap(0xf4f8ff, snowMinY === undefined ? 2 : snowMinY).build({ offset: off, ao: false });
    p.height = (p.bounds[4] + 1) * v.unit;
    return p;
  }

  function wheel(v, x, y, z, r, col, spoke) {
    for (let a = -r; a <= r; a++) for (let b = -r; b <= r; b++) { const d = Math.hypot(a, b); if (d <= r + 0.3) v.set(x, y + a, z + b, d > r - 0.9 ? 0x23222a : (a === 0 || b === 0 ? spoke : col)); }
    v.set(x, y, z, 0xe2b33c);
  }
  MB.Kit = { pack, packGround, toGroup, glowMat, defineGlow, win, brickNoise, wheel, LAMBERT, SNOW };
})();
