#!/usr/bin/env python3
"""Embed an audio file so the generated website plays it without an upload step.

Usage: python3 embed_audio.py <audio-file> <project-dir> [--name "Title · Artist"] [--local-only]
By default this writes assets/track.js, making the delivered website self-contained. --local-only writes
assets/track.local.js instead for a private override. Never publish audio without redistribution rights.
"""
import argparse, base64, json, pathlib
ap = argparse.ArgumentParser(); ap.add_argument("audio"); ap.add_argument("project"); ap.add_argument("--name"); ap.add_argument("--local-only", action="store_true")
a = ap.parse_args(); src = pathlib.Path(a.audio); out = pathlib.Path(a.project) / "assets" / ("track.local.js" if a.local_only else "track.js")
out.parent.mkdir(parents=True, exist_ok=True)
data = base64.b64encode(src.read_bytes()).decode()
out.write_text("window.MB_TRACK = " + json.dumps({"name": a.name or src.stem, "data": data}) + ";\n", encoding="utf-8")
print(f"wrote {out}  ({out.stat().st_size / 1e6:.1f} MB)")
