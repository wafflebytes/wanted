"""
Icon concepts (nothing is replaced): the heat map of the lower 48 as halftone, cropped by the
icon's edges. Writes design/icon-concepts/*.png at 1024.

    python3 scripts/build-icon-concepts.py
"""
import math
import runpy
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
src = (ROOT / "scripts/build-splash.py").read_text()
ns = {}
ns["__file__"] = str(ROOT / "scripts/build-splash.py")
exec(compile(src[: src.index("# Layout")], "build-splash-head", "exec"), ns)
ember, merc, inside = ns["ember"], ns["merc"], ns["inside"]
pts, us, lake, x0, y0, x1, y1 = ns["pts"], ns["us"], ns["lake"], ns["x0"], ns["y0"], ns["x1"], ns["y1"]
PAPER = ns["PAPER"]

N = 1024
S = 2
SIGMA = 0.0055


def grid_for(bw, cx, cy, step):
    """Dots over the country at width bw, with the map centred on (cx, cy) in icon pixels."""
    bh = bw * (y1 - y0) / (x1 - x0)
    bx, by = cx - bw / 2, cy - bh / 2
    out = []
    for gy in range(int(bh // step) + 1):
        for gx in range(int(bw // step) + 1):
            px = gx * step + (step / 2 if gy % 2 else 0)
            py = gy * step
            mx = x0 + px / bw * (x1 - x0)
            my = y0 + py / bh * (y1 - y0)
            if not inside(mx, my, us) or inside(mx, my, lake):
                continue
            v = sum(p * math.exp(-((mx - x) ** 2 + (my - y) ** 2) / (2 * SIGMA**2)) for x, y, p in pts)
            out.append((bx + px, by + py, v))
    return out


def render(name, bw, cx, cy, step, wordmark=False, ring=True):
    grid = grid_for(bw, cx, cy, step)
    peak = max(v for *_, v in grid)
    # Background: near black with a warm lift low in the icon.
    bg = Image.new("RGB", (N, N), (6, 5, 8))
    glow = Image.new("RGB", (N, N), (0, 0, 0))
    gd = ImageDraw.Draw(glow)
    hot = max(grid, key=lambda g: g[2])
    layer = Image.new("RGB", (N * S, N * S), (0, 0, 0))
    d = ImageDraw.Draw(layer)
    bloom = Image.new("RGB", (N * S, N * S), (0, 0, 0))
    bd = ImageDraw.Draw(bloom)
    for x, y, v in grid:
        if not (-30 < x < N + 30 and -30 < y < N + 30):
            continue
        t = (v / peak) ** 0.38
        r = step / 2 * (1.28 * t - 0.12)
        base = 1.7
        d.ellipse([(x - base) * S, (y - base) * S, (x + base) * S, (y + base) * S], fill=(78, 54, 52))
        if r > base + 0.3:
            c = ember(0.2 + 0.8 * t)
            d.ellipse([(x - r) * S, (y - r) * S, (x + r) * S, (y + r) * S], fill=c)
            if t > 0.55:
                rr = r * 2.4
                bd.ellipse([(x - rr) * S, (y - rr) * S, (x + rr) * S, (y + rr) * S], fill=tuple(int(k * 0.55) for k in c))
    bloom = bloom.filter(ImageFilter.GaussianBlur(26 * S))
    img = Image.new("RGB", (N * S, N * S), (6, 5, 8))
    from PIL import ImageChops

    img = ImageChops.add(img, bloom)
    img = ImageChops.add(img, layer)
    d = ImageDraw.Draw(img)
    if ring:
        hx, hy = hot[0] * S, hot[1] * S
        for rad, w, a in ((46, 5, 255), (78, 3, 150)):
            d.ellipse([hx - rad * S, hy - rad * S, hx + rad * S, hy + rad * S], outline=tuple(int(k * a / 255) for k in PAPER), width=w * S)
    if wordmark:
        font = ImageFont.truetype(str(ROOT / "assets/fonts/Archivo-ExpandedBlack.ttf"), 230 * S)
        tw = d.textlength("W", font=font)
        d.text((70 * S, 640 * S), "W", font=font, fill=PAPER)
    out = ROOT / "design/icon-concepts" / f"{name}.png"
    img.resize((N, N), Image.LANCZOS).save(out)
    print("wrote", out.relative_to(ROOT))




def canvas_bg():
    """Near black, with a faint warm lift in the lower middle."""
    img = Image.new("RGB", (N * S, N * S), (7, 5, 8))
    glow = Image.new("RGB", (N * S, N * S), (0, 0, 0))
    ImageDraw.Draw(glow).ellipse([(N * 0.15) * S, (N * 0.35) * S, (N * 0.85) * S, (N * 1.1) * S], fill=(46, 20, 10))
    glow = glow.filter(ImageFilter.GaussianBlur(120 * S))
    from PIL import ImageChops

    return ImageChops.add(img, glow)


def dots(d, bloom_d, grid, peak, step, big=1.0, base=None, clip=None):
    for x, y, v in grid:
        t = (v / peak) ** 0.42
        r = step / 2 * big * (1.18 * t + 0.1)
        c = ember(0.12 + 0.88 * t)
        if clip and not clip(x, y):
            continue
        d.ellipse([(x - r) * S, (y - r) * S, (x + r) * S, (y + r) * S], fill=c)
        if bloom_d is not None and t > 0.6:
            rr = r * 2.2
            bloom_d.ellipse([(x - rr) * S, (y - rr) * S, (x + rr) * S, (y + rr) * S], fill=tuple(int(k * 0.5) for k in c))


def finish(img, name):
    out = ROOT / "design/icon-concepts" / f"{name}.png"
    img.resize((N, N), Image.LANCZOS).save(out)
    print("wrote", out.relative_to(ROOT))


def render_whole(name):
    """C: the whole country as one bold, glowing shape. Big dots, so it survives at 60 px."""
    from PIL import ImageChops

    step = 38
    grid = grid_for(960, N / 2, N / 2 + 10, step)
    peak = max(v for *_, v in grid)
    img = canvas_bg()
    layer = Image.new("RGB", img.size, (0, 0, 0))
    bloom = Image.new("RGB", img.size, (0, 0, 0))
    dots(ImageDraw.Draw(layer), ImageDraw.Draw(bloom), grid, peak, step, big=1.12)
    bloom = bloom.filter(ImageFilter.GaussianBlur(30 * S))
    img = ImageChops.add(ImageChops.add(img, bloom), layer)
    finish(img, name)


def render_pin(name):
    """E: a map pin in flame, the heat map knocked out of it. Reads as 'where you're wanted' from across a room."""
    from PIL import ImageChops

    cx, cy, R = N / 2, 400, 300
    tip = 905
    # Pin silhouette: circle plus a tapered point.
    mask = Image.new("L", (N * S, N * S), 0)
    md = ImageDraw.Draw(mask)
    md.ellipse([(cx - R) * S, (cy - R) * S, (cx + R) * S, (cy + R) * S], fill=255)
    # Tangent points so the taper meets the circle cleanly.
    k = math.acos(R / (tip - cy))
    pa = (cx - R * math.sin(k), cy + R * math.cos(k))
    pb = (cx + R * math.sin(k), cy + R * math.cos(k))
    md.polygon([(pa[0] * S, pa[1] * S), (pb[0] * S, pb[1] * S), (cx * S, tip * S)], fill=255)
    # Flame gradient fill, top amber to bottom red.
    fill = Image.new("RGB", mask.size)
    fd = ImageDraw.Draw(fill)
    for yy in range(N * S):
        t = yy / (N * S)
        fd.line([(0, yy), (N * S, yy)], fill=ember(0.52 + 0.1 * (1 - t)) if False else (round(255 - 70 * t), round(176 - 118 * t), round(26 + 10 * t)))
    img = canvas_bg()
    shadow = mask.filter(ImageFilter.GaussianBlur(40 * S)).point(lambda v: int(v * 0.5))
    glow = Image.new("RGB", img.size, (255, 110, 30))
    img = Image.composite(glow, img, shadow)
    img.paste(fill, (0, 0), mask)
    # The country, knocked out in near-black dots whose size follows the heat.
    step = 24
    grid = grid_for(520, cx, cy + 5, step)
    peak = max(v for *_, v in grid)
    d = ImageDraw.Draw(img)
    for x, y, v in grid:
        t = (v / peak) ** 0.42
        r = step / 2 * (1.1 * t + 0.1)
        d.ellipse([(x - r) * S, (y - r) * S, (x + r) * S, (y + r) * S], fill=(26, 12, 10))
    finish(img, name)


def render_pin_glow(name):
    """F: a dark pin with a flame rim, the heat map glowing inside it. Glows from across a room, reads as a pin and a map."""
    from PIL import ImageChops

    cx, cy, R = N / 2, 400, 300
    tip = 905
    k = math.acos(R / (tip - cy))
    pa = (cx - R * math.sin(k), cy + R * math.cos(k))
    pb = (cx + R * math.sin(k), cy + R * math.cos(k))

    def pin_mask(grow=0):
        m = Image.new("L", (N * S, N * S), 0)
        md = ImageDraw.Draw(m)
        r = R + grow
        md.ellipse([(cx - r) * S, (cy - r) * S, (cx + r) * S, (cy + r) * S], fill=255)
        dx = grow / max(math.cos(k), 0.3)
        md.polygon([((pa[0] - dx) * S, (pa[1]) * S), ((pb[0] + dx) * S, (pb[1]) * S), (cx * S, (tip + grow * 1.4) * S)], fill=255)
        return m

    outer = pin_mask(0)
    inner = pin_mask(-34)
    img = canvas_bg()
    glow = Image.new("RGB", img.size, (255, 110, 30))
    img = Image.composite(glow, img, outer.filter(ImageFilter.GaussianBlur(46 * S)).point(lambda v: int(v * 0.55)))
    rim = Image.new("RGB", img.size)
    rd = ImageDraw.Draw(rim)
    for yy in range(N * S):
        t = yy / (N * S)
        rd.line([(0, yy), (N * S, yy)], fill=(round(255 - 40 * t), round(190 - 110 * t), round(40 - 10 * t)))
    img.paste(rim, (0, 0), outer)
    dark = Image.new("RGB", img.size, (14, 7, 6))
    img.paste(dark, (0, 0), inner)
    step = 20
    grid = grid_for(480, cx, cy - 10, step)
    peak = max(v for *_, v in grid)
    layer = Image.new("RGB", img.size, (0, 0, 0))
    bloom = Image.new("RGB", img.size, (0, 0, 0))
    dots(ImageDraw.Draw(layer), ImageDraw.Draw(bloom), grid, peak, step, big=1.05)
    bloom = bloom.filter(ImageFilter.GaussianBlur(18 * S))
    both = ImageChops.add(bloom, layer)
    img.paste(both, (0, 0), inner)
    finish(img, name)


render_whole("C-whole-country")
render_pin("E-pin")
render_pin_glow("F-pin-glow")

# A strip of all three at home-screen sizes, to judge them from a distance.
strip = Image.new("RGB", (3 * 200 + 4 * 24, 200 + 48), (30, 30, 34))
x = 24
for n in ("C-whole-country", "E-pin", "F-pin-glow"):
    im = Image.open(ROOT / "design/icon-concepts" / f"{n}.png")
    big = im.resize((180, 180), Image.LANCZOS)
    msk = Image.new("L", (180, 180), 0)
    ImageDraw.Draw(msk).rounded_rectangle([0, 0, 179, 179], radius=40, fill=255)
    strip.paste(big, (x + 10, 24), msk)
    sm = im.resize((60, 60), Image.LANCZOS)
    sm_m = Image.new("L", (60, 60), 0)
    ImageDraw.Draw(sm_m).rounded_rectangle([0, 0, 59, 59], radius=14, fill=255)
    x += 224
strip.save(ROOT / "design/icon-concepts/sizes.png")
