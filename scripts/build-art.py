"""Turn the generated art in new-assets-gus/ into the small WebPs the web serves from web/public/art.

Each render is trimmed to its alpha, set on a square canvas, and saved at 512 px (2x the largest
place it shows). Gus's full-body poses share one canvas and one scale, feet on the same line, so
swapping his mood never makes him jump. Run: python3 scripts/build-art.py
"""
import glob
import os
from PIL import Image

SRC = 'new-assets-gus'
OUT = 'web/public/art'
SIZE = 512
os.makedirs(OUT, exist_ok=True)

def trimmed(path):
    im = Image.open(path).convert('RGBA')
    # Ignore near-invisible fringe so the trim hugs the object.
    a = im.getchannel('A').point(lambda v: 255 if v > 12 else 0)
    return im.crop(a.getbbox())

def place(im, side, bottom=False, pad=0.04):
    canvas = Image.new('RGBA', (side, side), (0, 0, 0, 0))
    x = (side - im.width) // 2
    y = side - im.height - int(side * pad) if bottom else (side - im.height) // 2
    canvas.paste(im, (x, y), im)
    return canvas

def save(im, name, size=SIZE):
    im = im.resize((size, size), Image.LANCZOS)
    im.save(f'{OUT}/{name}.webp', 'WEBP', quality=86, method=6)

files = sorted(glob.glob(f'{SRC}/*.png'))
figures = [f for f in files if os.path.basename(f).startswith('gus-') and 'glyph' not in f]
cut = {f: trimmed(f) for f in files}
side = int(max(max(cut[f].size) for f in figures) * 1.06)
for f in files:
    name = os.path.basename(f)[:-4].replace('casette', 'cassette')
    im = cut[f]
    if f in figures:
        save(place(im, side, bottom=True, pad=0.02), name)
    else:
        s = int(max(im.size) * (1.02 if name == 'gus-glyph' else 1.08))
        save(place(im, s, bottom=name.startswith('pin-')), name, 256 if name.startswith('pin-') else SIZE)
print(len(files), 'images ->', OUT)
