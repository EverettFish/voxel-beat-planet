// 全局光照（引擎件）：太阳颜色/高度与环境光全部来自气候状态；同一套数值同时喂星球着色器与场景 Lambert 灯。
(function () {
  class Lighting {
    constructor(scene, planet) {
      this.planet = planet;
      this.sunDirWorld = new THREE.Vector3(0.5, 0.6, 0.62).normalize();
      this.dirLight = new THREE.DirectionalLight(0xffffff, Math.PI);
      scene.add(this.dirLight); scene.add(this.dirLight.target);
      this.ambLight = new THREE.AmbientLight(0xffffff, Math.PI);
      scene.add(this.ambLight);
      // 背光补一点冷色，体素侧面不至于死黑（插画感的关键）
      this.fill = new THREE.DirectionalLight(0xbfd4ff, 0.5);
      scene.add(this.fill); scene.add(this.fill.target);
      this._inv = new THREE.Matrix4();
    }
    update(dt, f, time, cl) {
      // 太阳高度：sunElev 0 = 贴地平线（黄昏长光），1 = 高挂
      const e = cl.sunElev;
      this.sunDirWorld.set(0.62, 0.15 + e * 0.85, 0.66).normalize();
      const breathe = f.active ? 1 + 0.04 * Math.pow(1 - f.beatPhase, 2.5) * (0.3 + 0.7 * f.energy) : 1 + 0.03 * Math.sin(time * 0.9);
      const sun = cl.sunCol, amb = cl.ambCol;
      const u = this.planet.uniforms;
      this._inv.copy(this.planet.group.matrixWorld).invert();
      u.uSunDir.value.copy(this.sunDirWorld).transformDirection(this._inv);
      u.uSunCol.value.set(sun[0] * breathe * 0.62, sun[1] * breathe * 0.62, sun[2] * breathe * 0.62);
      u.uAmb.value.set(amb[0], amb[1], amb[2]);

      const sm = Math.max(sun[0], sun[1], sun[2], 1e-3);
      this.dirLight.color.setRGB(sun[0] / sm, sun[1] / sm, sun[2] / sm);
      this.dirLight.intensity = Math.PI * sm * 0.62 * breathe;
      this.dirLight.position.copy(this.sunDirWorld).multiplyScalar(3000);
      const am = Math.max(amb[0], amb[1], amb[2], 1e-3);
      this.ambLight.color.setRGB(amb[0] / am, amb[1] / am, amb[2] / am);
      this.ambLight.intensity = Math.PI * am * 0.92;
      this.fill.position.copy(this.sunDirWorld).multiplyScalar(-3000).setY(800);
      this.fill.intensity = Math.PI * 0.10 * am;
    }
  }
  MB.Lighting = Lighting;
})();
