"""
Builds the launch animation's dots.

  src/ui/splash/dots.json    The country as faint dots plus the heat on top: the same halftone grid,
                             grouped into bands by how many people live nearby. The app grows each
                             band's dots from nothing, hottest first, so the map lights up city by city.

Every dot sits on one grid over the lower 48 (a hand-traced outline, Great Lakes cut out).
A dot's size is how many people live near it (data/metros.json).

    python3 scripts/build-splash.py
"""
import json
import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
W, H = 1179, 2556  # an iPhone's screen, so the launch image can run edge to edge
EMBER = [(0, (0x3B, 0x24, 0x2C)), (0.35, (0xB4, 0x4A, 0x2A)), (0.65, (0xFF, 0x9F, 0x1C)), (0.88, (0xFF, 0xD2, 0x6A)), (1, (0xFF, 0xF1, 0xD0))]
PAPER = (0xF1, 0xE6, 0xCF)
BASE = (0x6E, 0x4C, 0x48)
BANDS = 14

# The lower 48, clockwise from Cape Flattery, as (lon, lat). Coarse on purpose: a 15 px grid can't see more.
US = [
    (-124.7, 48.4), (-123.3, 49.0), (-95.15, 49.0), (-95.15, 49.38), (-94.8, 48.7), (-90.0, 48.1), (-89.6, 48.0), (-91.5, 47.1),
    (-92.1, 46.8), (-90.4, 46.6), (-88.4, 47.4), (-87.6, 46.5), (-85.0, 46.75), (-84.5, 46.5), (-84.7, 45.8), (-83.4, 45.1),
    (-83.3, 44.3), (-83.9, 43.9), (-82.6, 43.9), (-82.5, 43.0), (-83.1, 42.1), (-83.5, 41.7), (-81.7, 41.5), (-80.1, 42.1),
    (-78.9, 42.9), (-79.0, 43.3), (-77.6, 43.3), (-76.5, 43.5), (-76.3, 44.2), (-74.7, 45.0), (-71.5, 45.0), (-70.8, 45.4),
    (-69.2, 47.4), (-67.8, 47.1), (-67.8, 45.7), (-67.0, 44.8), (-68.8, 44.2), (-70.2, 43.6), (-70.7, 42.7), (-70.0, 41.8),
    (-71.4, 41.4), (-72.0, 41.1), (-73.9, 40.5), (-74.0, 40.0), (-74.9, 38.9), (-75.1, 38.4), (-76.0, 37.0), (-75.5, 35.6),
    (-76.5, 34.7), (-77.9, 33.9), (-79.2, 33.2), (-80.9, 32.0), (-81.4, 30.7), (-80.6, 28.4), (-80.0, 26.7), (-80.4, 25.2),
    (-81.1, 25.1), (-81.8, 26.1), (-82.7, 27.6), (-82.8, 29.0), (-83.6, 29.9), (-84.4, 30.0), (-85.4, 29.7), (-86.5, 30.4),
    (-88.0, 30.6), (-89.6, 30.2), (-89.4, 29.0), (-90.5, 29.1), (-92.3, 29.6), (-93.8, 29.7), (-94.8, 29.3), (-96.6, 28.1),
    (-97.4, 27.4), (-97.2, 25.9), (-99.1, 26.4), (-99.5, 27.5), (-100.3, 28.3), (-101.4, 29.8), (-102.4, 29.8), (-103.1, 29.0),
    (-104.5, 29.6), (-104.9, 30.6), (-106.5, 31.8), (-108.2, 31.8), (-108.2, 31.3), (-111.1, 31.3), (-114.8, 32.5), (-114.7, 32.7),
    (-117.1, 32.5), (-117.3, 33.2), (-118.4, 33.8), (-119.6, 34.4), (-120.6, 34.6), (-121.9, 36.6), (-122.5, 37.7), (-123.0, 38.3),
    (-123.8, 39.8), (-124.4, 40.4), (-124.2, 41.8), (-124.5, 42.8), (-124.0, 44.6), (-123.9, 46.2), (-124.1, 47.0),
]
LAKE_MICHIGAN = [(-87.5, 41.65), (-86.6, 41.9), (-86.2, 42.8), (-86.4, 43.8), (-85.6, 45.0), (-85.0, 45.8), (-86.5, 45.9), (-87.6, 44.9), (-87.9, 43.0), (-87.8, 42.2)]


