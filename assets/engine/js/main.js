// 启动与主循环（引擎件）。调试参数（截图自查用）：
//   ?shot 跳过遮罩 · ?fakebeat 合成节拍 · ?t=秒 波形相位 · ?ct=秒 固定气候时刻 · ?cam=d,phi,theta 机位
//   ?focus=地标id 直接飞到地标 · ?norot 停自转 · ?n=地表分辨率 · ?freeze=N 渲染 N 帧后停（无头截图不超时）
(function () {
  const CFG = MB.CONFIG, S = window.MB_SCENE, TAU = Math.PI * 2;
  function fatal(msg) { const el = document.getElementById("fatal"); el.textContent = msg; el.classList.add("show"); console.error(msg); }
  function b64(base64) { const bin = atob(base64), bytes = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i); return bytes.buffer; }

  async function boot() {
    if (typeof THREE === "undefined") return fatal("Three.js 没有加载成功：请用本地服务器打开，或把 three.min.js 放进 vendor/。");
    const dbg = new URLSearchParams(location.search);
    const canvas = document.getElementById("scene"), ui = new MB.UI();
    for (const [id, key] of [["ui-glyph", "glyph"], ["ui-headline", "headline"], ["ui-sub", "sub"], ["track-name", "track"]]) document.getElementById(id).textContent = S.ui[key];
    document.title = S.ui.glyph + " · " + S.title;
    for (const k in (S.ui.theme || {})) document.documentElement.style.setProperty("--" + k, S.ui.theme[k]);
    document.getElementById("voxel-total").textContent = CFG.VOXEL_COUNT.toLocaleString() + " 个地表体素";
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, stencil: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, CFG.PIXEL_RATIO_CAP));
    renderer.setSize(innerWidth, innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;          // 插画感：不要电影曲线把高明度色块压灰
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 0.8, 14000);
    addEventListener("resize", () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });

    if (dbg.has("gallery")) return gallery(dbg, renderer, scene, camera, ui);
    const audio = new MB.Audio(); let audioReady = false;
    const audioTask = (async () => {
      if (!window.MB_TRACK || !MB_TRACK.data || dbg.has("fakebeat")) { ui.setAudioProgress(1, "此构建缺少内置音乐"); ui.setTrack(S.ui.track); return; }
      try {
        ui.setAudioProgress(0.03, "正在解码…");
        await audio.load(b64(MB_TRACK.data), MB_TRACK.name || S.ui.track, p => ui.setAudioProgress(0.08 + p * 0.92));
        audioReady = true; ui.setAudioProgress(1); ui.setTrack(audio.name);
      } catch (e) { console.error(e); ui.setAudioProgress(1, "内置音乐解码失败"); }
    })();

    const planet = new MB.Planet(); scene.add(planet.group);
    await planet.build(p => ui.setPlanetProgress(p * 0.8));
    const world = new MB.World(planet); ui.setPlanetProgress(1);
    const sky = new MB.Sky(scene, renderer.getPixelRatio());
    const controls = new MB.Controls(camera, canvas, world);
    const lighting = new MB.Lighting(scene, planet);
    if (dbg.has("cam")) { const [d, ph, th] = dbg.get("cam").split(",").map(Number); controls.dist = controls.tDist = d; controls.phi = controls.tPhi = ph; controls.theta = controls.tTheta = th; controls.spherical(controls.camPos, d, ph, th); }
    controls.onPick = t => t && ui.showToast(t.name || "");
    ui.buildPlaces(S.cameraTargets.map(id => ({ id, name: (world.focus[id] || {}).name })).filter(p => p.name), id => controls.flyTo(world.target(id)));

    // ---- 气候时钟：有音频跟歌走；没音频按 2.4× 速度自动巡演整条时间线 ----
    let started = false, previewT = 30, fixedCT = dbg.has("ct") ? parseFloat(dbg.get("ct")) : null;
    const songT = () => (audio.buffer && audio.duration > 0) ? audio.position() / audio.duration * S.duration : previewT;
    const seek = p => { if (audio.buffer) audio.seek(p * audio.duration); else previewT = p * S.duration; MB.Climate.snap(); };
    ui.buildChapters(S.chapters, S.duration, seek); ui.onSeek = seek;

    if (dbg.has("shot")) { ui.ready(false); ui.hideOverlay(); ui.overlay.style.display = "none"; started = true; } else { await audioTask; ui.ready(audioReady); }
    ui.onStart = () => { if (started) return; started = true; audio.ensureContext(); if (audioReady) { audio.play(); ui.setPlaying(true); } ui.hideOverlay(); };
    ui.onToggle = () => { if (!audio.buffer) return ui.showToast("此构建没有内置音乐"); audio.toggle(); ui.setPlaying(audio.playing); };
    ui.onVolume = v => audio.setVolume(v);

    const clock = new THREE.Clock();
    let time = parseFloat(dbg.get("t")) || 0, fpsT = 0, fpsN = 0, frames = 0, lowT = 0;
    if (dbg.has("t")) planet.phase = time * 2.0;
    const fake = dbg.has("fakebeat"), noRot = dbg.has("norot"), freeze = parseInt(dbg.get("freeze") || "0", 10);
    const rot = TAU / CFG.ROTATION_PERIOD;
    function fakeF(t) { const beat = Math.pow(Math.max(0, Math.sin(t * 3.0)), 6); return { bass: 0.6 + 0.35 * Math.sin(t * 1.7), mid: 0.5 + 0.3 * Math.sin(t * 2.3 + 1), treble: 0.45, energy: 0.65, slow: 0.6, warm: 0.6, beat, tick: beat * 0.7, kick: beat, heavy: beat > 0.75, tempo: 0.6, bpm: 72, beatPhase: (t * 1.2) % 1, beatIndex: Math.floor(t * 1.2), tickIndex: Math.floor(t * 2.4), time: t, active: true }; }
    if (dbg.has("focus")) { controls.flyTo(world.target(dbg.get("focus"))); controls.snapFrames = 1e9; }

    function frame() {
      if (!freeze || frames < freeze) requestAnimationFrame(frame); else { console.log("INFO calls=" + renderer.info.render.calls + " tris=" + renderer.info.render.triangles); document.title = "FROZEN"; return; }
      frames++;
      const dt = freeze ? 0.033 : Math.min(0.05, clock.getDelta());
      time += dt;
      const f = fake ? fakeF(time) : audio.update(dt);
      if (!audio.buffer && started && fixedCT === null) previewT = (previewT + dt * 2.4) % S.duration;
      const ct = fixedCT !== null ? fixedCT : songT();
      const cl = MB.Climate.update(ct, dt);
      MB.Glow.update(f, time, cl);
      if (!noRot) planet.group.rotation.y += dt * rot;
      planet.group.updateMatrixWorld(true);
      planet.update(dt, f, time, cl);
      controls.update(dt); camera.updateMatrixWorld(true);
      world.update(dt, f, time, cl, camera);
      world.feedPlanetLights(planet.uniforms, cl);
      planet.cull(camera);
      lighting.update(dt, f, time, cl);
      sky.update(dt, f, time, cl, lighting.sunDirWorld);
      renderer.render(scene, camera);
      ui.setChapter(MB.Climate.index, MB.Climate.chapters[MB.Climate.index]);
      if (audio.buffer) ui.setProgress(audio.position(), audio.duration); else ui.setProgress(ct, S.duration);
      fpsN++;
      if (time - fpsT > 0.5) {
        // 自适应：连续 3 秒低于 28fps 就把像素比降到 1（细节不变，只是少画像素）
        const fpsNow = fpsN / Math.max(0.001, time - fpsT); lowT = fpsNow < 28 ? lowT + (time - fpsT) : 0;
        if (lowT > 3 && renderer.getPixelRatio() > 1) { renderer.setPixelRatio(1); lowT = 0; } ui.setStats({ fps: fpsN / Math.max(0.001, time - fpsT), voxels: planet.voxelCount, visible: planet.visibleChunks, chunks: planet.chunks.length, calls: renderer.info.render.calls, tris: renderer.info.render.triangles, f, chapter: MB.Climate.chapters[MB.Climate.index].name, ct }); fpsN = 0; fpsT = time; }
    }
    frame();
  }
  // ?gallery=a,b,c ：造物库转台。不建星球，把模型排成一排用 3/4 视角看——“像不像”在这里验收，不要到星球上隔着树猜。
  function gallery(dbg, renderer, scene, camera, ui) {
    const R = MB.Gallery || {};   // bespoke：js/gallery.js 登记 名称 → 返回 THREE.Object3D 的函数
    const names = (dbg.get("gallery") || "swing").split(",");
    scene.background = new THREE.Color(0xbcd6ea);
    scene.add(new THREE.AmbientLight(0xffffff, Math.PI * 0.55)); const dl = new THREE.DirectionalLight(0xfff0d8, Math.PI * 0.7); dl.position.set(0.6, 1, 0.8); scene.add(dl);
    const floor = new THREE.Mesh(new THREE.BoxGeometry(400, 1, 400), new THREE.MeshLambertMaterial({ color: 0xe6c060 })); floor.position.y = -0.5; scene.add(floor);
    let x = 0; const box = new THREE.Box3(), all = new THREE.Group(); scene.add(all);
    names.forEach(n => { if (!R[n]) return; const g = R[n](); box.setFromObject(g); const w = box.max.x - box.min.x; g.position.x += x - box.min.x; x += w + 6; all.add(g); });
    const lights = parseFloat(dbg.get("lights") || "0"); MB.Glow.update({ beat: 0, beatPhase: 0, treble: 0.3, tick: 0, bass: 0.5, energy: 0.5, beatIndex: 0, active: true }, 0, { lights });
    box.setFromObject(all); const c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
    const az = parseFloat(dbg.get("az") || "0.6"), el = parseFloat(dbg.get("el") || "0.5"), dist = Math.max(sz.x * 0.62, sz.y * 1.25, 18) / Math.tan(23 * Math.PI / 180) * 0.62;
    camera.position.set(c.x + Math.sin(az) * Math.cos(el) * dist, c.y + Math.sin(el) * dist, c.z + Math.cos(az) * Math.cos(el) * dist); camera.lookAt(c);
    ui.hideOverlay(); document.getElementById("overlay").style.display = "none"; document.getElementById("player").style.display = "none"; document.getElementById("places").style.display = "none";
    let n = 0; (function loop() { renderer.render(scene, camera); if (++n < 3) requestAnimationFrame(loop); else document.title = "FROZEN"; })();
  }

  const run = () => boot().catch(e => fatal("星球启动失败：" + (e && e.stack || e)));
  if (document.readyState === "loading") addEventListener("DOMContentLoaded", run); else run();
})();
