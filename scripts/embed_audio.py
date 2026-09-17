#!/usr/bin/env python3
"""Embed a user-owned audio file as a local JavaScript payload."""

from __future__ import annotations

import argparse
import base64
import json
from pathlib import Path


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--name", default=None)
    args = parser.parse_args()

    payload = base64.b64encode(args.input.read_bytes()).decode("ascii")
    name = args.name or args.input.stem
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(
        "window.MB_TRACK = { name: "
        + json.dumps(name, ensure_ascii=False)
        + ", data: "
        + json.dumps(payload)
        + " };\n",
        encoding="utf-8",
    )
    print(f"embedded {args.input.name} -> {args.output} ({len(payload):,} base64 chars)")


if __name__ == "__main__":
    main()