def ember(t):
    t = max(0.0, min(1.0, t))
    for (a, p), (b, q) in zip(EMBER, EMBER[1:]):
        if t <= b:
            k = (t - a) / (b - a)
            return tuple(round(p[i] + (q[i] - p[i]) * k) for i in range(3))
    return EMBER[-1][1]


def merc(lat, lon):
    s = math.sin(math.radians(lat))
    return (lon + 180) / 360, 0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)


def inside(x, y, poly):
    hit = False
    for (x1, y1), (x2, y2) in zip(poly, poly[1:] + poly[:1]):
        if (y1 > y) != (y2 > y) and x < x1 + (y - y1) * (x2 - x1) / (y2 - y1):
            hit = not hit
    return hit


metros = [m for m in json.load(open(ROOT / "data/metros.json"))["metros"] if 24 < m["lat"] < 50 and -125 < m["lon"] < -66]
pts = [(*merc(m["lat"], m["lon"]), m["pop"]) for m in metros]
x0, y0 = merc(49.5, -124.8)
x1, y1 = merc(24.5, -66.9)
us = [merc(lat, lon) for lon, lat in US]
lake = [merc(lat, lon) for lon, lat in LAKE_MICHIGAN]

# Layout: Gus and the wordmark in the upper middle, the country big and cropped by the bottom,
# left and right edges, as if peeking up from below.
GUS_H = 400
WORD_SIZE = 150
bw = 1520
bh = bw * (y1 - y0) / (x1 - x0)
bx, by = (W - bw) / 2, (H - bh) / 2
step = 22
sigma = 0.0055  # about 2 degrees of influence per city, in mercator units

grid = []
for gy in range(int(bh // step) + 1):
    for gx in range(int(bw // step) + 1):
        # Offset every other row, like a printed screen.
        px = gx * step + (step / 2 if gy % 2 else 0)
        py = gy * step
        mx = x0 + px / bw * (x1 - x0)
        my = y0 + py / bh * (y1 - y0)
        if not inside(mx, my, us) or inside(mx, my, lake):
            continue
        if not (-40 < bx + px < W + 40 and by + py < H + 40):
            continue
        v = sum(p * math.exp(-((mx - x) ** 2 + (my - y) ** 2) / (2 * sigma**2)) for x, y, p in pts)
        grid.append((bx + px, by + py, v))
peak = max(v for *_, v in grid)

BASE_R = 3.9

# The heat, in bands. Each band is one path of zero-length strokes; with round caps, its stroke
# width is every dot's diameter, so the app grows a whole band by animating one number.
bands = [[] for _ in range(BANDS)]
for x, y, v in grid:
    t = (v / peak) ** 0.38
    r = step / 2 * (1.25 * t - 0.2)
    if r < BASE_R + 0.4:
        continue
    bands[min(BANDS - 1, int(t * BANDS))].append((x, y))
out = []
for i, b in enumerate(bands):
    if not b:
        continue
    t = (i + 0.5) / BANDS
    r = step / 2 * (1.25 * t - 0.2)
    color = "#%02x%02x%02x" % ember(0.25 + 0.75 * t)
    out.append({"t": round(t, 3), "r": round(r, 2), "color": color, "d": "".join(f"M{x:.1f} {y:.1f}h.01" for x, y in b)})
(ROOT / "src/ui/splash").mkdir(exist_ok=True)
base = "".join(f"M{x:.1f} {y:.1f}h.01" for x, y, _ in grid)
json.dump({"w": W, "h": H, "baseR": BASE_R, "baseColor": "#%02x%02x%02x" % BASE, "base": base, "bands": out}, open(ROOT / "src/ui/splash/dots.json", "w"), separators=(",", ":"))
print(f"wrote dots.json ({len(grid)} land dots, {sum(len(b) for b in bands)} heat dots in {len(out)} bands)")
