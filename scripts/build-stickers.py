"""
Cuts Gus's die-cut stickers out of assets/source/gus-reference-sheet.png (cream background)
into transparent WebP files in assets/images/stickers/. Each sticker gets a uniform white
die-cut border so Gus can stand free on any surface instead of sitting in a circle.

  python3 scripts/build-stickers.py
"""
from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
SHEET = ROOT / "assets/source/gus-reference-sheet.png"
OUT = ROOT / "assets/images/stickers"

# (name, box on the 1536x1024 sheet)
CROPS = {
    "gus-full": (0, 130, 252, 845),
    "gus-full-3q": (245, 135, 472, 845),
    "gus-reading": (895, 60, 1200, 340),
    "gus-thinking": (1200, 55, 1500, 340),
    "gus-proud": (895, 340, 1290, 645),
    "gus-unimpressed": (1262, 340, 1515, 645),
    "gus-losing-it": (900, 655, 1225, 985),
    "gus-wave": (1212, 680, 1515, 985),
}

CREAM_TOL = 16  # distance from the sheet's cream; the stickers' own white outline sits outside it
BORDER = 7  # die-cut border, in source pixels


def largest_blob(im: Image.Image) -> Image.Image:
    """Mask of the biggest opaque shape, so slivers of neighboring poses on the sheet drop out."""
    w, h = im.size
    a = im.getchannel("A").load()
    label = [0] * (w * h)
    best, best_n, n = 0, 0, 0
    for sy in range(h):
        for sx in range(w):
            if a[sx, sy] == 0 or label[sy * w + sx]:
                continue
            n += 1
            size, q = 0, [(sx, sy)]
            label[sy * w + sx] = n
            while q:
                x, y = q.pop()
                size += 1
                for nx, ny in ((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)):
                    if 0 <= nx < w and 0 <= ny < h and a[nx, ny] and not label[ny * w + nx]:
                        label[ny * w + nx] = n
                        q.append((nx, ny))
            if size > best_n:
                best, best_n = n, size
    mask = Image.new("L", im.size, 0)
    m = mask.load()
    for i, v in enumerate(label):
        if v == best:
            m[i % w, i // w] = 255
    return mask


def cutout(im: Image.Image) -> Image.Image:
    im = im.convert("RGBA")
    w, h = im.size
    px = im.load()
    bg = px[1, 1][:3]
    seen = bytearray(w * h)
    q = deque((x, y) for x in range(w) for y in (0, h - 1))
    q.extend((x, y) for y in range(h) for x in (0, w - 1))
    while q:
        x, y = q.popleft()
        if x < 0 or y < 0 or x >= w or y >= h or seen[y * w + x]:
            continue
        seen[y * w + x] = 1
        r, g, b, _ = px[x, y]
        if abs(r - bg[0]) + abs(g - bg[1]) + abs(b - bg[2]) > CREAM_TOL * 3:
            continue
        px[x, y] = (0, 0, 0, 0)
        q.extend(((x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)))
    alpha = largest_blob(im)
    im.putalpha(Image.composite(im.getchannel("A"), Image.new("L", im.size, 0), alpha))
    # Die-cut border: dilate the silhouette, paint it white under the art.
    grown = alpha.filter(ImageFilter.MaxFilter(BORDER * 2 + 1)).filter(ImageFilter.GaussianBlur(1.2)).point(lambda a: 255 if a > 110 else 0)
    pad = BORDER + 4
    canvas = Image.new("RGBA", (w + pad * 2, h + pad * 2), (0, 0, 0, 0))
    white = Image.new("RGBA", (w, h), (255, 255, 255, 255))
    canvas.paste(white, (pad, pad), grown)
    canvas.alpha_composite(im, (pad, pad))
    return canvas.crop(canvas.getbbox())


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    sheet = Image.open(SHEET)
    for name, box in CROPS.items():
        s = cutout(sheet.crop(box))
        s.save(OUT / f"{name}.webp", "WEBP", quality=92, method=6)
        print(name, s.size)


if __name__ == "__main__":
    main()
