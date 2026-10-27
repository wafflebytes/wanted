"""
Builds Wanted Rounded: Nunito (SIL OFL 1.1) re-proportioned to sit as close to SF Pro Rounded
as an open font can, for every device where the real SF Pro Rounded isn't available.

SF Pro Rounded can't be shipped (Apple's licence covers Apple-platform UI only), so the web
uses it through `ui-rounded` / local() and falls back to this. Measured against SF Pro Rounded:

  weight  SF 500/600/700/800/900 -> Nunito 575/675/750/875/975 (matches stem thickness)
  x-height  +8.4% (lowercase zone stretched, ascenders and descenders left where they are)
  space     0.284 em -> 0.194 em (SF's tight word spacing)
  digits    +6.2% wider, drawn from a slightly lighter master so strokes stay even
  capitals  -2.3% narrower

Usage: python3 scripts/build-wanted-rounded.py path/to/Nunito[wght].ttf
Writes web/public/fonts/WantedRounded-<weight>.woff2 and OFL.txt beside them.
"""
import sys
from pathlib import Path
from string import ascii_lowercase, ascii_uppercase, digits

from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.ttGlyphPen import TTGlyphPen
from fontTools.subset import Options, Subsetter
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

SRC = Path(sys.argv[1] if len(sys.argv) > 1 else 'Nunito[wght].ttf')
OUT = Path(__file__).resolve().parent.parent / 'web' / 'public' / 'fonts'

WEIGHTS = {500: 575, 600: 675, 700: 750, 800: 875, 900: 975}
DIGIT_LIGHTEN = 45  # digits come from (wght - 45) so the 6.2% stretch doesn't thicken them
SF = {'x': 0.543, 'space': 0.194}
CAP_SCALE = 0.977
DIGIT_SCALE = 1.062
# Lowercase glyphs whose x-height zone gets stretched (plus common accented forms via decomposition).
LOWER = set(ascii_lowercase) | set('ßæœøåäöüéèêëáàâíìîïóòôúùûñçÿ')


class FnPen:
    """Wraps a pen and maps every point through fn((x, y)) -> (x, y)."""

    def __init__(self, pen, fn):
        self.pen, self.fn = pen, fn

    def moveTo(self, p):
        self.pen.moveTo(self.fn(p))

    def lineTo(self, p):
        self.pen.lineTo(self.fn(p))

    def qCurveTo(self, *ps):
        self.pen.qCurveTo(*[None if p is None else self.fn(p) for p in ps])

    def curveTo(self, *ps):
        self.pen.curveTo(*[self.fn(p) for p in ps])

    def closePath(self):
        self.pen.closePath()

    def endPath(self):
        self.pen.endPath()


def redraw(font, src_glyphset, name, fn):
    """Decompose glyph `name` from src_glyphset, map its points through fn, store as a simple glyph."""
    rec = DecomposingRecordingPen(src_glyphset)
    src_glyphset[name].draw(rec)
    tt = TTGlyphPen(None)
    rec.replay(FnPen(tt, fn))
    font['glyf'][name] = tt.glyph()


