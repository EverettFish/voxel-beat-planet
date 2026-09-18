#!/usr/bin/env python3
"""Print a song's energy curve and suggest section boundaries for the climate timeline.

Usage:  python3 analyze_audio.py song.mp3 [--win 2.0] [--max-chapters 8]
Needs:  ffmpeg on PATH, numpy.

The boundaries are where the smoothed loudness changes level (verse -> chorus, breakdown, outro).
Use them as the `at:` seconds of MB_SCENE.chapters — the arc of the world should turn where the song turns.
They are suggestions: listen, then nudge. Never invent timestamps without running this.
"""
import argparse, subprocess, sys
import numpy as np

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("audio"); ap.add_argument("--win", type=float, default=2.0); ap.add_argument("--max-chapters", type=int, default=8)
    a = ap.parse_args(); sr = 11025
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", a.audio, "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"], capture_output=True)
    if raw.returncode: sys.exit(raw.stderr.decode()[:400])
    x = np.frombuffer(raw.stdout, dtype=np.float32); dur = len(x) / sr
    w = int(sr * a.win); e = np.array([np.sqrt(np.mean(x[i:i + w] ** 2)) for i in range(0, len(x) - w, w)]); e /= max(e.max(), 1e-9)
    print(f"duration: {dur:.1f}s   window: {a.win}s\n")
    for i, v in enumerate(e): print(f"{i * a.win:6.0f}s {'#' * int(v * 50)}")
    # level-change detection: compare mean of the 4 windows before vs after each point
    k = 4; score = np.zeros(len(e))
    for i in range(k, len(e) - k): score[i] = abs(e[i:i + k].mean() - e[i - k:i].mean())
    cuts = []
    for i in np.argsort(-score):
        if score[i] < 0.10 or len(cuts) >= a.max_chapters - 1: break
        if all(abs(i - c) * a.win >= 14 for c in cuts): cuts.append(int(i))
    cuts.sort()
    print("\nsuggested chapter starts (seconds) and the level of the section that follows:")
    pts = [0] + cuts
    for n, c in enumerate(pts):
        end = pts[n + 1] if n + 1 < len(pts) else len(e)
        lvl = e[c:end].mean(); kind = "quiet" if lvl < 0.35 else "mid" if lvl < 0.65 else "full"
        print(f"  at: {c * a.win:6.1f}   level {lvl:.2f}  ({kind})")
    print(f"\nMB_SCENE.duration = {dur:.1f}")

if __name__ == "__main__": main()
