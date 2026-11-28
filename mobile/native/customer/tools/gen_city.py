"""Paints the Home hero city (day + night) in code. Seamless left to right (everything wraps), light from the upper left,
 brick-red / orange / cream / grey towers with ribbed fronts, window frames and glass, balconies, roofs, a wooded mountain
 made of thousands of leaves, trees and a printed-paper grain. Usage: python3 tools/gen_city.py  (writes assets/img/city-*.webp)"""
import math, random
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

S = 2                      # supersample
TW, TH = 1200, 640         # tile size in output pixels
W, H = TW * S, TH * S
rnd = random.Random(11)

def hexc(h, a=255):
    h = h.lstrip('#'); return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)
def mixc(a, b, t): return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3)) + (255,)
def shade(c, t):  # t<0 darker, t>0 lighter
    return mixc(c, (0, 0, 0, 255) if t < 0 else (255, 255, 255, 255), abs(t))

def wrap_draw(fn, x, w):   # draw an object at x and its wrapped copies
    for dx in (-W, 0, W):
        if x + dx + w > 0 and x + dx < W: fn(int(x + dx))

def render(night):
    img = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img, 'RGBA')
    R = random.Random(5)
    DAYW = ['#E0482A', '#D33F25', '#EE7B3C', '#E0482A', '#D9532F', '#E8D9B8', '#BFC4C6', '#EE7B3C', '#A9A196', '#2F383D', '#F0B56A', '#D33F25']
    NIGHTW = ['#0E1C78', '#122796', '#16309F', '#0A1560', '#102384', '#1A2D8F']
    glassd = hexc('#2B4658'); glassn = hexc('#16226E')
    # ---------- mountain (wooded, faceted, wrapped) ----------
    def ridge(x):
        t = x / W * 2 * math.pi
        return 0.19 + 0.09 * math.sin(2 * t + 0.6) + 0.04 * math.sin(5 * t + 1.9) + 0.02 * math.sin(11 * t)
    top = [(x, int(H * ridge(x))) for x in range(0, W + 1, 6)]
    base_c = hexc('#081666') if night else hexc('#2F7468')
    d.polygon(top + [(W, H), (0, H)], fill=base_c)
    leaf = [hexc('#0F3A42'), hexc('#2A6A62'), hexc('#3F8870'), hexc('#5BA583')] if not night else [hexc('#050D3C'), hexc('#0A1A66'), hexc('#102A86'), hexc('#1A3AA6')]
    for _ in range(26000):
        x = R.random() * W; y0 = H * ridge(x)
        y = y0 + R.random() * H * 0.55
        lit = 1 - (y - y0) / (H * 0.55)
        k = min(3, max(0, int((R.random() * 0.55 + lit * 0.5 + 0.05) * 4)))
        r = R.uniform(2.5, 7) * S / 2
        d.ellipse([x - r, y - r * 0.8, x + r, y + r * 0.8], fill=leaf[k])
    # ---------- buildings ----------
    def tower(x, w, hgt, c, layer, kind):
        base = H - 4
        y = base - hgt
        side = int(w * 0.16)
        face = shade(c, 0.0); dark = shade(c, -0.28); lite = shade(c, 0.22)
        def go(xx):
            # front face with vertical light gradient
            for j in range(0, hgt, 6):
                t = j / hgt
                d.rectangle([xx, y + j, xx + w, y + j + 6], fill=mixc(shade(c, 0.12), shade(c, -0.12), t))
            d.rectangle([xx + w, y, xx + w + side, base], fill=dark)                       # side face in shadow
            d.polygon([(xx, y), (xx + w, y), (xx + w + side, y - side * 0.5), (xx + side, y - side * 0.5)], fill=lite)   # roof slab
            d.rectangle([xx, y, xx + 3 * S, base], fill=shade(c, 0.34))                    # lit edge
            d.rectangle([xx, y - 3 * S, xx + w + side, y], fill=shade(c, -0.32))           # parapet shadow
            gap = 15 * S if layer == 2 else 12 * S
            cols = max(2, (w - 8 * S) // gap); rows = (hgt - 10 * S) // gap
            cols = int(cols); rows = int(rows); gap = int(gap); ox = xx + (w - cols * gap) // 2 + 2 * S
            ribbed = kind == 'ribbed'
            for jj in range(rows):
                wy = y + 8 * S + jj * gap
                if jj % 3 == 2: d.rectangle([xx, wy - 3 * S, xx + w, wy - 2 * S + 1], fill=shade(c, -0.3))   # ledge
                if ribbed:
                    d.rectangle([xx + 4 * S, wy, xx + w - 4 * S, wy + gap - 5 * S], fill=hexc('#8FA0A8') if not night else hexc('#22349E'))
                    for q in range(xx + 5 * S, xx + w - 4 * S, 3 * S): d.line([q, wy, q, wy + gap - 5 * S], fill=mixc(hexc('#8FA0A8') if not night else hexc('#22349E'), (255, 255, 255, 255), 0.35), width=1)
                    continue
                for ii in range(cols):
                    wx = ox + ii * gap; ww = gap * 0.55; wh = gap * 0.68
                    d.rectangle([wx - S, wy - S, wx + ww + S, wy + wh + S], fill=shade(c, 0.45) if not night else hexc('#0A1458'))   # frame
                    rl = R.random(); wr = R.random(); lit = night and rl < (0.62 if layer else 0.4)
                    if lit:
                        warm = wr < 0.82
                        d.rectangle([wx, wy, wx + ww, wy + wh], fill=hexc('#FFD66B') if warm else hexc('#9BE0FF'))
                        d.rectangle([wx, wy, wx + ww, wy + wh * 0.35], fill=hexc('#FFEFA8') if warm else hexc('#D5F2FF'))
                    else:
                        g = glassn if night else glassd
                        d.rectangle([wx, wy, wx + ww, wy + wh], fill=g)
                        d.polygon([(wx, wy), (wx + ww, wy), (wx, wy + wh * 0.6)], fill=mixc(g, (255, 255, 255, 255), 0.16 if not night else 0.08))   # sky reflection
                    rb = R.random(); ra = R.random()
                    if layer == 2 and rb < 0.2:   # balcony
                        d.rectangle([wx - 2 * S, wy + wh, wx + ww + 2 * S, wy + wh + 2 * S], fill=shade(c, -0.35))
                        for q in range(int(wx - 2 * S), int(wx + ww + 2 * S), 3 * S): d.line([q, wy + wh - 3 * S, q, wy + wh], fill=shade(c, -0.35), width=1)
                    if layer == 2 and ra < 0.08:
                        d.rectangle([wx + 2 * S, wy + wh + 2 * S, wx + ww - S, wy + wh + 6 * S], fill=hexc('#C9CDD2'))   # AC unit
            if kind == 'crown':
                cw = int(w * 0.6); d.rectangle([xx + (w - cw) // 2, y - 22 * S, xx + (w + cw) // 2, y], fill=shade(c, -0.1)); d.rectangle([xx + (w + cw) // 2, y - 22 * S, xx + (w + cw) // 2 + side // 2, y], fill=dark)
            if kind == 'mast':
                d.line([xx + w // 2, y - 50 * S, xx + w // 2, y], fill=shade(c, -0.4), width=2 * S)
                if night: d.ellipse([xx + w // 2 - 3 * S, y - 53 * S, xx + w // 2 + 3 * S, y - 47 * S], fill=hexc('#FF4D4D'))
            if night and kind == 'neon':
                d.rectangle([xx + w - 3 * S, y + 6 * S, xx + w - 1 * S, base], fill=hexc('#7FD2FF'))
        wrap_draw(go, x, w + side)
    layers = [(0, 40, 64, 0.34, 0.78, 0.3), (1, 56, 92, 0.3, 0.68, 0.05), (2, 70, 120, 0.14, 0.36, 0.0)]
    for li, mnw, mxw, mnh, mxh, haze in layers:
        x = R.uniform(-30, 0) * S
        n = 0
        while x < W - 30 * S:
            w = int(R.uniform(mnw, mxw) * S); hgt = int(H * R.uniform(mnh, mxh))
            raw = R.choice(NIGHTW if night else DAYW)
            c = hexc(raw)
            if haze: c = mixc(c, (255, 244, 230, 255) if not night else (10, 20, 100, 255), haze)
            kind = R.choice(['plain', 'plain', 'crown', 'mast', 'ribbed', 'neon'])
            if raw in ('#2F383D',) and not night: kind = 'ribbed'
            tower(x, w, hgt, c, li, kind)
            x += w + R.choice([0, 0, 4 * S, 10 * S])
            n += 1
        if li == 0:   # a wooded band between the far and middle rows
            for _ in range(40):
                cx = R.random() * W; cy = H - R.uniform(0.18, 0.3) * H; rr = R.uniform(18, 40) * S
                for _ in range(int(rr)):
                    a_ = R.random() * 6.283; rad = rr * math.sqrt(R.random()); x_ = cx + math.cos(a_) * rad; y_ = cy - abs(math.sin(a_)) * rad * 0.8
                    cc = R.choice([hexc('#3D7A3A'), hexc('#5E9441'), hexc('#2F6B2F')]) if not night else R.choice([hexc('#082C36'), hexc('#0C3F48')])
                    r_ = R.uniform(3, 6) * S
                    for dx in (-W, 0, W): d.ellipse([x_ + dx - r_, y_ - r_ * 0.8, x_ + dx + r_, y_ + r_ * 0.8], fill=cc)
    # ---------- trees ----------
    tg = [hexc('#2F6B2F'), hexc('#4E8A35'), hexc('#78A843'), hexc('#A5C65A')] if not night else [hexc('#06303A'), hexc('#0A4A50'), hexc('#10636A'), hexc('#1B7E80')]
    for _ in range(54):
        cx = R.random() * W; cy = H - R.uniform(0, 70) * S; rr = R.uniform(24, 58) * S
        for _ in range(int(rr * 1.4)):
            a = R.random() * 6.283; rad = rr * math.sqrt(R.random()); x = cx + math.cos(a) * rad; y = cy - abs(math.sin(a)) * rad * 0.9
            lit = 0.5 + (-(x - cx) / rr) * 0.25 + (-(y - cy) / rr) * 0.3
            k = min(3, max(0, int(lit * 4 + R.uniform(-0.8, 0.8))))
            r = R.uniform(3, 7) * S
            for dx in (-W, 0, W): d.ellipse([x + dx - r, y - r * 0.8, x + dx + r, y + r * 0.8], fill=tg[k])
    # ---------- night bloom ----------
    out = img
    if night:
        a = np.array(img).astype(float)
        warm = ((a[..., 0] > 240) & (a[..., 1] > 190) & (a[..., 2] < 140) & (a[..., 3] > 0)).astype(float)
        glow = Image.fromarray((warm * 255).astype('uint8')).filter(ImageFilter.GaussianBlur(10 * S))
        g = np.array(glow).astype(float) / 255
        for c, v in enumerate((255, 190, 90)): a[..., c] = np.clip(a[..., c] * (1 - g * 0.6) + v * g * 0.6, 0, 255)
        a[..., 3] = np.maximum(a[..., 3], g * 160)
        out = Image.fromarray(a.astype('uint8'), 'RGBA')
    # ---------- atmosphere + paper grain ----------
    a = np.array(out).astype(float)
    yy = np.linspace(0, 1, H)[:, None]
    tint = np.array([255, 214, 150] if not night else [80, 110, 255], float)
    occl = np.clip((yy - 0.72) / 0.28, 0, 1) * 0.22
    for c in range(3): a[..., c] = a[..., c] * (1 - occl)
    top_light = np.clip(1 - yy * 2.2, 0, 1) * (0.2 if not night else 0.12)
    for c in range(3): a[..., c] = a[..., c] * (1 - top_light) + tint[c] * top_light
    rs = np.random.RandomState(3)
    grain = rs.normal(0, 7, (H, W))
    for c in range(3): a[..., c] = np.clip(a[..., c] + grain, 0, 255)
    out = Image.fromarray(a.astype('uint8'), 'RGBA').resize((TW, TH), Image.LANCZOS)
    return out

for night in (False, True):
    im = render(night)
    if night:   # fade the top so it melts into the dark sky
        a = np.array(im); f = np.clip(np.arange(TH) / (TH * 0.22), 0, 1)[:, None]; a[..., 3] = (a[..., 3] * f).astype('uint8'); im = Image.fromarray(a, 'RGBA')
    im.save(f"assets/img/city-{'night' if night else 'day'}.webp", quality=82, method=6)
    print('wrote', night)
