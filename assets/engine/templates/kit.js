// STARTER — copy to js/kit.js (split into several files when it grows). Build what THIS song needs.
// One voxel unit for the whole planet (CFG.UNIT). Detail comes from voxel count, never from bigger voxels.
// Read references/craft-standards.md first: every category has feature parts that must all be present.
(function () {
  const VM = MB.VoxelModel, K = MB.Kit, U = MB.CONFIG.UNIT;
  K.defineGlow({ window: [0xffc66e, 0x3b4a5c], lamp: [0xffd48a, 0xe6dfcc] });   // group: [lit colour, unlit colour]

  // A layered tree: trunk / crown / snow. Solid dark core inside the crown halves the triangle count.
  function makeTree(size) {
    const th = Math.round(6 + size * 3), cr = 3.2 + size * 1.5, trunk = new VM(U), crown = new VM(U);
    trunk.box(0, 0, 0, 1, th, 1, 0x5c3b22);
    crown.blob(0, th + cr * 0.6, 0, cr, cr * 0.8, cr, (x, y, z, d) => d < 0.6 ? 0x3a6a3a : (MB.Terrain.hash3i(x, y, z) < 0.14 ? null : [0x8ac06a, 0x6aa850, 0x4f8f44][Math.max(0, Math.min(2, Math.floor((1 - (y / (cr * 0.8) + 1) / 2) * 3)))]));
    const off = [-1, 0, -1];
    return { trunk: trunk.build({ offset: off }), crown: crown.build({ offset: off }), snow: crown.snowCap().build({ offset: off, ao: false }), crownY: (th + cr * 0.5) * U };
  }
  Object.assign(K, { makeTree });
})();
