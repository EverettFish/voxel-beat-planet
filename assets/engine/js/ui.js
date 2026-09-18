// UI（引擎件）：加载遮罩、内置音乐播放器、章节时间轴（可点击跳转）、地标列表、toast、统计面板。
(function () {
  const $ = id => document.getElementById(id);
  class UI {
    constructor() {
      this.overlay = $('overlay'); this.barPlanet = $('bar-planet'); this.barAudio = $('bar-audio');
      this.txtPlanet = $('txt-planet'); this.txtAudio = $('txt-audio'); this.startBtn = $('start-btn');
      this.player = $('player'); this.playBtn = $('play-btn'); this.iconPlay = $('icon-play'); this.iconPause = $('icon-pause');
      this.volume = $('volume'); this.progress = $('progress'); this.fill = $('progress-fill'); this.marks = $('chapter-marks');
      this.trackName = $('track-name'); this.trackTime = $('track-time'); this.chapter = $('chapter-name');
      this.places = $('places'); this.stats = $('stats'); this.toast = $('toast');
      this.onStart = this.onToggle = this.onVolume = this.onSeek = null;
      this.showStats = false; this._toastTimer = 0; this._chapter = -1;
      this.bind();
    }
    bind() {
      this.startBtn.addEventListener('click', () => this.onStart && this.onStart());
      this.playBtn.addEventListener('click', () => this.onToggle && this.onToggle());
      this.volume.addEventListener('input', () => this.onVolume && this.onVolume(parseFloat(this.volume.value)));
      this.progress.addEventListener('click', e => { const r = this.progress.getBoundingClientRect(); if (this.onSeek) this.onSeek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))); });
      window.addEventListener('keydown', e => {
        if (e.target && e.target.tagName === 'INPUT') return;
        if (e.code === 'Space') { e.preventDefault(); if (this.onToggle && !this.overlay.classList.contains('show')) this.onToggle(); }
        if (e.key === 'i' || e.key === 'I') { this.showStats = !this.showStats; this.stats.classList.toggle('show', this.showStats); }
      });
    }
    setPlanetProgress(p) { this.barPlanet.style.width = (p * 100).toFixed(1) + '%'; this.txtPlanet.textContent = p >= 1 ? '星球已就绪' : `正在铺设地表 ${Math.round(p * 100)}%`; }
    setAudioProgress(p, label) { this.barAudio.style.width = (p * 100).toFixed(1) + '%'; this.txtAudio.textContent = label || (p >= 1 ? '节奏图谱已就绪' : `正在分析节奏 ${Math.round(p * 100)}%`); }
    ready(hasAudio) { this.startBtn.disabled = false; this.startBtn.classList.add('ready'); this.startBtn.textContent = hasAudio ? '播放并进入星球' : '预览星球（无音乐）'; }
    hideOverlay() { this.overlay.classList.remove('show'); this.overlay.classList.add('hide'); setTimeout(() => { this.overlay.style.display = 'none'; }, 900); this.player.classList.add('show'); this.places.classList.add('show'); }
    setPlaying(on) { this.iconPlay.style.display = on ? 'none' : ''; this.iconPause.style.display = on ? '' : 'none'; this.playBtn.setAttribute('aria-label', on ? '暂停' : '播放'); }
    setTrack(name) { this.trackName.textContent = name || '未命名音轨'; }
    buildChapters(chapters, duration, onGo) {
      this.marks.innerHTML = '';
      chapters.forEach((c, i) => {
        if (!i) return;
        const m = document.createElement('button'); m.className = 'mark'; m.style.left = (c.at / duration * 100) + '%'; m.title = c.name;
        m.setAttribute('aria-label', '跳到章节：' + c.name);
        m.addEventListener('click', e => { e.stopPropagation(); onGo(c.at / duration + 0.004); });
        this.marks.appendChild(m);
      });
    }
    setChapter(i, c) { if (i === this._chapter) return; this._chapter = i; this.chapter.textContent = c.name; this.chapter.classList.remove('flip'); void this.chapter.offsetWidth; this.chapter.classList.add('flip'); }
    buildPlaces(list, onGo) {
      this.places.innerHTML = ''; this.places.style.display = list.length ? '' : 'none';
      list.forEach(p => { const b = document.createElement('button'); b.textContent = p.name; b.addEventListener('click', () => onGo(p.id)); this.places.appendChild(b); });
    }
    setProgress(t, dur) {
      this.fill.style.width = dur > 0 ? (t / dur * 100).toFixed(2) + '%' : '0%';
      const f = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
      this.trackTime.textContent = dur > 0 ? f(t) + ' / ' + f(dur) : '';
    }
    showToast(msg, ms) { this.toast.textContent = msg; this.toast.classList.add('show'); clearTimeout(this._toastTimer); this._toastTimer = setTimeout(() => this.toast.classList.remove('show'), ms || 2600); }
    setStats(o) {
      if (!this.showStats) return;
      this.stats.textContent = `FPS ${o.fps.toFixed(0)}\n地表体素 ${o.voxels.toLocaleString()}\n可见 chunk ${o.visible}/${o.chunks}\ndraw calls ${o.calls}  tris ${(o.tris / 1e6).toFixed(2)}M\n` +
        `bass ${o.f.bass.toFixed(2)} mid ${o.f.mid.toFixed(2)} treble ${o.f.treble.toFixed(2)}\nenergy ${o.f.energy.toFixed(2)} beat ${o.f.beat.toFixed(2)}\n气候 ${o.chapter}  t=${o.ct.toFixed(1)}s`;
    }
  }
  MB.UI = UI;
})();
