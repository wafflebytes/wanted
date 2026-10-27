"""The card a Wanted link shows when it's pasted into a chat: Gus under the lamp with a poster
pinned behind him, and the promise in the house type. Writes web/app/opengraph-image.jpg
(1200 x 630). Fan poster links have their own card (the poster itself); this one is for the
rest of the site. Reads the raw renders in new-assets-gus/ for a sharp Gus, and the fonts
from web/public/fonts. Run: python3 scripts/build-og.py
"""
from PIL import Image, ImageDraw, ImageFilter, ImageFont

W, H = 1200, 630
FONT = 'web/public/fonts/WantedRounded-{}.woff2'
ORANGE, CREAM, DIM = (255, 90, 31), (246, 240, 228), (184, 174, 158)


def trimmed(name):
    im = Image.open(f'new-assets-gus/{name}.png').convert('RGBA')
    return im.crop(im.getchannel('A').point(lambda v: 255 if v > 12 else 0).getbbox())


def fit(im, h):
    return im.resize((round(im.width * h / im.height), h), Image.LANCZOS)


def shadowed(base, im, xy, blur=18, alpha=150, dy=16):
    sh = Image.new('RGBA', base.size, (0, 0, 0, 0))
    sh.paste((12, 6, 0, alpha), (xy[0], xy[1] + dy), im.getchannel('A'))
    base.alpha_composite(sh.filter(ImageFilter.GaussianBlur(blur)))
    base.alpha_composite(im, xy)


# Night on the road, as on Welcome: a warm lamp up and to the right, tarmac below.
card = Image.new('RGBA', (W, H), (14, 13, 11, 255))
lamp = Image.new('L', (W, H), 0)
ImageDraw.Draw(lamp).ellipse([560, -260, 1300, 520], fill=255)
lamp = lamp.filter(ImageFilter.GaussianBlur(150))
card = Image.composite(Image.new('RGBA', (W, H), (92, 52, 24, 255)), card, lamp)
floor = Image.new('L', (W, H), 0)
ImageDraw.Draw(floor).ellipse([-200, 470, 1400, 900], fill=255)
card = Image.composite(Image.new('RGBA', (W, H), (60, 26, 10, 255)), card, floor.filter(ImageFilter.GaussianBlur(120)))

# The poster, pinned and tilted, then Gus in front of it.
poster = fit(trimmed('badge-first-poster'), 330).rotate(8, Image.BICUBIC, expand=True)
shadowed(card, poster, (W - poster.width + 36, 70), blur=14, alpha=120, dy=12)
gus = fit(trimmed('gus-tour-manager'), 560)
pool = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ImageDraw.Draw(pool).ellipse([680, 560, 1020, 618], fill=(0, 0, 0, 170))
card.alpha_composite(pool.filter(ImageFilter.GaussianBlur(16)))
shadowed(card, gus, (845 - gus.width // 2, H - gus.height - 26), blur=20, alpha=140, dy=18)

d = ImageDraw.Draw(card)
x = 72
# The wordmark, small, like a sign over the door.
d.text((x, 62), 'Wanted', font=ImageFont.truetype(FONT.format(900), 40), fill=CREAM)

# The lanyard tag, as on Welcome.
tag = ImageFont.truetype(FONT.format(700), 22)
label = 'Gus, your tour manager'
tw = d.textlength(label, font=tag)
ty = 196
d.rounded_rectangle([x, ty, x + tw + 50, ty + 44], radius=11, fill=ORANGE)
d.rounded_rectangle([x, ty, x + tw + 50, ty + 22], radius=11, fill=(255, 122, 61))
d.rectangle([x, ty + 14, x + tw + 50, ty + 22], fill=(255, 122, 61))
d.ellipse([x + 15, ty + 17, x + 25, ty + 27], fill=(150, 48, 10))
d.text((x + 36, ty + 22), label, font=tag, fill=(255, 255, 255), anchor='lm')

head = ImageFont.truetype(FONT.format(900), 70)
for i, line in enumerate(['Find out where', 'you’re wanted.']):
    d.text((x - 3, 264 + i * 74), line, font=head, fill=CREAM)

body = ImageFont.truetype(FONT.format(600), 27)
for i, line in enumerate(['Fans sign a poster in their city.', 'When enough do, Gus asks venues for a date.']):
    d.text((x, 444 + i * 38), line, font=body, fill=DIM)

card.convert('RGB').save('web/app/opengraph-image.jpg', quality=86, optimize=True, progressive=True)
print('wrote web/app/opengraph-image.jpg')
