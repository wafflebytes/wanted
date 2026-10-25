"""
Icon options (nothing is replaced): the heat map itself is the logo. Writes design/icon-concepts/*.png.

    python3 scripts/build-icon-options.py
"""
import math
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
src = (ROOT / "scripts/build-splash.py").read_text()
ns = {"__file__": str(ROOT / "scripts/build-splash.py")}
exec(compile(src[: src.index("# Layout")], "build-splash-head", "exec"), ns)
ember, inside = ns["ember"], ns["inside"]
pts, us, lake, x0, y0, x1, y1 = ns["pts"], ns["us"], ns["lake"], ns["x0"], ns["y0"], ns["x1"], ns["y1"]

N = 1024
S = 2
M = N * S
LUT = np.array([ember(i / 255) for i in range(256)], dtype=np.float32)


def frame(bw, fx, fy):
    """Map placed so the fraction (fx, fy) of the country sits at the icon's centre."""
    bh = bw * (y1 - y0) / (x1 - x0)
    return bw, bh, N / 2 - fx * bw, N / 2 - fy * bh


def to_icon(p, f):
    bw, bh, bx, by = f
    return (bx + (p[0] - x0) / (x1 - x0) * bw, by + (p[1] - y0) / (y1 - y0) * bh)


def land_mask(f):
    m = Image.new("L", (M, M), 0)
    d = ImageDraw.Draw(m)
    d.polygon([(a * S, b * S) for a, b in (to_icon(p, f) for p in us)], fill=255)
    d.polygon([(a * S, b * S) for a, b in (to_icon(p, f) for p in lake)], fill=0)
    return m


def heat_field(f, sigma):
    """Heat at every pixel (0..1), from the same metro data the app uses."""
    bw, bh, bx, by = f
    ys, xs = np.mgrid[0:M, 0:M].astype(np.float32)
    mx = x0 + (xs / S - bx) / bw * (x1 - x0)
    my = y0 + (ys / S - by) / bh * (y1 - y0)
    v = np.zeros((M, M), np.float32)
    for x, y, p in pts:
        v += p * np.exp(-((mx - x) ** 2 + (my - y) ** 2) / (2 * sigma**2))
    return v


def colour(t):
    idx = np.clip(t * 255, 0, 255).astype(np.int32)
    return LUT[idx]


def to_img(a):
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), "RGB")


def finish(img, name):
    out = ROOT / "design/icon-concepts" / f"{name}.png"
    img.resize((N, N), Image.LANCZOS).save(out)
    print("wrote", out.relative_to(ROOT))


def option_heat():
    """1: the country as one smooth glowing heat field, cropped tight on the east where it's hottest.
    The Atlantic coast, Florida and the Great Lakes notch make it unmistakable even as a smudge."""
    f = frame(1750, 0.66, 0.52)
    mask = land_mask(f).filter(ImageFilter.GaussianBlur(9 * S)).point(lambda a: 255 if a > 127 else 0).filter(ImageFilter.GaussianBlur(1.2 * S))
    v = heat_field(f, 0.0062)
    t = (v / v.max()) ** 0.6
    t = 0.1 + 0.9 * t
    m = np.asarray(mask, np.float32)[..., None] / 255
    col = colour(t) * m
    # A hot coast: light just inside the edge, like the map is lit from within.
    edge = np.asarray(mask.filter(ImageFilter.GaussianBlur(14 * S)), np.float32)[..., None] / 255
    rim = np.clip(m - edge, 0, 1) * 0.0
    bg = np.zeros((M, M, 3), np.float32) + np.array([8, 5, 9], np.float32)
    halo = np.asarray(mask.filter(ImageFilter.GaussianBlur(60 * S)), np.float32)[..., None] / 255
    bg += halo * np.array([120, 46, 14], np.float32) * (1 - m)
    yy, xx = np.mgrid[0:M, 0:M].astype(np.float32)
    st = 14 * S
    rows = np.floor(yy / st)
    cx = (np.floor((xx + (rows % 2) * st / 2) / st) + 0.5) * st - (rows % 2) * st / 2
    cy = (rows + 0.5) * st
    dd = np.sqrt((xx - cx) ** 2 + (yy - cy) ** 2) / (st / 2)
    tex = 0.62 + 0.38 * np.clip((1.05 - dd) * 3.2, 0, 1)
    col = col * tex[..., None]
    img = to_img(col + bg * (1 - m) + rim)
    # Soft bloom of the hottest light.
    hot = to_img(col * np.clip((t[..., None] - 0.62) / 0.38, 0, 1))
    img = ImageChops.add(img, hot.filter(ImageFilter.GaussianBlur(26 * S)))
    finish(img, "G-heat-field")


