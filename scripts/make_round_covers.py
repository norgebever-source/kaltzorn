#!/usr/bin/env python3
"""Erzeugt die Cover für den Plattenschrank: quadratisch (1:1), unverzerrt, einheitliche Größe.

Dateinamen/Ordner (img/covers-round) bleiben aus Kompatibilitätsgründen gleich."""
import os
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, "img", "spotify")
DEST_DIR = os.path.join(ROOT, "img", "covers-round")
OUT_SIZE = 640


def render_round(src_path: str, dest_path: str, size: int = OUT_SIZE) -> None:
    """Quadratisches Cover ohne Verzerrung: mittig auf 1:1 zuschneiden, auf einheitliche Größe skalieren."""
    im = Image.open(src_path).convert("RGB")
    w, h = im.size
    side = min(w, h)
    left, top = (w - side) // 2, (h - side) // 2
    im = im.crop((left, top, left + side, top + side))
    im = im.resize((size, size), Image.Resampling.LANCZOS)
    os.makedirs(os.path.dirname(dest_path) or ".", exist_ok=True)
    ext = os.path.splitext(dest_path)[1].lower()
    if ext == ".webp":
        im.save(dest_path, "WEBP", quality=92, method=6)
    else:
        im.save(dest_path, "PNG", optimize=True)


def dest_for(track_id: str) -> str:
    return os.path.join(DEST_DIR, f"{track_id}.webp")


def ensure_round(src_path: str, dest_path: str = None, force: bool = False) -> str:
    if dest_path is None:
        tid = os.path.splitext(os.path.basename(src_path))[0]
        dest_path = dest_for(tid)
    if (
        not force
        and os.path.exists(dest_path)
        and os.path.getmtime(dest_path) >= os.path.getmtime(src_path)
    ):
        return dest_path
    render_round(src_path, dest_path)
    return dest_path


def all_square_covers():
    if not os.path.isdir(SRC_DIR):
        return []
    return sorted(
        os.path.join(SRC_DIR, n)
        for n in os.listdir(SRC_DIR)
        if n.lower().endswith((".jpg", ".jpeg", ".png", ".webp"))
    )


def main():
    force = "--force" in sys.argv
    paths = [a for a in sys.argv[1:] if not a.startswith("-")] or all_square_covers()
    if not paths:
        print("Keine Cover gefunden", file=sys.stderr)
        sys.exit(1)
    for src in paths:
        dest = ensure_round(src, force=force)
        print(os.path.relpath(dest, ROOT), os.path.getsize(dest))


if __name__ == "__main__":
    main()
