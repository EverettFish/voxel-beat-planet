// 发光材质登记处（引擎件）：每组灯共享一个材质，有“熄灭色”和“点亮色”两态。
// 白天窗户是深色玻璃、路灯是乳白灯罩；黄昏章节 climate.lights 升起后才变成暖光——灯不再在白天傻亮。
(function () {
  const groups = new Map();
  const Glow = {
    mat(name, litHex, offHex) {
      let g = groups.get(name);
      if (!g) {
        g = { lit: new THREE.Color(litHex), off: new THREE.Color(offHex === undefined ? 0x222222 : offHex), mat: new THREE.MeshBasicMaterial({ color: litHex }), level: 0, boost: 1 };
        groups.set(name, g);
      }
      return g.mat;
    },
    set(name, level, boost) {
      const g = groups.get(name); if (!g) return;
      g.level = Math.max(0, Math.min(1, level)); g.boost = boost === undefined ? 1 : boost;
      g.mat.color.copy(g.off).lerp(_c.copy(g.lit).multiplyScalar(g.boost), g.level);
    },
    get(name) { const g = groups.get(name); return g ? g.level * g.boost : 0; },

    // 每帧调用 bespoke 的灯光编排（lights-score.js 里定义 MB.Glow.score）
    update(f, time, cl) { if (this.score) this.score(f, time, cl); },
  };
  const _c = new THREE.Color();
  MB.Glow = Glow;
})();
