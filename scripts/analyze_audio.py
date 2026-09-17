#!/usr/bin/env python3
"""Dependency-light audio profile for scene ideation; requires ffmpeg/ffprobe."""

from __future__ import annotations

import argparse
import array
import json
import math
import shutil
import subprocess
from pathlib import Path


def run_json(cmd: list[str]) -> dict:
    return json.loads(subprocess.check_output(cmd, text=True, encoding="utf-8"))


def percentile(values: list[float], p: float) -> float:
    if not values:
        return 0.0
    data = sorted(values)
    return data[min(len(data) - 1, int((len(data) - 1) * p))]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("audio", type=Path)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()
    ffmpeg = shutil.which("ffmpeg")
    ffprobe = shutil.which("ffprobe")
    if not ffmpeg or not ffprobe:
        raise SystemExit("ffmpeg and ffprobe are required")

    meta = run_json([
        ffprobe, "-v", "error", "-show_entries",
        "format=duration:format_tags=title,artist,album,date", "-of", "json", str(args.audio)
    ]).get("format", {})
    rate = 11025
    raw = subprocess.check_output([
        ffmpeg, "-v", "error", "-i", str(args.audio), "-ac", "1", "-ar", str(rate),
        "-f", "s16le", "-"
    ])
    pcm = array.array("h")
    pcm.frombytes(raw)
    hop = 1024
    energy: list[float] = []
    for start in range(0, max(0, len(pcm) - hop), hop):
        frame = pcm[start:start + hop]
        energy.append(math.sqrt(sum(float(x) * x for x in frame) / len(frame)) / 32768.0)
    floor = percentile(energy, 0.1)
    ceiling = max(percentile(energy, 0.95), floor + 1e-6)
    norm = [max(0.0, min(1.0, (x - floor) / (ceiling - floor))) for x in energy]
    novelty = [0.0] + [max(0.0, norm[i] - norm[i - 1]) for i in range(1, len(norm))]
    novelty_gate = percentile(novelty, 0.84)
    pulses = [1.0 if x >= novelty_gate and x > 0.025 else 0.0 for x in novelty]
    lo = int((60.0 / 180.0) * rate / hop)
    hi = int((60.0 / 70.0) * rate / hop)
    best_lag, best_score = lo, -1.0
    for lag in range(max(1, lo), max(lo + 1, hi + 1)):
        score = sum(pulses[i] * pulses[i - lag] for i in range(lag, len(pulses)))
        if score > best_score:
            best_score, best_lag = score, lag
    bpm = 60.0 * rate / (hop * best_lag)
    seconds_per_frame = hop / rate
    section_span = max(1, int(8.0 / seconds_per_frame))
    sections = []
    for i in range(0, len(norm), section_span):
        chunk = norm[i:i + section_span]
        if chunk:
            sections.append({"time": round(i * seconds_per_frame, 2), "energy": round(sum(chunk) / len(chunk), 3)})
    tags = meta.get("tags", {})
    result = {
        "title": tags.get("title") or args.audio.stem,
        "artist": tags.get("artist"),
        "album": tags.get("album"),
        "date": tags.get("date"),
        "duration_seconds": round(float(meta.get("duration", 0.0)), 3),
        "estimated_bpm": round(bpm, 2),
        "transient_density_per_second": round(sum(pulses) / max(1e-6, len(norm) * seconds_per_frame), 3),
        "energy_sections_8s": sections,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2) if args.json else "\n".join(f"{k}: {v}" for k, v in result.items()))


if __name__ == "__main__":
    main()