def build(weight, nunito_wght):
    font = instantiateVariableFont(TTFont(SRC), {'wght': nunito_wght})
    lighter = instantiateVariableFont(TTFont(SRC), {'wght': nunito_wght - DIGIT_LIGHTEN})
    upm = font['head'].unitsPerEm
    cmap = font.getBestCmap()
    gs = font.getGlyphSet()
    hmtx = font['hmtx']

    x_nu = gs[cmap[ord('x')]]
    from fontTools.pens.boundsPen import BoundsPen

    def top(glyphset, ch):
        p = BoundsPen(glyphset)
        glyphset[cmap[ord(ch)]].draw(p)
        return p.bounds[3]

    x_old = top(gs, 'x')
    asc = top(gs, 'd')
    x_new = SF['x'] * upm

    def stretch_x(p):
        x, y = p
        if 0 <= y <= x_old:
            y = y * x_new / x_old
        elif x_old < y <= asc:
            y = x_new + (y - x_old) * (asc - x_new) / (asc - x_old)
        elif y > asc:  # accents above ascender height ride up with the zone
            y = y + 0  # unchanged: they already clear the stretched x-height
        return (round(x), round(y))

    # Accents sitting just above x-height (é, ü...) move up by the stretch amount.
    def stretch_accented(p):
        x, y = p
        if y > x_old and y < asc + upm * 0.2:
            return (round(x), round(y + (x_new - x_old)))
        return stretch_x(p)

    snapshot = font.getGlyphSet()
    for ch in LOWER:
        if ord(ch) not in cmap:
            continue
        name = cmap[ord(ch)]
        fn = stretch_x if ch in ascii_lowercase else stretch_accented
        # i and j: their dots sit above x-height and should move up with it.
        if ch in 'ij':
            fn = stretch_accented
        redraw(font, snapshot, name, fn)

    for ch in ascii_uppercase:
        name = cmap[ord(ch)]
        adv, lsb = hmtx[name]
        redraw(font, snapshot, name, lambda p: (round(p[0] * CAP_SCALE), round(p[1])))
        hmtx[name] = (round(adv * CAP_SCALE), round(lsb * CAP_SCALE))

    light_gs = lighter.getGlyphSet()
    light_hmtx = lighter['hmtx']
    for ch in digits:
        name = cmap[ord(ch)]
        adv, _ = light_hmtx[name]
        new_adv = round(adv * DIGIT_SCALE)
        redraw(font, light_gs, name, lambda p: (round(p[0] * DIGIT_SCALE), round(p[1])))
        hmtx[name] = (new_adv, hmtx[name][1])

    space = cmap[32]
    hmtx[space] = (round(SF['space'] * upm), 0)

    # Glyph bounds and lsb changed: recompute.
    font['glyf'].glyphs  # ensure loaded
    for name in font.getGlyphOrder():
        g = font['glyf'][name]
        if g.numberOfContours != 0:
            g.recalcBounds(font['glyf'])
            adv, _ = hmtx[name]
            hmtx[name] = (adv, getattr(g, 'xMin', 0))

    # Rename: a derivative must not pose as the original.
    family = 'Wanted Rounded'
    style = {500: 'Medium', 600: 'SemiBold', 700: 'Bold', 800: 'ExtraBold', 900: 'Black'}[weight]
    names = font['name']
    for rec in list(names.names):
        if rec.nameID in (1, 3, 4, 6, 16, 17, 21, 22, 25):
            names.removeNames(nameID=rec.nameID)
    names.setName(family, 1, 3, 1, 0x409)
    names.setName(style, 2, 3, 1, 0x409)
    names.setName(f'{family} {style}; derived from Nunito', 3, 3, 1, 0x409)
    names.setName(f'{family} {style}', 4, 3, 1, 0x409)
    names.setName(f'WantedRounded-{style}', 6, 3, 1, 0x409)
    names.setName(
        'Derived from Nunito (Copyright 2014 The Nunito Project Authors) under the SIL Open Font License 1.1: '
        'x-height, word space, digit and capital proportions adjusted for Wanted.',
        10, 3, 1, 0x409,
    )
    font['OS/2'].usWeightClass = weight
    font['OS/2'].sxHeight = round(x_new)

    # Latin, punctuation, arrows and a few symbols the UI uses.
    opts = Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    sub = Subsetter(opts)
    sub.populate(unicodes=list(range(0x20, 0x7F)) + list(range(0xA0, 0x180)) + [0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2026, 0x2032, 0x2033, 0x20AC, 0x2190, 0x2191, 0x2192, 0x2193, 0x2212, 0x00D7])
    sub.subset(font)
    font.flavor = 'woff2'
    OUT.mkdir(parents=True, exist_ok=True)
    path = OUT / f'WantedRounded-{weight}.woff2'
    font.save(path)
    return path


if __name__ == '__main__':
    for w, nw in WEIGHTS.items():
        print(build(w, nw))
    (OUT / 'WantedRounded-OFL.txt').write_text(
        'Wanted Rounded is a modified version of Nunito.\n'
        'Copyright 2014 The Nunito Project Authors (https://github.com/googlefonts/nunito)\n\n'
        'This Font Software is licensed under the SIL Open Font License, Version 1.1.\n'
        'The full licence text is available at https://openfontlicense.org\n'
    )