def option_dots():
    """2: dense dot-matrix country filling the icon edge to edge, west coast and Maine bleeding off.
    The dots are big and tight enough that the shape reads as one lit mass, not a scatter."""
    f = frame(1260, 0.52, 0.50)
    bw, bh, bx, by = f
    step = 17
    out = []
    for gy in range(int(bh // step) + 1):
        for gx in range(int(bw // step) + 1):
            px = gx * step + (step / 2 if gy % 2 else 0)
            py = gy * step
            mx = x0 + px / bw * (x1 - x0)
            my = y0 + py / bh * (y1 - y0)
            if not inside(mx, my, us) or inside(mx, my, lake):
                continue
            v = sum(p * math.exp(-((mx - x) ** 2 + (my - y) ** 2) / (2 * 0.0062**2)) for x, y, p in pts)
            out.append((bx + px, by + py, v))
    peak = max(v for *_, v in out)
    bgc = np.zeros((M, M, 3), np.float32) + np.array([9, 6, 10], np.float32)
    yy, xx = np.mgrid[0:M, 0:M].astype(np.float32)
    r = np.sqrt((xx - M / 2) ** 2 + (yy - M * 0.58) ** 2) / M
    bgc += np.clip(0.55 - r, 0, 1)[..., None] * np.array([70, 24, 10], np.float32)
    img = to_img(bgc)
    layer = Image.new("RGB", (M, M), (0, 0, 0))
    bloom = Image.new("RGB", (M, M), (0, 0, 0))
    d, bd = ImageDraw.Draw(layer), ImageDraw.Draw(bloom)
    for x, y, v in out:
        if not (-20 < x < N + 20 and -20 < y < N + 20):
            continue
        t = (v / peak) ** 0.4
        rad = step / 2 * (0.62 + 0.38 * t) * 1.02
        c = ember(0.2 + 0.8 * t)
        d.ellipse([(x - rad) * S, (y - rad) * S, (x + rad) * S, (y + rad) * S], fill=c)
        if t > 0.5:
            rr = rad * 2.6
            bd.ellipse([(x - rr) * S, (y - rr) * S, (x + rr) * S, (y + rr) * S], fill=tuple(int(k * 0.5) for k in c))
    bloom = bloom.filter(ImageFilter.GaussianBlur(24 * S))
    img = ImageChops.add(ImageChops.add(img, bloom), layer)
    finish(img, "H-dot-matrix")


option_heat()
option_dots()

strip = Image.new("RGB", (2 * 420 + 3 * 30, 300), (34, 34, 38))
x = 30
for n in ("G-heat-field", "H-dot-matrix"):
    im = Image.open(ROOT / "design/icon-concepts" / f"{n}.png")
    for size, ox in ((240, 0), (60, 250)):
        t = im.resize((size, size), Image.LANCZOS)
        m = Image.new("L", (size, size), 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, size - 1, size - 1], radius=size * 0.225, fill=255)
        strip.paste(t, (x + ox, 30 if size == 240 else 30), m)
    x += 450
strip.save(ROOT / "design/icon-concepts/sizes-2.png")
