// 星球（引擎件，可复用）：6 面立方体球 × chunk，每 chunk 一个 InstancedMesh，每体素 16 字节。
// 位置/朝向/音乐位移/气候（湿润、霜雪、结冰、雾）/光照全部在顶点着色器里重建。
// waveAt() 是着色器位移公式的 JS 镜像：所有地表物体用它贴着浪走。改公式必须两边一起改。
(function () {
  const CFG = MB.CONFIG, T = MB.Terrain, S = window.MB_SCENE;
  const NS = 4, NP = 16;

  const vertexShader = `
    attribute vec4 iN;   // xyz 单位法线  w 高度/32767
    attribute vec4 iC;   // rgb sRGB 颜色  a 律动系数
    attribute vec4 iM;   // x 水体  y 可积雪度  z 保留  w 随机
    uniform float uR, uVox, uCube, uTime, uPhase;
    uniform float uBass, uMid, uTreble, uBeat, uWaveAmp, uJitAmp, uPulseAmp;
    uniform vec3 uWaveC0, uWaveC1;
    uniform vec3 uSunDir, uSunCol, uAmb, uSkyCol, uHazeCol;
    uniform float uWet, uFrost, uIce, uHaze;
    uniform vec3 uSpotPos[${NS}]; uniform vec3 uSpotDir[${NS}]; uniform vec3 uSpotCol[${NS}]; uniform vec2 uSpotParam[${NS}];
    uniform vec3 uPtPos[${NP}]; uniform vec4 uPtCol[${NP}];
    varying vec3 vColor;

    float hash13(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }

    void main() {
      vec3 n = normalize(iN.xyz);
      float h = iN.w * 32767.0;
      float react = iC.a;
      vec3 an = abs(n);
      vec3 upRef = (an.y > an.x && an.y > an.z) ? vec3(0.0, 0.0, 1.0) : vec3(0.0, 1.0, 0.0);
      vec3 t = normalize(cross(upRef, n));
      vec3 b = cross(t, n);

      // ---- 音乐位移：涌浪 + 双源同心涟漪 + 鼓点沿涟漪环外推 + 高频细颤；按整格量化 ----
      float lat = asin(clamp(n.y, -1.0, 1.0));
      float lon = atan(n.x, n.z);
      float swell = sin(lat * 3.0 + lon * 2.0 - uPhase) * 0.5 + sin(lon * 3.0 - lat * 2.5 - uPhase * 0.77 + 1.7) * 0.35;
      float d0 = acos(clamp(dot(n, uWaveC0), -1.0, 1.0));
      float d1 = acos(clamp(dot(n, uWaveC1), -1.0, 1.0));
      float wave = swell * 0.45
                 + sin(d0 * 20.0 - uPhase * 2.4) * exp(-d0 * 0.6) * 0.9
                 + sin(d1 * 15.0 - uPhase * 1.9 + 2.1) * exp(-d1 * 0.5) * 0.6
                 + uMid * 0.25 * sin((lat - lon) * 8.0 + uPhase * 1.6);
      wave = clamp(wave, -1.6, 1.6);
      float pulse = uBeat * (0.5 + 0.5 * sin(d0 * 20.0 - uPhase * 2.4)) * exp(-d0 * 0.35);
      float jitter = hash13(n * 191.0 + floor(uTime * 18.0)) - 0.5;
      float disp = react * (uBass * uWaveAmp * wave + uPulseAmp * pulse + uTreble * uJitAmp * jitter);
      disp = floor(disp / uVox + 0.5) * uVox;

      float radial = uR + h * uVox + disp;
      vec3 p = n * radial + (t * position.x + b * position.z + n * position.y) * uCube;

      // ---- 材质：湿润 / 霜雪 / 水 / 冰 ----
      vec3 nw = normalize(t * normal.x + n * normal.y + b * normal.z);
      float topF = step(0.5, normal.y);
      vec3 albedo = iC.rgb * iC.rgb;
      float isWater = step(0.5, iM.x);
      // 水面映天色 + 高音碎光
      vec3 waterCol = albedo * 0.88 + uSkyCol * 0.10;
      float glint = step(0.965, hash13(n * 733.0 + floor(uTime * 5.0))) * (0.12 + uTreble * 0.6);
      waterCol += vec3(glint) * topF;
      waterCol = mix(waterCol, vec3(0.78, 0.89, 0.96), uIce * (0.75 + 0.25 * iM.w));
      albedo = mix(albedo, waterCol, isWater);
      // 雨：地面变深变饱和
      albedo *= mix(1.0, 0.66 + 0.10 * iM.w, uWet * (1.0 - isWater));
      // 霜线从两极向赤道推进，高处先白
      float s = abs(lat) / 1.5708 + (iM.w - 0.5) * 0.5 + max(h, 0.0) * 0.025;
      float edge = mix(1.45, -0.35, uFrost);
      float frost = smoothstep(edge, edge + 0.14, s) * iM.y * (1.0 - isWater);
      albedo = mix(albedo, vec3(0.74, 0.80, 0.90) + 0.06 * iM.w, frost * mix(0.35, 0.92, topF));

      // ---- 光照（星球局部空间）----
      float dl = max(dot(nw, uSunDir), 0.0);
      float horizon = clamp(dot(n, uSunDir) * 0.5 + 0.5, 0.0, 1.0);
      vec3 light = uAmb * (0.62 + 0.38 * horizon) + uSunCol * dl;
      float ao = mix(0.80, 1.0, topF);
      ao *= 1.0 + clamp(h, -6.0, 6.0) * 0.012;
      vec3 col = albedo * light * ao;
      col = mix(col, albedo * (0.40 + 0.60 * max(light.g, light.b)), isWater * 0.65);   // 水体保住自己的蓝，不被暖光染灰

      for (int i = 0; i < ${NS}; i++) {
        vec3 d = p - uSpotPos[i];
        float dist = length(d); d /= max(dist, 0.001);
        float cone = smoothstep(uSpotParam[i].x, uSpotParam[i].x + 0.06, dot(d, uSpotDir[i]));
        float rangeFade = smoothstep(95.0, 40.0, dist);        // 锥体数学上无限长：必须截断，否则照穿到星球背面
        col += albedo * uSpotCol[i] * cone * uSpotParam[i].y * rangeFade * max(dot(nw, -d), 0.15);
      }
      for (int i = 0; i < ${NP}; i++) {
        vec3 d = uPtPos[i] - p;
        float d2 = dot(d, d);
        col += (albedo * 0.85 + 0.15) * uPtCol[i].rgb * uPtCol[i].w * (1.0 / (1.0 + d2 * 0.006)) * max(dot(nw, normalize(d)), 0.2);
      }
      col *= 1.0 + uBeat * 0.05;
      col = mix(col, uHazeCol, uHaze * 0.30);
      vColor = col;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
    }
  `;
  const fragmentShader = `
    varying vec3 vColor;
    void main() {
      gl_FragColor = vec4(vColor, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `;

  // 五面柱（无底面）。局部 y ∈ [-4,0]：向下拉长盖住相邻高度差与位移台阶
  function buildCubeGeometry() {
    const faces = [
      { n: [1, 0, 0], u: [0, 0, -1], v: [0, 1, 0] }, { n: [-1, 0, 0], u: [0, 0, 1], v: [0, 1, 0] },
      { n: [0, 1, 0], u: [1, 0, 0], v: [0, 0, -1] }, { n: [0, 0, 1], u: [1, 0, 0], v: [0, 1, 0] }, { n: [0, 0, -1], u: [-1, 0, 0], v: [0, 1, 0] },
    ];
    const pos = [], nor = [], idx = [];
    const yTop = 0, yBot = -5.0, yMid = (yTop + yBot) / 2, hy = (yTop - yBot) / 2;
    let vi = 0;
    for (const F of faces) {
      const cx = F.n[0] * 0.5, cy = yMid + F.n[1] * hy, cz = F.n[2] * 0.5;
      const su = 0.5, sv = F.n[1] !== 0 ? 0.5 : hy;
      for (const [a, b] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        pos.push(cx + F.u[0] * su * a + F.v[0] * sv * b, cy + F.u[1] * su * a + F.v[1] * sv * b, cz + F.u[2] * su * a + F.v[2] * sv * b);
        nor.push(F.n[0], F.n[1], F.n[2]);
      }
      idx.push(vi, vi + 1, vi + 2, vi, vi + 2, vi + 3); vi += 4;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    g.setIndex(idx);
    return g;
  }

  class Planet {
    constructor() {
      this.group = new THREE.Group(); this.group.name = 'planet';
      this.chunks = []; this.phase = 0; this.voxelCount = 0; this.visibleChunks = 0;
      const src = (S.waveSources || []).map(id => T.districts[id].c);
      this.waveC0 = src[0] || [0, 0, 1]; this.waveC1 = src[1] || [0, 1, 0];
      const u = {
        uR: { value: CFG.R }, uVox: { value: CFG.VOX }, uCube: { value: CFG.CUBE }, uTime: { value: 0 }, uPhase: { value: 0 },
        uBass: { value: 0 }, uMid: { value: 0 }, uTreble: { value: 0 }, uBeat: { value: 0 },
        uWaveAmp: { value: CFG.WAVE_AMP }, uJitAmp: { value: CFG.JIT_AMP }, uPulseAmp: { value: CFG.PULSE_AMP },
        uWaveC0: { value: new THREE.Vector3().fromArray(this.waveC0) }, uWaveC1: { value: new THREE.Vector3().fromArray(this.waveC1) },
        uSunDir: { value: new THREE.Vector3(0.5, 0.6, 0.62).normalize() }, uSunCol: { value: new THREE.Vector3(1, 1, 1) },
        uAmb: { value: new THREE.Vector3(0.4, 0.4, 0.4) }, uSkyCol: { value: new THREE.Vector3(0.5, 0.7, 0.9) }, uHazeCol: { value: new THREE.Vector3(1, 1, 1) },
        uWet: { value: 0 }, uFrost: { value: 0 }, uIce: { value: 0 }, uHaze: { value: 0 },
        uSpotPos: { value: [] }, uSpotDir: { value: [] }, uSpotCol: { value: [] }, uSpotParam: { value: [] },
        uPtPos: { value: [] }, uPtCol: { value: [] },
      };
      for (let i = 0; i < NS; i++) { u.uSpotPos.value.push(new THREE.Vector3(0, 1e4, 0)); u.uSpotDir.value.push(new THREE.Vector3(0, -1, 0)); u.uSpotCol.value.push(new THREE.Vector3(1, 1, 1)); u.uSpotParam.value.push(new THREE.Vector2(0.99, 0)); }
      for (let i = 0; i < NP; i++) { u.uPtPos.value.push(new THREE.Vector3(0, 1e4, 0)); u.uPtCol.value.push(new THREE.Vector4(1, 0.7, 0.4, 0)); }
      this.uniforms = u;
      this.material = new THREE.ShaderMaterial({ uniforms: u, vertexShader, fragmentShader, side: THREE.FrontSide });
      this.cubeGeo = buildCubeGeometry();
      this._f = { bass: 0, mid: 0, beat: 0 };
    }

    async build(onProgress) {
      const N = CFG.N, CH = CFG.CHUNK, CN = N / CH, total = 6 * CN * CN, count = CH * CH;
      let done = 0, lastYield = performance.now();
      const res = {};
      for (let face = 0; face < 6; face++) for (let ci = 0; ci < CN; ci++) for (let cj = 0; cj < CN; cj++) {
        const nArr = new Int16Array(count * 4), cArr = new Uint8Array(count * 4), mArr = new Uint8Array(count * 4);
        const bb = [1e9, 1e9, 1e9, -1e9, -1e9, -1e9], sum = [0, 0, 0];
        let k = 0;
        for (let i = 0; i < CH; i++) for (let j = 0; j < CH; j++) {
          const d = T.cubeDir(face, ci * CH + i, cj * CH + j, N);
          T.sample(d[0], d[1], d[2], res);
          const o = k * 4;
          nArr[o] = Math.round(d[0] * 32767); nArr[o + 1] = Math.round(d[1] * 32767); nArr[o + 2] = Math.round(d[2] * 32767); nArr[o + 3] = res.h;
          cArr[o] = res.r; cArr[o + 1] = res.g; cArr[o + 2] = res.b; cArr[o + 3] = Math.round(res.react * 255);
          mArr[o] = res.water ? 255 : 0; mArr[o + 1] = Math.round(res.snowable * 255); mArr[o + 3] = Math.round(res.rand * 255);
          for (let a = 0; a < 3; a++) { const v = d[a] * CFG.R; if (v < bb[a]) bb[a] = v; if (v > bb[a + 3]) bb[a + 3] = v; sum[a] += d[a]; }
          k++;
        }
        this.addChunk(nArr, cArr, mArr, count, bb, sum);
        done++;
        if (performance.now() - lastYield > 40) { if (onProgress) onProgress(done / total); await new Promise(r => setTimeout(r, 0)); lastYield = performance.now(); }
      }
      if (onProgress) onProgress(1);
      return this.group;
    }

    addChunk(nArr, cArr, mArr, count, bb, sum) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', this.cubeGeo.getAttribute('position'));
      geo.setAttribute('normal', this.cubeGeo.getAttribute('normal'));
      geo.setIndex(this.cubeGeo.getIndex());
      geo.setAttribute('iN', new THREE.InstancedBufferAttribute(nArr, 4, true));
      geo.setAttribute('iC', new THREE.InstancedBufferAttribute(cArr, 4, true));
      geo.setAttribute('iM', new THREE.InstancedBufferAttribute(mArr, 4, true));
      const mesh = new THREE.InstancedMesh(geo, this.material, 1);
      mesh.count = count; mesh.matrixAutoUpdate = false; mesh.raycast = () => {};
      const cx = (bb[0] + bb[3]) / 2, cy = (bb[1] + bb[4]) / 2, cz = (bb[2] + bb[5]) / 2;
      mesh.boundingSphere = new THREE.Sphere(new THREE.Vector3(cx, cy, cz), Math.hypot(bb[3] - bb[0], bb[4] - bb[1], bb[5] - bb[2]) / 2 + 36);
      const nrm = new THREE.Vector3(sum[0], sum[1], sum[2]).normalize();
      const a1 = Math.acos(Math.min(1, nrm.dot(new THREE.Vector3(bb[0], bb[1], bb[2]).normalize())));
      const a2 = Math.acos(Math.min(1, nrm.dot(new THREE.Vector3(bb[3], bb[4], bb[5]).normalize())));
      mesh.userData.n = nrm; mesh.userData.half = Math.max(a1, a2) + 0.02;
      this.group.add(mesh); this.chunks.push(mesh); this.voxelCount += count;
    }

    cull(camera) {
      const cam = _v.copy(camera.position).applyMatrix4(_m4.copy(this.group.matrixWorld).invert());
      const dist = cam.length(), horizon = Math.acos(Math.min(1, (CFG.R - 8) / dist));
      cam.multiplyScalar(1 / dist);
      let vis = 0;
      for (const c of this.chunks) {
        const ang = Math.acos(Math.max(-1, Math.min(1, c.userData.n.dot(cam))));
        c.visible = ang - c.userData.half < horizon + 0.45;
        if (c.visible) vis++;
      }
      this.visibleChunks = vis;
    }

    // 着色器位移公式的 JS 镜像。d = 单位方向数组/向量分量，react = 0..1。返回世界单位位移（已量化）
    waveAt(dx, dy, dz, react) {
      const f = this._f, ph = this.phase, C0 = this.waveC0, C1 = this.waveC1;
      const lat = Math.asin(Math.max(-1, Math.min(1, dy))), lon = Math.atan2(dx, dz);
      const swell = Math.sin(lat * 3 + lon * 2 - ph) * 0.5 + Math.sin(lon * 3 - lat * 2.5 - ph * 0.77 + 1.7) * 0.35;
      const d0 = Math.acos(Math.max(-1, Math.min(1, dx * C0[0] + dy * C0[1] + dz * C0[2])));
      const d1 = Math.acos(Math.max(-1, Math.min(1, dx * C1[0] + dy * C1[1] + dz * C1[2])));
      let wave = swell * 0.45 + Math.sin(d0 * 20 - ph * 2.4) * Math.exp(-d0 * 0.6) * 0.9
        + Math.sin(d1 * 15 - ph * 1.9 + 2.1) * Math.exp(-d1 * 0.5) * 0.6 + f.mid * 0.25 * Math.sin((lat - lon) * 8 + ph * 1.6);
      wave = Math.max(-1.6, Math.min(1.6, wave));
      const pulse = f.beat * (0.5 + 0.5 * Math.sin(d0 * 20 - ph * 2.4)) * Math.exp(-d0 * 0.35);
      const disp = react * (f.bass * CFG.WAVE_AMP * wave + CFG.PULSE_AMP * pulse);
      return Math.floor(disp / CFG.VOX + 0.5) * CFG.VOX;
    }

    update(dt, f, time, climate) {
      const u = this.uniforms;
      u.uTime.value = time;
      this.phase += dt * (0.7 + 1.6 * f.tempo * (0.35 + 0.9 * f.energy) + 1.0 * f.beat);
      u.uPhase.value = this.phase;
      const bass = f.bass + (f.active ? 0 : 0.32);
      this.kick = (this.kick || 0) * Math.exp(-dt * 4);           // 交互触发的额外涟漪（如点击某个地标）
      const beat = Math.max(f.beat, this.kick);
      this._f.bass = bass; this._f.mid = f.mid; this._f.beat = beat;
      u.uBass.value = bass; u.uMid.value = f.mid; u.uTreble.value = f.treble; u.uBeat.value = beat;
      if (climate) {
        u.uWet.value = climate.wet; u.uFrost.value = climate.frost; u.uIce.value = climate.ice; u.uHaze.value = climate.haze;
        u.uSkyCol.value.set(climate.skyHor[0] ** 2, climate.skyHor[1] ** 2, climate.skyHor[2] ** 2);   // 显示色 → 近似线性
        u.uHazeCol.value.set(climate.hazeCol[0] ** 2, climate.hazeCol[1] ** 2, climate.hazeCol[2] ** 2);
      }
    }
  }
  const _m4 = new THREE.Matrix4(), _v = new THREE.Vector3();
  MB.Planet = Planet;
})();
