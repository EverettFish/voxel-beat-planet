// 气候时间线（引擎件，可复用）：把 MB_SCENE.chapters 的关键帧按“歌曲进度”插值成一个连续的气候状态。
// 每个系统（天空/光照/地表着色器/天气粒子/树冠/灯光）每帧只读 MB.Climate.state，不自己判断章节。
// 章节状态写在 scene-manifest.js 的 chapters[].state 里——它是 bespoke 的；插值器是通用的。
(function () {
  const S = window.MB_SCENE;
  const lerp = (a, b, t) => a + (b - a) * t;
  const sstep = (a, b, v) => { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); };


  const chapters = S.chapters.map(c => { if (!c.state) throw new Error('chapter ' + c.id + ' needs a state'); return Object.assign({}, c); });
  const keys = Object.keys(chapters[0].state);
  const state = {}; const target = {};
  for (const k of keys) { const v = chapters[0].state[k]; state[k] = Array.isArray(v) ? v.slice() : v; target[k] = Array.isArray(v) ? v.slice() : v; }

  function mixInto(out, a, b, t) {
    for (const k of keys) {
      if (Array.isArray(a[k])) for (let i = 0; i < 3; i++) out[k][i] = lerp(a[k][i], b[k][i], t);
      else out[k] = lerp(a[k], b[k], t);
    }
  }

  const Climate = {
    state, chapters, index: 0, time: 0, _init: false,
    // t：歌曲内的秒（已按 S.duration 归一，换歌时 main.js 负责缩放）
    update(t, dt) {
      const n = chapters.length;
      let i = 0;
      for (let k = 0; k < n; k++) if (t >= chapters[k].at) i = k;
      const cur = chapters[i], next = chapters[i + 1];
      if (i > 0 && t < cur.at + cur.blend / 2) mixInto(target, chapters[i - 1].state, cur.state, sstep(cur.at - cur.blend / 2, cur.at + cur.blend / 2, t));
      else if (next && t > next.at - next.blend / 2) mixInto(target, cur.state, next.state, sstep(next.at - next.blend / 2, next.at + next.blend / 2, t));
      else mixInto(target, cur.state, cur.state, 0);
      // 低通：拖动进度条/循环回头时 1 秒内平滑过去，不硬切
      const k = this._init ? 1 - Math.exp(-dt / 0.9) : 1;
      mixInto(state, state, target, k);
      this._init = true;
      // 章节索引按“过半即换”
      let idx = 0;
      for (let q = 0; q < n; q++) if (t >= chapters[q].at - chapters[q].blend * 0.1) idx = q;
      this.index = idx; this.time = t;
      return state;
    },
    snap() { this._init = false; },
  };
  MB.Climate = Climate;
})();
