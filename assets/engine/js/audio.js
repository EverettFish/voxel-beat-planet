// 音频：解码后先做一遍离线频谱分析（每 11.6ms 一帧），得到低/中/高频包络、鼓点 onset、
// 节拍时刻和 BPM；播放时按“真实听到的时间”（减去输出延迟）查表，比 AnalyserNode 实时取值
// 更准，也能提前几十毫秒预判鼓点，让灯光和画面真正卡在拍子上。
(function () {
  // ---------- FFT ----------
  class FFT {
    constructor(n) {
      this.n = n;
      this.rev = new Uint32Array(n);
      let bits = Math.log2(n) | 0;
      for (let i = 0; i < n; i++) {
        let r = 0, x = i;
        for (let b = 0; b < bits; b++) { r = (r << 1) | (x & 1); x >>= 1; }
        this.rev[i] = r;
      }
      this.cos = new Float32Array(n / 2);
      this.sin = new Float32Array(n / 2);
      for (let i = 0; i < n / 2; i++) {
        this.cos[i] = Math.cos(-2 * Math.PI * i / n);
        this.sin[i] = Math.sin(-2 * Math.PI * i / n);
      }
      this.re = new Float32Array(n);
      this.im = new Float32Array(n);
    }
    // 输入实数窗后信号，返回幅度谱（前 n/2 个）写入 out
    magnitudes(input, out) {
      const n = this.n, re = this.re, im = this.im, rev = this.rev;
      for (let i = 0; i < n; i++) { re[i] = input[rev[i]]; im[i] = 0; }
      for (let size = 2; size <= n; size <<= 1) {
        const half = size >> 1, step = n / size;
        for (let i = 0; i < n; i += size) {
          for (let j = 0, k = 0; j < half; j++, k += step) {
            const c = this.cos[k], s = this.sin[k];
            const a = i + j, b = a + half;
            const tr = re[b] * c - im[b] * s;
            const ti = re[b] * s + im[b] * c;
            re[b] = re[a] - tr; im[b] = im[a] - ti;
            re[a] += tr; im[a] += ti;
          }
        }
      }
      const m = n >> 1;
      for (let i = 0; i < m; i++) out[i] = Math.sqrt(re[i] * re[i] + im[i] * im[i]);
    }
  }

  const WIN = 2048, HOP = 512;

  function percentile(arr, p) {
    const a = Float32Array.from(arr).sort();
    return a[Math.min(a.length - 1, Math.floor(a.length * p))] || 1e-6;
  }

  class Audio {
    constructor() {
      this.ctx = null;
      this.gain = null;
      this.buffer = null;
      this.source = null;
      this.playing = false;
      this.startCtxTime = 0;
      this.startOffset = 0;
      this.volume = 0.8;
      this.duration = 0;
      this.name = '';
      this.analysis = null;
      this.prevT = -1;
      this.lastBeatT = -1;
      // 实时特征（平滑后）
      this.f = { bass: 0, mid: 0, treble: 0, energy: 0, slow: 0, warm: 0, beat: 0, tick: 0, kick: 0, heavy: false, tempo: 1, bpm: 120, beatPhase: 0, beatIndex: 0, tickIndex: 0, time: 0, active: false };
      this.onBeat = null;
    }

    ensureContext() {
      if (!this.ctx) {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)({ latencyHint: 'interactive' });
        this.gain = this.ctx.createGain();
        this.gain.gain.value = this.volume;
        this.gain.connect(this.ctx.destination);
      }
      return this.ctx;
    }

    async load(arrayBuffer, name, onProgress) {
      const ctx = this.ensureContext();
      const buf = await ctx.decodeAudioData(arrayBuffer.slice(0));
      this.buffer = buf;
      this.duration = buf.duration;
      this.name = name || '';
      this.analysis = await this.analyze(buf, onProgress);
      this.prevT = -1;
    }

    // ---------- 离线分析 ----------
    async analyze(buf, onProgress) {
      const sr = buf.sampleRate;
      const ch0 = buf.getChannelData(0);
      const ch1 = buf.numberOfChannels > 1 ? buf.getChannelData(1) : ch0;
      const len = ch0.length;
      const frames = Math.max(1, Math.floor((len - WIN) / HOP));
      const fft = new FFT(WIN);
      const window = new Float32Array(WIN);
      for (let i = 0; i < WIN; i++) window[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (WIN - 1));
      const frame = new Float32Array(WIN);
      const mag = new Float32Array(WIN / 2);
      const prevLog = new Float32Array(WIN / 2);
      const binHz = sr / WIN;
      const b = (hz) => Math.max(1, Math.min(WIN / 2 - 1, Math.round(hz / binHz)));
      const bands = {
        bass: [b(30), b(150)],
        mid: [b(400), b(2800)],
        treble: [b(3500), b(12000)],
        kick: [b(30), b(220)],
        flux: [b(30), b(6000)],
      };
      const bass = new Float32Array(frames), mid = new Float32Array(frames), treble = new Float32Array(frames);
      const onset = new Float32Array(frames), kickOnset = new Float32Array(frames), rms = new Float32Array(frames);
      const hopSec = HOP / sr;

      let lastYield = performance.now();
      for (let fi = 0; fi < frames; fi++) {
        const off = fi * HOP;
        let e = 0;
        for (let i = 0; i < WIN; i++) {
          const s = (ch0[off + i] + ch1[off + i]) * 0.5;
          frame[i] = s * window[i];
          e += s * s;
        }
        rms[fi] = Math.sqrt(e / WIN);
        fft.magnitudes(frame, mag);
        let sb = 0, sm = 0, st = 0, flux = 0, kflux = 0;
        for (let k = bands.bass[0]; k <= bands.bass[1]; k++) sb += mag[k];
        for (let k = bands.mid[0]; k <= bands.mid[1]; k++) sm += mag[k];
        for (let k = bands.treble[0]; k <= bands.treble[1]; k++) st += mag[k];
        // 谱通量（只计增加量）：低频权重高 -> 鼓点
        for (let k = bands.flux[0]; k <= bands.flux[1]; k++) {
          const l = Math.log(1 + mag[k] * 4);
          const d = l - prevLog[k];
          if (d > 0) {
            flux += d;
            if (k <= bands.kick[1]) kflux += d;
          }
          prevLog[k] = l;
        }
        bass[fi] = sb / (bands.bass[1] - bands.bass[0] + 1);
        mid[fi] = sm / (bands.mid[1] - bands.mid[0] + 1);
        treble[fi] = st / (bands.treble[1] - bands.treble[0] + 1);
        onset[fi] = kflux * 2.2 + flux * 0.35;
        kickOnset[fi] = kflux;
        if ((fi & 255) === 0 && performance.now() - lastYield > 40) {
          if (onProgress) onProgress(fi / frames);
          await new Promise(r => setTimeout(r, 0));
          lastYield = performance.now();
        }
      }

      // 归一化：按 96 分位缩放到 0..1，再压一点曲线让安静段真安静
      const norm = (arr, p, curve) => {
        const s = percentile(arr, p);
        for (let i = 0; i < arr.length; i++) {
          const v = Math.min(1.25, arr[i] / s);
          arr[i] = Math.pow(Math.max(0, v), curve);
        }
      };
      norm(bass, 0.96, 1.35);
      norm(mid, 0.96, 1.2);
      norm(treble, 0.96, 1.15);
      norm(rms, 0.97, 1.0);

      // onset 包络 -> 节拍检测（局部自适应阈值 + 峰值挑选）
      // 两套：ticks = 所有明显 onset（八分/十六分都算，驱动细碎动效）
      //        beats = 只看低频通量的重鼓点（驱动“齐闪”和大动作）
      const detect = (env, ratio, floor, gapSec, winSec) => {
        const out = [];
        const W = Math.round(winSec / hopSec), minGap = Math.round(gapSec / hopSec);
        const prefix = new Float64Array(frames + 1);
        for (let i = 0; i < frames; i++) prefix[i + 1] = prefix[i] + env[i];
        let lastBeat = -minGap;
        for (let i = 2; i < frames - 2; i++) {
          const a = Math.max(0, i - W), c = Math.min(frames, i + W + 1);
          const mean = (prefix[c] - prefix[a]) / (c - a);
          const thr = mean * ratio + floor;
          const v = env[i];
          if (v > thr && v >= env[i - 1] && v >= env[i - 2] && v > env[i + 1] && v >= env[i + 2] && i - lastBeat >= minGap) {
            out.push({ t: i * hopSec, s: Math.min(1, (v - thr) / (thr + 0.25) + 0.45) });
            lastBeat = i;
          }
        }
        return out;
      };
      const onsetN = Float32Array.from(onset);
      norm(onsetN, 0.985, 1.0);
      const kickN = Float32Array.from(kickOnset);
      norm(kickN, 0.985, 1.0);
      const ticks = detect(onsetN, 1.5, 0.08, 0.16, 0.45);
      const beats = detect(kickN, 1.9, 0.12, 0.30, 0.6);
      let acc = 0;
      for (let i = 0; i < frames; i++) acc += onsetN[i];

      // BPM：onset 自相关，取 0.3s–1.2s 区间的最优周期，折叠到 70–180
      let bpm = 120;
      {
        const minLag = Math.round(0.30 / hopSec), maxLag = Math.round(1.2 / hopSec);
        const mean = acc / frames;
        let best = -1, bestLag = minLag;
        const stride = 2;
        for (let lag = minLag; lag <= maxLag; lag++) {
          let s = 0, n = 0;
          for (let i = 0; i + lag < frames; i += stride) { s += (onsetN[i] - mean) * (onsetN[i + lag] - mean); n++; }
          s /= n;
          // 轻微偏向常见速度（100–140bpm）
          const lagBpm = 60 / (lag * hopSec);
          const prior = Math.exp(-Math.pow((lagBpm - 120) / 60, 2));
          s *= 0.7 + 0.3 * prior;
          if (s > best) { best = s; bestLag = lag; }
        }
        bpm = 60 / (bestLag * hopSec);
        while (bpm < 70) bpm *= 2;
        while (bpm > 180) bpm /= 2;
      }

      // 能量：段落级
      const energy = new Float32Array(frames);
      for (let i = 0; i < frames; i++) energy[i] = Math.min(1, 0.45 * bass[i] + 0.30 * mid[i] + 0.10 * treble[i] + 0.25 * rms[i]);

      // 段落能量的分位：用来把“安静段 -> 高潮”映射到 0..1 的冷暖
      const sortedE = Float32Array.from(energy).sort();
      const eLo = sortedE[Math.floor(sortedE.length * 0.12)], eHi = sortedE[Math.floor(sortedE.length * 0.92)];

      if (onProgress) onProgress(1);
      return { hopSec, frames, bass, mid, treble, energy, onset: onsetN, beats, ticks, bpm, eLo, eHi: Math.max(eHi, eLo + 0.05), duration: buf.duration };
    }

    // ---------- 播放控制 ----------
    play() {
      const ctx = this.ensureContext();
      if (!this.buffer) return;
      if (ctx.state === 'suspended' && this.source) { ctx.resume(); this.playing = true; return; }
      if (ctx.state === 'suspended') ctx.resume();
      if (this.source) { try { this.source.stop(); } catch (e) { } this.source.disconnect(); }
      const src = ctx.createBufferSource();
      src.buffer = this.buffer;
      src.loop = true;
      src.connect(this.gain);
      src.start(0, this.startOffset);
      this.source = src;
      this.startCtxTime = ctx.currentTime;
      this.playing = true;
    }
    pause() {
      if (!this.ctx || !this.playing) return;
      this.ctx.suspend();
      this.playing = false;
    }
    toggle() { if (this.playing) this.pause(); else this.play(); }
    // 跳到 t 秒（点击进度条 / 章节）。暂停状态下只改偏移，恢复播放时从新位置开始。
    seek(t) {
      if (!this.buffer) return;
      const was = this.playing;
      if (this.source) { try { this.source.stop(); } catch (e) { } this.source.disconnect(); this.source = null; }
      this.startOffset = Math.max(0, Math.min(this.duration - 0.05, t));
      this.prevT = -1; this.beatCursor = 0; this.tickCursor = 0; this.lastBeatT = -1;
      this.playing = false;
      if (was) { if (this.ctx.state === 'suspended') this.ctx.resume(); this.play(); }
    }
    setVolume(v) {
      this.volume = v;
      if (this.gain) this.gain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.02);
    }
    // 当前音频位置（秒，随循环取模）
    position() {
      if (!this.ctx || !this.source) return this.startOffset || 0;
      const t = this.startOffset + (this.ctx.currentTime - this.startCtxTime);
      return this.duration > 0 ? t % this.duration : t;
    }
    // 视觉应当对齐的时间：减去输出延迟、加上一帧显示延迟
    visualTime() {
      const ctx = this.ctx;
      const lat = (ctx && (ctx.outputLatency || 0)) + (ctx && (ctx.baseLatency || 0));
      let t = this.position() - lat + 0.028;
      if (this.duration > 0) { t %= this.duration; if (t < 0) t += this.duration; }
      return t;
    }

    sampleArr(arr, fi) {
      const a = this.analysis;
      const i0 = Math.floor(fi), i1 = Math.min(a.frames - 1, i0 + 1), fr = fi - i0;
      const v0 = arr[Math.max(0, Math.min(a.frames - 1, i0))];
      return v0 + (arr[i1] - v0) * fr;
    }

    // 在有序事件表里找 (t0, t1] 内的事件，返回最大强度；处理循环回头
    scan(list, cursorKey, t0, t1) {
      if (!list || !list.length) return 0;
      let hit = 0;
      if (t0 < 0) {
        let c = 0;
        while (c < list.length && list[c].t <= t1) c++;
        this[cursorKey] = c;
        return 0;
      }
      if (t1 < t0) {
        // 循环：先扫到结尾，再从头
        for (let i = this[cursorKey] || 0; i < list.length; i++) hit = Math.max(hit, list[i].s);
        let c = 0;
        while (c < list.length && list[c].t <= t1) { hit = Math.max(hit, list[c].s); c++; }
        this[cursorKey] = c;
        return hit;
      }
      let i = this[cursorKey] || 0;
      while (i < list.length && list[i].t <= t1) {
        if (list[i].t > t0) hit = Math.max(hit, list[i].s);
        i++;
      }
      this[cursorKey] = i;
      return hit;
    }

    // 每帧更新实时特征
    update(dt) {
      const f = this.f;
      const a = this.analysis;
      if (!a || !this.playing) {
        // 未播放：一切缓慢回落
        const k = Math.exp(-dt * 2.5);
        f.bass *= k; f.mid *= k; f.treble *= k; f.energy *= k; f.beat *= Math.exp(-dt * 6); f.tick *= k; f.kick *= k;
        f.slow += (0 - f.slow) * (1 - Math.exp(-dt / 3));
        f.warm += (0 - f.warm) * (1 - Math.exp(-dt / 3));
        f.heavy = false;
        f.active = false;
        return f;
      }
      f.active = true;
      const t = this.visualTime();
      f.time = t;
      const fi = t / a.hopSec;
      // 稍微向前看一点（20ms）让起伏不滞后
      const look = fi + 0.02 / a.hopSec;
      const rb = this.sampleArr(a.bass, look), rm = this.sampleArr(a.mid, look), rt = this.sampleArr(a.treble, look), re = this.sampleArr(a.energy, look);
      const up = 1 - Math.exp(-dt * 28), down = 1 - Math.exp(-dt * 7);
      f.bass += (rb - f.bass) * (rb > f.bass ? up : down);
      f.mid += (rm - f.mid) * (rm > f.mid ? up : down);
      f.treble += (rt - f.treble) * (rt > f.treble ? 1 - Math.exp(-dt * 35) : 1 - Math.exp(-dt * 12));
      f.energy += (re - f.energy) * (re > f.energy ? up : 1 - Math.exp(-dt * 4));
      f.slow += (re - f.slow) * (1 - Math.exp(-dt / 2.2));

      // 鼓点触发：本帧时间区间 (prevT, t+lead] 内有事件就打脉冲（提前 25ms，抵消渲染延迟）
      const lead = 0.025;
      const t1 = t + lead;
      const hitBeat = this.scan(a.beats, 'beatCursor', this.prevT, t1);
      const hitTick = this.scan(a.ticks, 'tickCursor', this.prevT, t1);
      if (hitBeat > 0) {
        f.beat = Math.max(f.beat, hitBeat);
        f.kick = 1;
        this.lastBeatT = t;
        this.beatCount = (this.beatCount || 0) + 1;
        f.heavy = hitBeat > 0.75 && f.bass > 0.55;
        if (this.onBeat) this.onBeat(hitBeat, this.beatCount, f.heavy);
      } else f.heavy = false;
      if (hitTick > 0) {
        f.tick = Math.max(f.tick, hitTick);
        this.tickCount = (this.tickCount || 0) + 1;
      }
      f.beat *= Math.exp(-dt * 7.5);
      f.tick *= Math.exp(-dt * 12);
      f.kick *= Math.exp(-dt * 4);
      f.tempo = a.bpm / 120;
      f.bpm = a.bpm;
      f.beatIndex = this.beatCount || 0;
      f.tickIndex = this.tickCount || 0;
      const period = 60 / a.bpm;
      f.beatPhase = this.lastBeatT >= 0 ? Math.min(1, ((t - this.lastBeatT) % period) / period) : 0;
      // 冷 -> 暖：段落能量在整曲分位里的位置
      const warmRaw = Math.max(0, Math.min(1, (f.slow - a.eLo) / (a.eHi - a.eLo)));
      f.warm += (warmRaw - f.warm) * (1 - Math.exp(-dt / 1.5));
      this.prevT = t;
      return f;
    }
  }

  MB.Audio = Audio;
  MB.FFT = FFT;
})();
