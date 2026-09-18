// STARTER — copy to js/terrain.js. Decide what is painted on the ground of every district and ring.
// Contract: MB.Terrain.sample(nx,ny,nz,res) fills res = { h (int voxel steps), r,g,b (sRGB bytes), react 0..1,
// water 0|1, snowable 0..1, zone (district/ring id or null), forest 0..1, rand 0..1 }.
(function (root) {
  const MB = root.MB, CFG = MB.CONFIG, T = MB.Terrain, R = CFG.R;
  const { fbm, vnoise, hash3i, smooth, clamp01, sstep, mixc, byte, DL, RL, toLocal } = T;
  // Illustration-grade palette: ground value > 60 %. Dark colours belong to trunks, iron and roofs — not to the ground.
  const P = { a: [226, 200, 120], b: [196, 206, 128], c: [150, 190, 110], sand: [238, 222, 172], water: [80, 160, 220], deep: [60, 128, 200], path: [150, 140, 128] };
  const col = [0, 0, 0], loc = [0, 0];
  const forest = (x, y, z) => sstep(0.44, 0.58, fbm(x * 3.1 + 5.2, y * 3.1 + 1.7, z * 3.1 + 9.4, 3));

  function sample(nx, ny, nz, res) {
    const macro = fbm(nx * 2, ny * 2, nz * 2, 3), tone = hash3i(Math.floor(nx * 4000), Math.floor(ny * 4000), Math.floor(nz * 4000));
    let h = (macro - 0.5) * 9 + (vnoise(nx * 31, ny * 31, nz * 31) - 0.5) * 1.4, react = 0.62 + clamp01(macro - 0.35) * 0.5;
    let water = 0, snowable = 1, zone = null;
    const band = fbm(nx * 4.3 + 3, ny * 4.3, nz * 4.3 + 8, 2);
    mixc(band < 0.45 ? P.b : band < 0.6 ? P.a : P.c, P.a, 0, col);          // posterised bands, not a smooth gradient
    for (const d of DL) {
      const dt = nx * d.c[0] + ny * d.c[1] + nz * d.c[2]; if (dt < 0.9) continue;
      const a = Math.acos(Math.min(1, dt)); if (a > d.r + 0.08) continue;
      const m = 1 - sstep(d.r - 0.05, d.r + 0.04, a); if (m <= 0) continue;
      if (m > 0.5) zone = d.id;
      toLocal(d, nx, ny, nz, loc);                                            // loc[0] east, loc[1] north, world units
      h *= 1 - m * d.flat; react += (d.react - react) * m;
      if (d.water) {
        if (a < d.water) { water = 1; snowable = 0; h = -2; react = 0.16; mixc(P.water, P.deep, sstep(0, d.water, d.water - a), col); }
        else if (a < d.water + 0.022) { h = -1; mixc(col, P.sand, 0.95, col); }
      }
      // ...paint this district: paths, courts, field rows, mosaics — anything readable from orbit
    }
    for (const r of RL) {
      const off = Math.abs(Math.asin(Math.max(-1, Math.min(1, nx * r.p[0] + ny * r.p[1] + nz * r.p[2]))));
      if (off > r.half + 0.03) continue;
      const m = 1 - sstep(r.half, r.half + 0.025, off);
      h *= 1 - m * 0.97; react += (r.react - react) * m;
      if (off < r.half) { zone = zone || r.id; h = 0; snowable = 0.4; mixc(col, P.path, 1, col); }
    }
    const k = 0.94 + tone * 0.1;
    res.h = Math.max(-6, Math.min(24, Math.round(h)));
    res.r = byte(col[0] * k); res.g = byte(col[1] * k); res.b = byte(col[2] * k);
    res.react = clamp01(react); res.water = water; res.snowable = snowable; res.zone = zone; res.forest = forest(nx, ny, nz); res.rand = tone;
  }
  Object.assign(T, { sample, forest, palette: P });
})(typeof window !== "undefined" ? window : globalThis);
