#!/usr/bin/env python3
"""Erzeugt runde Plattenlabel-Cover: volles Quadrat per FG-Squircular-Mapping auf die Scheibe."""
import os
import sys
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC_DIR = os.path.join(ROOT, "img", "spotify")
DEST_DIR = os.path.join(ROOT, "img", "covers-round")
OUT_SIZE = 800
SUPER = 2  # intern mit 2× rechnen, dann herunterskalieren


def _bilinear(arr, src_x, src_y):
    h, w = arr.shape[:2]
    x0 = np.floor(src_x).astype(np.int32)
    y0 = np.floor(src_y).astype(np.int32)
    x1 = np.clip(x0 + 1, 0, w - 1)
    y1 = np.clip(y0 + 1, 0, h - 1)
    x0 = np.clip(x0, 0, w - 1)
    y0 = np.clip(y0, 0, h - 1)
    fx = (src_x - x0)[..., None]
    fy = (src_y - y0)[..., None]
    a = arr.astype(np.float32)
    return (
        a[y0, x0] * (1 - fx) * (1 - fy)
        + a[y0, x1] * fx * (1 - fy)
        + a[y1, x0] * (1 - fx) * fy
        + a[y1, x1] * fx * fy
    )


def square_to_disc(src: Image.Image, size: int) -> Image.Image:
    """FG-Squircular / elliptical-grid: komplette Quadratfläche füllt die Scheibe."""
    src = src.convert("RGBA")
    arr = np.asarray(src)
    h, w = arr.shape[:2]
    ys, xs = np.mgrid[0:size, 0:size]
    u = (xs + 0.5) / size * 2.0 - 1.0
    v = (ys + 0.5) / size * 2.0 - 1.0
    u2, v2 = u * u, v * v
    D = np.maximum((2 + u2 - v2) ** 2 - 8 * u2, 0)
    X = np.clip((2 + u2 - v2 - np.sqrt(D)) / 2, 0, 1)
    Dy = np.maximum((2 + v2 - u2) ** 2 - 8 * v2, 0)
    Y = np.clip((2 + v2 - u2 - np.sqrt(Dy)) / 2, 0, 1)
    x = np.sign(u) * np.sqrt(X)
    y = np.sign(v) * np.sqrt(Y)
    src_x = (x + 1) / 2 * (w - 1)
    src_y = (y + 1) / 2 * (h - 1)
    out = _bilinear(arr, src_x, src_y)
    r = np.sqrt(u2 + v2)
    # weiche Kante (~1.2 px), außerhalb transparent
    aa = np.clip((1.0 - r) * size / 1.2, 0, 1)
    out[..., 3] *= aa
    out[r > 1.0] = 0
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")


def render_round(src_path: str, dest_path: str, size: int = OUT_SIZE) -> None:
    im = Image.open(src_path)
    work = size * SUPER
    # Quelle hochskalieren, damit das Mapping nicht weich zeichnet
    im = im.convert("RGBA").resize((work, work), Image.Resampling.LANCZOS)
    disc = square_to_disc(im, work)
    if SUPER > 1:
        disc = disc.resize((size, size), Image.Resampling.LANCZOS)
    os.makedirs(os.path.dirname(dest_path) or ".", exist_ok=True)
    ext = os.path.splitext(dest_path)[1].lower()
    if ext == ".webp":
        disc.save(dest_path, "WEBP", quality=92, method=6)
    else:
        disc.save(dest_path, "PNG", optimize=True)


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
