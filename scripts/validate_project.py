#!/usr/bin/env python3
"""Validate structural and performance invariants for a generated planet."""

from __future__ import annotations

import argparse
import re
from pathlib import Path


REQUIRED = [
    "index.html", "scene-bible.md", "js/config.js", "js/scene-manifest.js",
    "js/terrain.js", "js/planet.js", "js/audio.js", "js/scene.js", "js/main.js",
]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("project", type=Path)
    root = parser.parse_args().project.resolve()
    errors: list[str] = []
    for rel in REQUIRED:
        if not (root / rel).is_file():
            errors.append(f"missing {rel}")
    if errors:
        raise SystemExit("\n".join(errors))
    all_text = "\n".join(
        p.read_text(encoding="utf-8", errors="ignore")
        for p in root.rglob("*") if p.is_file() and p.suffix.lower() in {".js", ".html", ".md", ".css"}
    )
    config = (root / "js/config.js").read_text(encoding="utf-8")
    manifest = (root / "js/scene-manifest.js").read_text(encoding="utf-8")
    planet = (root / "js/planet.js").read_text(encoding="utf-8")
    scene = (root / "js/scene.js").read_text(encoding="utf-8")
    if not re.search(r"(?:N\s*[:=]|DEFAULT_N\s*=)\s*132\b", config):
        errors.append("default surface grid must be N=132 (~104,544 large voxels)")
    for token in ("regions", "landmarks", "inhabitants", "heroEvents", "audioBindings"):
        if token not in manifest:
            errors.append(f"scene manifest missing {token}")
    for token in ("InstancedBufferAttribute", "frustumCulled", "visibleChunks", ".dot("):
        if token not in planet:
            errors.append(f"planet renderer missing evidence of {token}")
    if "InstancedMesh" not in scene:
        errors.append("scene must instance repeated props")
    for token in ("timeOfDay", "season", "surfaceType", "distantRead"):
        if token not in manifest:
            errors.append(f"scene manifest missing {token}")
    if not any(token in planet for token in ("sin(lon", "sin(lat", "angularDistance", "wavePhase")):
        errors.append("planet renderer lacks evidence of a spatially propagating wave field")
    if "TODO" in manifest or "TODO" in scene:
        errors.append("unfinished scene placeholder")
    forbidden = [p for p in root.rglob("*") if p.suffix.lower() in {".mp4", ".mov", ".avi", ".mkv", ".webm"}]
    if forbidden:
        errors.append("video files are not allowed in the generated project")
    if errors:
        raise SystemExit("validation failed:\n- " + "\n- ".join(errors))
    print("validation passed")


if __name__ == "__main__":
    main()
