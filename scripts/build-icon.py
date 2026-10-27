"""App icon from Gus's face: his glyph on marquee orange, lit from the top like everything else.
Writes web/app/icon.png (512), web/app/apple-icon.png (180) and web/app/favicon.ico.
Run after scripts/build-art.py: python3 scripts/build-icon.py [out-dir-for-previews]
"""
import sys
from PIL import Image, ImageDraw, ImageFilter

N = 1024

def ground(top, bottom, glow):
    g = Image.new('RGB', (N, N), bottom)
    d = ImageDraw.Draw(g)
    for y in range(N):
        t = y / N
        d.line([(0, y), (N, y)], fill=tuple(int(top[i] + (bottom[i] - top[i]) * t) for i in range(3)))
    lamp = Image.new('L', (N, N), 0)
    ImageDraw.Draw(lamp).ellipse([N * 0.05, -N * 0.05, N * 0.95, N * 0.75], fill=255)
    lamp = lamp.filter(ImageFilter.GaussianBlur(N * 0.16))
    return Image.composite(Image.new('RGB', (N, N), glow), g, lamp.point(lambda v: int(v * 0.55)))

def icon(bg, face_scale=0.8, drop=0.03):
    base = bg.convert('RGBA')
    face = Image.open('web/public/art/gus-glyph.webp').convert('RGBA')
    w = int(N * face_scale)
    face = face.resize((w, w), Image.LANCZOS)
    x, y = (N - w) // 2, (N - w) // 2 + int(N * drop)
    shadow = Image.new('RGBA', (N, N), (0, 0, 0, 0))
    shadow.paste((20, 10, 0, 150), (x, y + int(N * 0.03)), face.getchannel('A'))
    base.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(N * 0.025)))
    base.alpha_composite(face, (x, y))
    return base.convert('RGB')

ORANGE = ((255, 140, 80), (255, 90, 31), (255, 190, 140))
app = icon(ground(*ORANGE))
app.resize((512, 512), Image.LANCZOS).save('web/app/icon.png', optimize=True)
app.resize((180, 180), Image.LANCZOS).save('web/app/apple-icon.png', optimize=True)
# A tab is tiny: the face alone, bigger, reads better than the full composition.
small = icon(ground(*ORANGE), face_scale=0.98, drop=0.0).convert('RGBA')
small.save('web/app/favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
if len(sys.argv) > 1:
    out = sys.argv[1]
    icon(ground((52, 36, 24), (14, 13, 11), (196, 108, 46))).save(f'{out}/icon-app.png')
    icon(ground((250, 247, 240), (232, 224, 208), (255, 230, 200))).save(f'{out}/icon-cream.png')
