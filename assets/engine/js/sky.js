// 天空（引擎件）：气候驱动的天穹（渐变 + 太阳辉光 + 程序云 + 极光）、星点、星球大气辉边。
// 天空的一切颜色/云量/星星亮度都读气候状态：白天星星压到 0，夜里才出来；极光只在章节需要时出现。
(function () {
  const rng = MB.Terrain.mulberry32(MB.CONFIG.SEED + 4242);
  const NOISE = `
    float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float noise(vec3 x){ vec3 i = floor(x); vec3 f = fract(x); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
                 mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z); }
    float fbm(vec3 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 5; i++){ s += a * noise(p); p = p * 2.02 + 3.7; a *= 0.5; } return s; }`;

  class Sky {
    constructor(scene, pixelRatio) {
      this.group = new THREE.Group();
      this.buildDome(); this.buildStars(pixelRatio); this.buildAtmosphere(scene);
      scene.add(this.group);
    }
    buildDome() {
      this.u = {
        uTime: { value: 0 }, uTop: { value: new THREE.Vector3() }, uHor: { value: new THREE.Vector3() },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Vector3(1, 1, 1) },
        uCloud: { value: 0.3 }, uCloudCol: { value: new THREE.Vector3(1, 1, 1) }, uAurora: { value: 0 }, uWind: { value: 0.3 }, uBeat: { value: 0 },
      };
      const mat = new THREE.ShaderMaterial({
        uniforms: this.u, side: THREE.BackSide, depthWrite: false,
        vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `
          uniform float uTime, uCloud, uAurora, uWind, uBeat; uniform vec3 uTop, uHor, uSunDir, uSunCol, uCloudCol; varying vec3 vDir; ${NOISE}
          void main(){
            vec3 d = normalize(vDir);
            float t = smoothstep(-0.35, 0.75, d.y);
            vec3 col = mix(uHor, uTop, t);
            // 地平线以下再压一点，星球轮廓更干净
            col = mix(col, uHor * 0.92, smoothstep(0.0, -0.8, d.y) * 0.5);
            float sd = max(dot(d, uSunDir), 0.0);
            col += uSunCol * (pow(sd, 6.0) * 0.16 + pow(sd, 90.0) * 0.55 + smoothstep(0.9993, 0.9997, sd) * 0.9);
            // 像素云：把方向量化成小格再取噪声，云边呈块状（和体素世界同一语言）
            vec3 q = floor(d * 150.0) / 150.0;
            float c1 = fbm(q * 3.0 + vec3(uTime * 0.012 * (0.4 + uWind), 0.0, uTime * 0.007));
            float c2 = fbm(q * 6.1 + vec3(5.2, uTime * 0.006, 1.3));
            float cov = mix(0.74, 0.30, uCloud);
            float cl = smoothstep(cov, cov + 0.10, c1 * 0.72 + c2 * 0.28);
            float shade = smoothstep(cov + 0.05, cov + 0.32, c1);
            col = mix(col, uCloudCol * (1.0 - 0.22 * shade), cl * 0.92);
            // 极光：高纬度的绿/紫帷幕，随节拍轻颤
            float band = sin(atan(d.z, d.x) * 3.0 + uTime * 0.12 + fbm(d * 2.6) * 5.0);
            float curtain = smoothstep(0.42, 0.02, abs(d.y - 0.18 - band * 0.12)) * smoothstep(0.25, 0.75, fbm(vec3(atan(d.z, d.x) * 5.0, d.y * 1.5, uTime * 0.05)));
            vec3 au = mix(vec3(0.18, 0.95, 0.62), vec3(0.62, 0.36, 0.95), smoothstep(0.15, 0.55, d.y + band * 0.08));
            col += au * curtain * uAurora * (0.75 + 0.35 * uBeat) * (1.0 - cl * 0.8);
            gl_FragColor = vec4(col, 1.0);   // 气候色按显示色给出：不再做线性→sRGB 转换
          }`,
      });
      const sph = new THREE.Mesh(new THREE.SphereGeometry(6000, 48, 32), mat);
      sph.frustumCulled = false; sph.renderOrder = -10;
      this.group.add(sph);
    }
    buildStars(pr) {
      const N = 2600, pos = new Float32Array(N * 3), size = new Float32Array(N), seed = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const y = rng() * 2 - 1, phi = rng() * Math.PI * 2, r = Math.sqrt(1 - y * y);
        pos[i * 3] = r * Math.cos(phi) * 5200; pos[i * 3 + 1] = y * 5200; pos[i * 3 + 2] = r * Math.sin(phi) * 5200;
        size[i] = 1.2 + Math.pow(rng(), 4) * 3.4; seed[i] = rng();
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('aSize', new THREE.BufferAttribute(size, 1));
      g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
      this.su = { uTime: { value: 0 }, uAmt: { value: 0 }, uPR: { value: pr }, uTreble: { value: 0 } };
      const mat = new THREE.ShaderMaterial({
        uniforms: this.su, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        vertexShader: `attribute float aSize, aSeed; uniform float uTime, uPR, uTreble; varying float vTw;
          void main(){ vTw = 0.65 + 0.35 * sin(uTime * (0.8 + aSeed * 2.4) + aSeed * 60.0) + uTreble * 0.4 * step(0.8, aSeed);
            gl_PointSize = aSize * uPR; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform float uAmt; varying float vTw;
          void main(){ vec2 p = abs(gl_PointCoord - 0.5); float a = step(max(p.x, p.y), 0.34); gl_FragColor = vec4(vec3(0.95, 0.97, 1.0) * vTw, a * uAmt); }`,
      });
      const pts = new THREE.Points(g, mat); pts.frustumCulled = false; pts.renderOrder = -9;
      this.group.add(pts);
    }
    // 大气辉边：比星球略大的球壳，菲涅尔边缘染上雾色——晨雾/黄昏/雪夜的“空气感”主要靠它
    buildAtmosphere(scene) {
      this.au = { uCol: { value: new THREE.Vector3(1, 1, 1) }, uAmt: { value: 0.3 } };
      const mat = new THREE.ShaderMaterial({
        uniforms: this.au, transparent: true, depthWrite: false, side: THREE.BackSide,
        vertexShader: `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `uniform vec3 uCol; uniform float uAmt; varying vec3 vN; varying vec3 vV;
          void main(){ float f = pow(clamp(dot(-vN, vV), 0.0, 1.0), 2.2); gl_FragColor = vec4(uCol, f * uAmt); }`,
      });
      const shell = new THREE.Mesh(new THREE.SphereGeometry(MB.CONFIG.R * 1.34, 48, 32), mat);
      shell.renderOrder = -5;
      scene.add(shell);
    }
    update(dt, f, time, cl, sunDirWorld) {
      const u = this.u;
      u.uTime.value = time; u.uBeat.value = f.beat;
      u.uTop.value.fromArray(cl.skyTop); u.uHor.value.fromArray(cl.skyHor);
      u.uSunDir.value.copy(sunDirWorld);
      u.uSunCol.value.fromArray(cl.sunCol).multiplyScalar(1 - cl.cloud * 0.6);
      u.uCloud.value = cl.cloud; u.uCloudCol.value.fromArray(cl.cloudCol); u.uAurora.value = cl.aurora; u.uWind.value = cl.wind;
      this.su.uTime.value = time; this.su.uAmt.value = cl.stars * (1 - cl.cloud * 0.5); this.su.uTreble.value = f.treble;
      this.au.uCol.value.fromArray(cl.hazeCol); this.au.uAmt.value = 0.30 + cl.haze * 0.55;
      this.group.rotation.y = time * 0.003;
    }
  }
  MB.Sky = Sky;
})();
