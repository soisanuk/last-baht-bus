#!/usr/bin/env python3
"""Generate pixel-art NPC/patron portraits for The Last Baht Bus.

Parametric 24x24 bust portraits: every face is composed from the same part
library (head, hair style, shirt, accessories) so the whole cast shares one
style. Character specs live in CHARS below, derived from the canon `desc`
fields in web/js/world.js. Pure stdlib (zlib/struct PNG writer, same pattern
as the favicon). Output: web/portraits/<id>.png at 96x96 (24 grid x4).

Usage: python3 scripts/gen-portraits.py [--sheet /path/contact-sheet.png]
"""
import struct, zlib, os, sys

W = H = 24
SCALE = 4

def C(v):
    return ((v >> 16) & 255, (v >> 8) & 255, v & 255)

def dim(col, f):
    return tuple(max(0, min(255, int(c * f))) for c in col)

# ---- palette -------------------------------------------------------------
# skins
PALE   = C(0xf0c8a8)   # fresh-off-the-plane farang
TAN    = C(0xd8a878)   # settled farang
RED    = C(0xe07858)   # sunburn (Terry, Chuck, Nigel)
DEEP   = C(0xb8845c)   # sun-cured (Gary, Reginald)
THAI   = C(0xc89058)
THAI2  = C(0xb07a48)   # darker / upcountry

# hair
BLACK  = C(0x1a1420)
DKBRN  = C(0x4a3020)
BROWN  = C(0x6e4a28)
BLOND  = C(0xd8b860)
GREY   = C(0x9a9aa8)
SILVER = C(0xc8c8d8)
GRBLK  = C(0x50485a)   # grey-streaked black

# shirts & misc
WHITE  = C(0xe8e8f0)
GOLD   = C(0xffd700)
PINKN  = C(0xff1493)   # neon pink (canon)
CYAN   = C(0x00e5ff)
YELN   = C(0xffe600)

# backgrounds (by where the character lives)
BG_STREET = C(0x0a0a1e)
BG_GOGO   = C(0x2a0433)
BG_BAR    = C(0x241203)
BG_BEACH  = C(0x14204a)

# ---- canvas helpers ------------------------------------------------------
def canvas(bg):
    return [[bg] * W for _ in range(H)]

def px(c, x, y, col):
    if 0 <= x < W and 0 <= y < H:
        c[y][x] = col

def rect(c, x0, y0, x1, y1, col):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            px(c, x, y, col)

# ---- parts ---------------------------------------------------------------
def draw_shirt(c, s):
    col = s["shirt"]
    rect(c, 9, 17, 14, 17, col)
    rect(c, 7, 18, 16, 18, col)
    rect(c, 5, 19, 18, 19, col)
    rect(c, 4, 20, 19, 23, col)
    if s.get("collar"):
        cc = dim(col, 0.7)
        px(c, 9, 17, cc); px(c, 14, 17, cc)
        px(c, 8, 18, cc); px(c, 15, 18, cc)
    if s.get("tank"):
        # bare shoulders: strap-only top exposes the arms
        sk = s["skin"]
        rect(c, 4, 19, 7, 23, sk); rect(c, 16, 19, 19, 23, sk)
        rect(c, 5, 19, 5, 23, dim(sk, 0.85))
        rect(c, 18, 19, 18, 23, dim(sk, 0.85))
    if s.get("vest"):
        vc = s["vest"]
        rect(c, 5, 19, 8, 23, vc); rect(c, 15, 19, 18, 23, vc)
        rect(c, 7, 18, 8, 18, vc); rect(c, 15, 18, 16, 18, vc)
    if s.get("stripes"):  # fake Barça shirt
        a, b = s["stripes"]
        for x in range(4, 20):
            col2 = a if (x // 2) % 2 == 0 else b
            for y in range(19, 24):
                if c[y][x] == s["shirt"] or c[y][x] in (a, b):
                    px(c, x, y, col2)
        rect(c, 9, 17, 14, 17, a); rect(c, 7, 18, 16, 18, a)
    if s.get("check"):  # flannel
        dk = dim(s["shirt"], 0.6)
        for y in range(18, 24):
            for x in range(4, 20):
                if c[y][x] == s["shirt"] and (x % 3 == 0 or y % 3 == 0):
                    px(c, x, y, dk)

def draw_head(c, s):
    sk = s["skin"]
    rect(c, 10, 15, 13, 17, dim(sk, 0.85))       # neck
    rect(c, 8, 5, 15, 14, sk)                    # face block
    rect(c, 9, 4, 14, 4, sk)                     # crown
    rect(c, 9, 15, 14, 15, sk)                   # chin
    rect(c, 10, 16, 13, 16, sk)
    px(c, 7, 9, sk); px(c, 7, 10, sk); px(c, 7, 11, sk)   # ears
    px(c, 16, 9, sk); px(c, 16, 10, sk); px(c, 16, 11, sk)

def hair_back(c, s):
    hc = s["hc"]; style = s["hair"]
    if style in ("long", "sleek"):
        rect(c, 5, 7, 6, 18, hc); rect(c, 17, 7, 18, 18, hc)
        rect(c, 6, 17, 8, 19, hc); rect(c, 15, 17, 17, 19, hc)
    elif style == "bob":
        rect(c, 6, 7, 6, 13, hc); rect(c, 17, 7, 17, 13, hc)
        px(c, 7, 13, hc); px(c, 16, 13, hc)
    elif style == "ponytail":
        rect(c, 17, 6, 18, 14, hc)
        px(c, 18, 15, hc)
    elif style == "pigtails":
        rect(c, 4, 7, 5, 11, hc); rect(c, 18, 7, 19, 11, hc)

def hair_front(c, s):
    hc = s["hc"]; style = s["hair"]
    def top(y0=3):
        rect(c, 9, y0, 14, y0, hc)
        rect(c, 8, y0 + 1, 15, y0 + 1, hc)
        rect(c, 8, y0 + 2, 15, y0 + 2, hc)
    def temples(depth=7):
        rect(c, 8, 6, 8, depth, hc); rect(c, 15, 6, 15, depth, hc)
    if style == "bald":
        return
    if style == "buzz":
        rect(c, 9, 4, 14, 4, hc); rect(c, 8, 5, 15, 5, hc)
        temples(6)
    elif style in ("short", "slick"):
        top(); temples()
        if style == "slick":
            px(c, 10, 3, dim(hc, 1.6))
    elif style == "messy":
        top()
        for x in (8, 10, 12, 14):
            px(c, x, 2, hc)
        temples()
    elif style == "spiky":
        top(4)
        for x in (8, 10, 12, 14):
            px(c, x, 3, hc); px(c, x, 2, hc)
        temples()
    elif style == "cropped":
        top(); temples(6)
    elif style == "combover":
        rect(c, 8, 4, 13, 4, hc)
        px(c, 8, 5, hc); px(c, 9, 5, hc)
        rect(c, 8, 6, 8, 9, hc); rect(c, 15, 6, 15, 9, hc)
    elif style == "balding":
        px(c, 8, 5, hc); px(c, 15, 5, hc)
        rect(c, 8, 6, 8, 10, hc); rect(c, 15, 6, 15, 10, hc)
    elif style in ("long", "sleek", "bob", "ponytail", "pigtails"):
        top(); temples(9 if style != "ponytail" else 7)
        if style == "sleek":
            px(c, 11, 3, dim(hc, 1.5))
    elif style == "bun":
        top(); temples(8)
        rect(c, 10, 1, 13, 2, hc)
    elif style == "chignon":
        top(); temples(8)
        rect(c, 15, 2, 18, 4, hc)

def draw_face(c, s):
    sk = s["skin"]; hc = s["hc"]
    eye = C(0x201828)
    brow = dim(hc if s["hair"] != "bald" else sk, 0.6)
    px(c, 9, 8, brow); px(c, 10, 8, brow)
    px(c, 13, 8, brow); px(c, 14, 8, brow)
    px(c, 9, 9, eye); px(c, 10, 9, WHITE)
    px(c, 14, 9, eye); px(c, 13, 9, WHITE)
    px(c, 11, 11, dim(sk, 0.75)); px(c, 12, 11, dim(sk, 0.8))  # nose
    mouth = s.get("mouthc", dim(sk, 0.55))
    m = s.get("mouth", "smile")
    if m == "smile":
        rect(c, 10, 13, 13, 13, mouth)
        px(c, 9, 12, mouth); px(c, 14, 12, mouth)
    elif m == "grin":
        rect(c, 10, 13, 13, 13, WHITE)
        px(c, 9, 12, mouth); px(c, 14, 12, mouth)
        rect(c, 10, 14, 13, 14, mouth)
    elif m == "neutral":
        rect(c, 10, 13, 13, 13, mouth)
    elif m == "stern":
        rect(c, 10, 13, 12, 13, mouth)
        px(c, 13, 13, dim(mouth, 0.8))
    if s.get("blush"):
        px(c, 8, 11, dim(sk, 1.12)); px(c, 15, 11, dim(sk, 1.12))

def draw_acc(c, s):
    sk = s["skin"]
    for a in s.get("acc", []):
        if a == "glasses":
            fr = s.get("framec", C(0x303040))
            for ex in (9, 13):
                px(c, ex - 1, 9, fr); px(c, ex + 2, 9, fr)
                px(c, ex, 10, fr); px(c, ex + 1, 10, fr)
            px(c, 11, 9, fr); px(c, 12, 9, fr)
        elif a == "sunglasses":
            dkc = C(0x101018)
            rect(c, 8, 8, 11, 9, dkc); rect(c, 12, 8, 15, 9, dkc)
        elif a == "cap":
            cc = s.get("capc", C(0xcc2222))
            rect(c, 9, 2, 14, 2, cc); rect(c, 8, 3, 15, 4, cc)
            rect(c, 7, 5, 16, 5, dim(cc, 0.7))
        elif a == "headphones":
            bnd = C(0x202030)
            rect(c, 9, 2, 14, 2, bnd)
            rect(c, 6, 8, 7, 11, bnd); rect(c, 16, 8, 17, 11, bnd)
        elif a == "headset":
            bnd = C(0x202030)
            rect(c, 9, 3, 14, 3, bnd)
            rect(c, 16, 9, 17, 11, bnd)
            px(c, 16, 13, bnd); px(c, 15, 14, bnd)
        elif a == "earpiece":
            px(c, 16, 10, C(0x101018)); px(c, 17, 11, C(0x101018))
        elif a == "earrings":
            px(c, 7, 12, s.get("earc", GOLD)); px(c, 16, 12, s.get("earc", GOLD))
        elif a == "nosering":
            px(c, 12, 12, SILVER)
        elif a == "cig":
            rect(c, 14, 13, 16, 13, WHITE); px(c, 17, 13, C(0xff6a00))
        elif a == "mustache":
            mc = dim(s["hc"], 0.8)
            rect(c, 10, 12, 13, 12, mc)
        elif a == "beard":
            bc = dim(s["hc"], 0.9)
            rect(c, 9, 13, 9, 15, bc); rect(c, 14, 13, 14, 15, bc)
            rect(c, 10, 14, 13, 15, bc); rect(c, 10, 16, 13, 16, bc)
        elif a == "stubble":
            st = dim(sk, 0.8)
            for x, y in ((9, 14), (11, 15), (13, 14), (10, 14), (12, 15)):
                px(c, x, y, st)
        elif a == "chain":
            rect(c, 10, 18, 13, 18, GOLD); px(c, 11, 19, GOLD); px(c, 12, 19, GOLD)
        elif a == "ringchain":
            ch = SILVER
            rect(c, 10, 18, 13, 18, ch); px(c, 11, 19, ch)
            px(c, 12, 19, GOLD)  # the engagement ring
        elif a == "lanyard":
            lc = YELN
            rect(c, 10, 18, 10, 20, lc); rect(c, 13, 18, 13, 20, lc)
            rect(c, 11, 21, 12, 22, WHITE)
        elif a == "glasschain":
            px(c, 7, 13, GOLD); px(c, 6, 14, GOLD)
            px(c, 16, 13, GOLD); px(c, 17, 14, GOLD)
        elif a == "towel":
            rect(c, 14, 17, 17, 20, WHITE)
            rect(c, 14, 19, 17, 19, dim(WHITE, 0.85))
        elif a == "slogo":
            px(c, 11, 19, YELN); px(c, 12, 19, YELN)
            px(c, 10, 20, YELN); px(c, 13, 20, YELN)
            px(c, 11, 20, C(0xcc2222)); px(c, 12, 20, C(0xcc2222))
            px(c, 11, 21, YELN); px(c, 12, 21, YELN)
        elif a == "tattoos":
            ink = C(0x2a5a6a)
            for x, y in ((5, 20), (6, 21), (5, 22), (17, 20), (18, 21), (18, 22), (6, 23)):
                px(c, x, y, ink)
        elif a == "necktattoo":
            px(c, 13, 16, C(0x2a5a6a))
        elif a == "flower":
            px(c, 15, 4, PINKN); px(c, 16, 4, YELN); px(c, 16, 3, PINKN)
        elif a == "bracelets":
            for i, col in enumerate((PINKN, CYAN, YELN, C(0x44dd66))):
                px(c, 4 + (i % 2), 20 + i, col)
                px(c, 18 + (i % 2) - 1, 20 + i, col)
        elif a == "sweatband":
            rect(c, 8, 5, 15, 5, s.get("bandc", CYAN))
        elif a == "logo":
            rect(c, 6, 20, 7, 21, s.get("logoc", WHITE))

def draw(s):
    c = canvas(s.get("bg", BG_STREET))
    draw_shirt(c, s)
    hair_back(c, s)
    draw_head(c, s)
    hair_front(c, s)
    draw_face(c, s)
    draw_acc(c, s)
    return c

# ---- cast ----------------------------------------------------------------
LIP = C(0xd8384a)
def lady(**kw):
    base = dict(mouth="smile", mouthc=LIP, acc=["earrings"], bg=BG_GOGO)
    base.update(kw)
    return base

CHARS = {
    # --- NPCs ---
    "nok":      lady(skin=THAI2, hair="bun", hc=GRBLK, shirt=C(0x2e7d6e), bg=BG_BEACH,
                     mouth="neutral", mouthc=dim(THAI2, 0.55)),
    "bank":     dict(skin=THAI2, hair="short", hc=BLACK, shirt=C(0x303040),
                     vest=C(0xff7a00), mouth="neutral", bg=BG_STREET),
    "candy":    lady(skin=THAI, hair="long", hc=BLACK, shirt=C(0xe86a9a), bg=BG_BAR,
                     acc=["earrings", "chain"]),
    "lek":      lady(skin=THAI, hair="ponytail", hc=BLACK, shirt=C(0xd028b0),
                     bg=BG_BAR, mouth="grin", earc=CYAN),
    "noi":      lady(skin=THAI, hair="long", hc=BLACK, shirt=C(0x7a3ad0), bg=BG_BAR),
    "ping":     lady(skin=THAI, hair="bob", hc=BLACK, shirt=CYAN, mouth="grin"),
    "aek":      dict(skin=THAI, hair="cropped", hc=BLACK, shirt=C(0x1e2a5a), collar=True,
                     mouth="neutral", mouthc=LIP, acc=["nosering"], bg=BG_BAR),
    "aom":      lady(skin=THAI, hair="sleek", hc=BLACK, shirt=C(0x8a1030),
                     mouth="neutral"),
    "joy":      lady(skin=THAI, hair="pigtails", hc=BLACK, shirt=YELN, bg=BG_BAR,
                     mouth="grin", blush=True),
    "fon":      lady(skin=THAI, hair="bob", hc=DKBRN, shirt=C(0x3a8a4a), bg=BG_BAR,
                     acc=["earrings", "flower"], blush=True),
    "gift":     lady(skin=THAI, hair="sleek", hc=BLACK, shirt=WHITE),
    "kwan":     lady(skin=THAI, hair="long", hc=DKBRN, shirt=C(0xb090e0), bg=BG_BAR),
    "terry":    dict(skin=RED, hair="bald", hc=GREY, shirt=C(0x2f6b2f),
                     vest=C(0x1e4a1e), mouth="grin", acc=["stubble"], bg=BG_BAR),
    "malee":    dict(skin=THAI, hair="cropped", hc=BLACK, shirt=C(0x181820), collar=True,
                     mouth="neutral", mouthc=LIP, acc=["lanyard"], bg=BG_GOGO),
    "wan":      lady(skin=THAI, hair="bun", hc=GRBLK, shirt=C(0x303048),
                     mouth="stern", acc=["earrings", "headset"]),
    "jane":     lady(skin=THAI, hair="long", hc=BLACK, shirt=C(0xd02040)),
    "nong":     lady(skin=THAI, hair="ponytail", hc=BLACK, shirt=C(0xf090c0),
                     mouth="neutral", blush=True),
    "pim":      lady(skin=THAI, hair="bob", hc=BLACK, shirt=C(0xe07820)),
    "mercedes": lady(skin=THAI, hair="sleek", hc=BLACK, shirt=C(0x8894a8), bg=BG_BAR,
                     mouth="neutral", acc=["earrings"]),
    "nira":     lady(skin=THAI, hair="sleek", hc=BLACK, shirt=C(0x6a2a8a), bg=BG_GOGO,
                     mouth="neutral", acc=["earrings", "chain"], earc=GOLD),
    "rose":     lady(skin=THAI, hair="chignon", hc=BLACK, shirt=C(0x5a1030), bg=BG_BAR,
                     mouth="neutral", acc=["earrings", "chain"], earc=GOLD),
    "pear":     lady(skin=THAI, hair="long", hc=BLACK, shirt=C(0x8a2a5a), bg=BG_BAR,
                     mouth="smile", acc=["earrings"]),
    "jinda":    lady(skin=THAI, hair="sleek", hc=BLACK, shirt=C(0x3a2a6a), bg=BG_BAR,
                     mouth="smile", acc=["earrings"]),
    "kanya":    lady(skin=THAI, hair="bun", hc=BLACK, shirt=C(0x1a1a24), collar=True,
                     bg=BG_BAR, mouth="neutral", acc=["earrings"]),
    "ploy":     lady(skin=THAI, hair="bun", hc=BLACK, shirt=C(0x181820),
                     acc=["earrings", "ringchain"], mouth="neutral"),
    "dj_beer":  dict(skin=THAI, hair="short", hc=BLACK, shirt=C(0x202030),
                     acc=["headphones"], mouth="grin", bg=BG_GOGO,
                     logoc=C(0xdd3333)),
    "security": dict(skin=THAI2, hair="buzz", hc=BLACK, shirt=C(0x101018),
                     mouth="stern", acc=["earpiece", "sunglasses"], bg=BG_GOGO),
    "oy":       lady(skin=THAI, hair="chignon", hc=BLACK, shirt=C(0x6a0a20),
                     mouth="stern", acc=["earrings", "chain"]),
    "daeng":    lady(skin=THAI, hair="bob", hc=GRBLK, shirt=C(0x2e7d6e), bg=BG_BAR,
                     acc=["earrings", "towel"]),
    "somchith": dict(skin=THAI2, hair="short", hc=GREY, shirt=C(0x6a4a2a),
                     mouth="smile", bg=BG_STREET),
    "bert":     dict(skin=TAN, hair="balding", hc=GREY, shirt=C(0x2a4a8a), collar=True,
                     mouth="smile", acc=["mustache"], bg=BG_BAR),
    "phil":     dict(skin=PALE, hair="combover", hc=C(0x7a6a58), shirt=C(0xd8d8e0),
                     vest=C(0x707888), mouth="neutral", bg=BG_BAR),
    "nit":      lady(skin=THAI2, hair="ponytail", hc=BLACK, shirt=C(0x3a6ac0),
                     bg=BG_STREET, mouth="smile"),
    "bee":      lady(skin=THAI, hair="ponytail", hc=BLACK, shirt=C(0xe86a9a),
                     bg=BG_BAR, mouth="grin"),
    "mem":      lady(skin=THAI, hair="chignon", hc=SILVER, shirt=C(0x4a2a6a),
                     acc=["earrings", "glasses", "glasschain"], framec=GOLD),
    "gary":     dict(skin=DEEP, hair="balding", hc=SILVER, shirt=C(0x2f8a5a), collar=True,
                     mouth="smile", acc=["sunglasses"], bg=BG_BEACH),
    "mot":      dict(skin=THAI2, hair="spiky", hc=BLACK, shirt=C(0x1a3a8a),
                     stripes=(C(0x1a3a8a), C(0xa01830)), mouth="grin", bg=BG_STREET),
    # --- masseuses ---
    "pensri":   lady(skin=THAI2, hair="bun", hc=GRBLK, shirt=C(0x2e7d6e), collar=True,
                     mouth="smile", acc=["glasses", "glasschain", "earrings"], bg=BG_STREET),
    "waan":     lady(skin=THAI, hair="long", hc=BLACK, shirt=C(0xff9ec4), bg=BG_BAR,
                     mouth="grin", blush=True, acc=["earrings"]),
    "toom":     lady(skin=THAI2, hair="bob", hc=BLACK, shirt=C(0x2a5aa0), bg=BG_BAR,
                     mouth="neutral", acc=["earrings"]),
    "kesorn":   lady(skin=THAI, hair="chignon", hc=SILVER, shirt=C(0xffcf40), bg=BG_BAR,
                     mouth="neutral", acc=["earrings", "chain"], earc=GOLD),
    "lawan":    lady(skin=THAI, hair="chignon", hc=BLACK, shirt=C(0x1a3a2e), bg=BG_BAR,
                     mouth="neutral", acc=["earrings", "chain", "bracelets"], earc=GOLD),
    "sumalee":  lady(skin=THAI2, hair="bun", hc=SILVER, shirt=C(0x2e7d6e), bg=BG_BEACH,
                     mouth="smile", acc=["earrings", "glasses", "glasschain"], earc=GOLD, framec=GOLD),
    "diamond":  lady(skin=THAI, hair="sleek", hc=BLACK, shirt=C(0xd0d0e0), bg=BG_GOGO,
                     mouth="neutral", acc=["earrings", "chain", "bracelets"], earc=CYAN),
    "wimon":    lady(skin=THAI, hair="bob", hc=GRBLK, shirt=C(0x8a1030), bg=BG_BAR,
                     mouth="neutral", acc=["earrings", "chain"], earc=GOLD),
    "ampai":    lady(skin=THAI, hair="chignon", hc=BLACK, shirt=C(0x5a1030), bg=BG_BAR,
                     mouth="neutral", acc=["earrings", "chain"], earc=GOLD),
    # --- filler hostesses (generic Isan girls; procedurally varied) ---
    "dao":      lady(skin=THAI, hair="ponytail", hc=DKBRN, shirt=C(0xf05a30), bg=BG_GOGO, mouth="grin", acc=["earrings", "chain"], earc=YELN),
    "mook":     lady(skin=THAI, hair="sleek", hc=DKBRN, shirt=C(0x00e5ff), bg=BG_GOGO, mouth="grin", acc=["earrings", "chain"], earc=PINKN),
    "ice":      lady(skin=THAI, hair="pigtails", hc=BLACK, shirt=C(0xb090e0), bg=BG_GOGO, mouth="neutral", acc=["earrings"], earc=CYAN),
    "praew":    lady(skin=THAI, hair="pigtails", hc=BLACK, shirt=C(0xe86a9a), bg=BG_GOGO, mouth="grin", acc=["earrings", "nosering"], earc=GOLD),
    "mint":     lady(skin=THAI, hair="long", hc=DKBRN, shirt=C(0xe86a9a), bg=BG_GOGO, mouth="smile", acc=["earrings", "flower"], earc=CYAN),
    "fah":      lady(skin=THAI, hair="long", hc=BLACK, shirt=C(0xffe600), bg=BG_GOGO, mouth="grin", acc=["earrings", "nosering"], earc=YELN),
    "view":     lady(skin=THAI, hair="long", hc=DKBRN, shirt=C(0xe07820), bg=BG_GOGO, mouth="grin", acc=["earrings", "chain"], earc=PINKN),
    "sara":     lady(skin=THAI, hair="bob", hc=BLACK, shirt=C(0xf05a30), bg=BG_GOGO, mouth="grin", acc=["earrings", "nosering"], earc=YELN),
    "bow":      lady(skin=THAI, hair="ponytail", hc=GRBLK, shirt=C(0xd02040), bg=BG_GOGO, mouth="smile", acc=["earrings", "flower", "chain"], earc=YELN),
    "nam":      lady(skin=THAI, hair="sleek", hc=BLACK, shirt=C(0x40c060), bg=BG_GOGO, mouth="smile", acc=["earrings", "nosering", "chain"], earc=YELN),
    "yui":      lady(skin=THAI, hair="bob", hc=BLACK, shirt=C(0xd02040), bg=BG_GOGO, mouth="smile", acc=["earrings"], earc=CYAN, blush=True),
    "aof":      lady(skin=THAI, hair="sleek", hc=BLACK, shirt=C(0x2e7d6e), bg=BG_GOGO, mouth="smile", acc=["earrings"], earc=YELN, blush=True),
    "cherry":   lady(skin=THAI, hair="bob", hc=DKBRN, shirt=C(0xb090e0), bg=BG_GOGO, mouth="smile", acc=["earrings"], earc=GOLD),
    "beam":     lady(skin=THAI, hair="long", hc=DKBRN, shirt=C(0x2e7d6e), bg=BG_GOGO, mouth="neutral", acc=["earrings", "bracelets"], earc=GOLD),
    "boom":     lady(skin=THAI, hair="pigtails", hc=GRBLK, shirt=C(0x5a6ad0), bg=BG_GOGO, mouth="smile", acc=["earrings", "chain"], earc=PINKN),
    "toey":     lady(skin=THAI, hair="bob", hc=DKBRN, shirt=C(0xffe600), bg=BG_GOGO, mouth="smile", acc=["earrings", "bracelets"], earc=GOLD),
    "pang":     lady(skin=THAI2, hair="long", hc=BLACK, shirt=C(0xcf30a0), bg=BG_GOGO, mouth="neutral", acc=["earrings", "flower", "chain"], earc=YELN),
    "ploen":    lady(skin=THAI, hair="long", hc=BLACK, shirt=C(0x2e7d6e), bg=BG_GOGO, mouth="smile", acc=["earrings", "chain"], earc=GOLD),
    "sai":      lady(skin=THAI, hair="long", hc=BLACK, shirt=C(0xd02040), bg=BG_GOGO, mouth="grin", acc=["earrings", "chain"], earc=PINKN),
    "fang":     lady(skin=THAI, hair="ponytail", hc=BLACK, shirt=C(0xd02040), bg=BG_GOGO, mouth="smile", acc=["earrings"], earc=YELN, blush=True),
    "gib":      lady(skin=THAI, hair="ponytail", hc=BLACK, shirt=C(0x5a6ad0), bg=BG_GOGO, mouth="grin", acc=["earrings"], earc=GOLD),
    "nice":     lady(skin=THAI, hair="long", hc=DKBRN, shirt=C(0xf05a30), bg=BG_GOGO, mouth="grin", acc=["earrings", "chain"], earc=CYAN),
    "tukta":    lady(skin=THAI, hair="long", hc=BLACK, shirt=C(0x7a3ad0), bg=BG_GOGO, mouth="grin", acc=["earrings", "chain"], earc=PINKN),
    "jum":      lady(skin=THAI, hair="ponytail", hc=GRBLK, shirt=C(0xd02040), bg=BG_GOGO, mouth="grin", acc=["earrings"], earc=PINKN, blush=True),
    "pop":      lady(skin=THAI2, hair="long", hc=BLACK, shirt=C(0x7a3ad0), bg=BG_GOGO, mouth="smile", acc=["earrings"], earc=GOLD),
    "namwan":   lady(skin=THAI2, hair="sleek", hc=BLACK, shirt=C(0xf05a30), bg=BG_GOGO, mouth="grin", acc=["earrings"], earc=PINKN),
    "orn":      lady(skin=THAI2, hair="bob", hc=DKBRN, shirt=C(0xf090c0), bg=BG_GOGO, mouth="grin", acc=["earrings"], earc=PINKN, blush=True),
    "gigi":     lady(skin=THAI2, hair="ponytail", hc=BLACK, shirt=C(0x2e7d6e), bg=BG_GOGO, mouth="grin", acc=["earrings", "chain"], earc=CYAN),
    "kaew":     lady(skin=THAI, hair="ponytail", hc=BLACK, shirt=C(0x5a6ad0), bg=BG_GOGO, mouth="neutral", acc=["earrings", "nosering", "chain"], earc=YELN),
    "meaw":     lady(skin=THAI, hair="ponytail", hc=DKBRN, shirt=C(0xcf30a0), bg=BG_GOGO, mouth="grin", acc=["earrings", "flower", "chain"], earc=YELN),
    "nan":      lady(skin=THAI, hair="long", hc=DKBRN, shirt=C(0x7a3ad0), bg=BG_BAR, mouth="smile", acc=["earrings", "chain"], earc=YELN),
    "bua":      lady(skin=THAI, hair="long", hc=BLACK, shirt=C(0xcf30a0), bg=BG_BAR, mouth="smile", acc=["earrings", "flower", "chain"], earc=PINKN),
    "fern":     lady(skin=THAI2, hair="chignon", hc=BLACK, shirt=C(0xe07820), bg=BG_BAR, mouth="smile", acc=["earrings", "bracelets"], earc=CYAN),
    "mai":      lady(skin=THAI, hair="pigtails", hc=BLACK, shirt=C(0x8a1030), bg=BG_BAR, mouth="grin", acc=["earrings"], earc=GOLD),
    "ju":       lady(skin=THAI, hair="ponytail", hc=DKBRN, shirt=C(0x30c0d0), bg=BG_BAR, mouth="grin", acc=["earrings", "chain"], earc=PINKN),
    "pat":      lady(skin=THAI2, hair="bob", hc=BLACK, shirt=C(0x6a3ad0), bg=BG_BAR, mouth="smile", acc=["earrings"], earc=CYAN),
    "pun":      lady(skin=THAI, hair="long", hc=BLACK, shirt=C(0xd028b0), bg=BG_BAR, mouth="smile", acc=["earrings", "flower"], earc=YELN),
    "som":      lady(skin=THAI, hair="pigtails", hc=DKBRN, shirt=C(0xf05a30), bg=BG_BAR, mouth="grin", acc=["earrings", "bracelets"], earc=GOLD),
    "mam":      lady(skin=THAI, hair="chignon", hc=GRBLK, shirt=C(0x2e7d6e), bg=BG_BAR, mouth="neutral", acc=["earrings", "chain"], earc=CYAN),
    "jib":      lady(skin=THAI, hair="bob", hc=BLACK, shirt=C(0xe07820), bg=BG_BAR, mouth="smile", acc=["earrings"], earc=PINKN),
    "toon":     lady(skin=THAI2, hair="long", hc=DKBRN, shirt=C(0x10b0a0), bg=BG_BAR, mouth="grin", acc=["earrings", "flower", "chain"], earc=GOLD),
    "yaya":     lady(skin=THAI, hair="sleek", hc=BLACK, shirt=C(0xcf30a0), bg=BG_BAR, mouth="smile", acc=["earrings", "bracelets"], earc=YELN),
    "near":     lady(skin=THAI, hair="ponytail", hc=BLACK, shirt=C(0x30a0d0), bg=BG_BAR, mouth="smile", acc=["earrings", "chain"], earc=GOLD),
    "milin":    lady(skin=THAI2, hair="bob", hc=DKBRN, shirt=C(0xd05820), bg=BG_BAR, mouth="grin", acc=["earrings", "flower"], earc=CYAN),
    "ann":      lady(skin=THAI, hair="long", hc=DKBRN, shirt=C(0x10b0a0), bg=BG_BAR, mouth="grin", acc=["earrings"], earc=CYAN),
    "nut":      lady(skin=THAI, hair="bob", hc=GRBLK, shirt=C(0x2e7d6e), bg=BG_BAR, mouth="neutral", acc=["earrings", "flower", "chain"], earc=GOLD),
    "rung":     lady(skin=THAI2, hair="ponytail", hc=BLACK, shirt=C(0x40c060), bg=BG_BAR, mouth="smile", acc=["earrings"], earc=GOLD),
    "oat":      lady(skin=THAI2, hair="ponytail", hc=DKBRN, shirt=C(0xff1493), bg=BG_BAR, mouth="smile", acc=["earrings"], earc=GOLD, blush=True),
    "ton":      lady(skin=THAI, hair="sleek", hc=DKBRN, shirt=C(0xd028b0), bg=BG_BAR, mouth="grin", acc=["earrings"], earc=CYAN),
    "nid":      lady(skin=THAI, hair="bob", hc=BLACK, shirt=C(0x2e7d6e), bg=BG_BAR, mouth="neutral", acc=["earrings", "chain"], earc=PINKN),
    "wa":       lady(skin=THAI, hair="ponytail", hc=BLACK, shirt=C(0x10b0a0), bg=BG_BAR, mouth="grin", acc=["earrings", "nosering"], earc=YELN),
    "noon":     lady(skin=THAI, hair="ponytail", hc=BLACK, shirt=C(0x3a8a4a), bg=BG_BAR, mouth="smile", acc=["earrings", "chain"], earc=GOLD),
    "prae":     lady(skin=THAI, hair="bun", hc=BLACK, shirt=C(0x7a3ad0), bg=BG_BAR, mouth="neutral", acc=["earrings", "chain"], earc=CYAN),
    "tan":      lady(skin=THAI, hair="bob", hc=DKBRN, shirt=C(0xd028b0), bg=BG_BAR, mouth="smile", acc=["earrings", "nosering"], earc=YELN),
    "tik":      lady(skin=THAI, hair="ponytail", hc=BLACK, shirt=C(0x8a1030), bg=BG_BAR, mouth="grin", acc=["earrings", "flower"], earc=GOLD),
    "pui":      lady(skin=THAI, hair="ponytail", hc=BLACK, shirt=C(0xe07820), bg=BG_BAR, mouth="smile", acc=["earrings"], earc=GOLD, blush=True),
    "mild":     lady(skin=THAI2, hair="ponytail", hc=DKBRN, shirt=C(0x00e5ff), bg=BG_BAR, mouth="smile", acc=["earrings"], earc=YELN, blush=True),
    "namtan":   lady(skin=THAI, hair="pigtails", hc=BLACK, shirt=C(0xff1493), bg=BG_BAR, mouth="grin", acc=["earrings", "chain"], earc=CYAN),
    "ying":     lady(skin=THAI, hair="long", hc=BLACK, shirt=C(0xe86a9a), bg=BG_BAR, mouth="smile", acc=["earrings"], earc=PINKN),
    "kai":      lady(skin=THAI, hair="bob", hc=GRBLK, shirt=C(0x5a6ad0), bg=BG_BAR, mouth="smile", acc=["earrings", "nosering"], earc=GOLD),
    "nook":     lady(skin=THAI, hair="chignon", hc=GRBLK, shirt=C(0x40c060), bg=BG_BAR, mouth="neutral", acc=["earrings"], earc=GOLD),
    "dew":      lady(skin=THAI2, hair="bun", hc=BLACK, shirt=C(0xd028b0), bg=BG_BAR, mouth="smile", acc=["earrings", "chain"], earc=CYAN, blush=True),
    "puu":      lady(skin=THAI, hair="ponytail", hc=BLACK, shirt=C(0x00e5ff), bg=BG_BAR, mouth="grin", acc=["earrings", "bracelets", "chain"], earc=GOLD),
    "belle":    lady(skin=THAI, hair="ponytail", hc=BLACK, shirt=C(0xd028b0), bg=BG_BAR, mouth="grin", acc=["earrings", "nosering"], earc=PINKN),
    "kat":      lady(skin=THAI, hair="sleek", hc=DKBRN, shirt=C(0x2e7d6e), bg=BG_BAR, mouth="neutral", acc=["earrings", "bracelets"], earc=GOLD),
    "may":      lady(skin=THAI, hair="long", hc=BLACK, shirt=C(0xe07820), bg=BG_BAR, mouth="neutral", acc=["earrings", "flower"], earc=GOLD),
    "dear":     lady(skin=THAI2, hair="ponytail", hc=BLACK, shirt=C(0xf090c0), bg=BG_BAR, mouth="neutral", acc=["earrings"], earc=YELN),
    "ing":      lady(skin=THAI, hair="long", hc=DKBRN, shirt=C(0xf05a30), bg=BG_BAR, mouth="grin", acc=["earrings", "nosering", "chain"], earc=CYAN),
    "bam":      lady(skin=THAI, hair="sleek", hc=BLACK, shirt=C(0x00e5ff), bg=BG_BAR, mouth="smile", acc=["earrings"], earc=YELN, blush=True),
    "chompoo":  lady(skin=THAI2, hair="chignon", hc=BLACK, shirt=C(0x40c060), bg=BG_BAR, mouth="smile", acc=["earrings", "bracelets"], earc=CYAN),
    # Soi Honey beer-bar girls
    "goong":    lady(skin=THAI, hair="ponytail", hc=BLACK, shirt=C(0xffcf40), bg=BG_BAR, mouth="grin", acc=["earrings"], earc=PINKN),
    "jiab":     lady(skin=THAI2, hair="bob", hc=DKBRN, shirt=C(0x181820), bg=BG_BAR, mouth="smile", acc=["earrings", "nosering"], earc=YELN, blush=True),
    "meen":     lady(skin=THAI, hair="long", hc=BLACK, shirt=C(0xffcf40), bg=BG_BAR, mouth="neutral", acc=["earrings"], earc=CYAN),
    "yok":      lady(skin=THAI, hair="sleek", hc=BLACK, shirt=C(0x2e7d6e), bg=BG_BAR, mouth="grin", acc=["earrings", "bracelets"], earc=YELN),
    "namphueng": lady(skin=THAI2, hair="ponytail", hc=DKBRN, shirt=C(0xffcf40), bg=BG_BAR, mouth="smile", acc=["earrings", "flower"], earc=PINKN, blush=True),
    "gaem":     lady(skin=THAI, hair="bob", hc=BLACK, shirt=C(0xf090c0), bg=BG_BAR, mouth="grin", acc=["earrings"], earc=CYAN, blush=True),
    # Soi Diana beer-bar girls (Dollhouse, Sapphire, Sundowner, Cricketers)
    "bum":      lady(skin=THAI, hair="long", hc=BLACK, shirt=C(0xff1493), bg=BG_BAR, mouth="grin", acc=["earrings"], earc=CYAN),
    "ohm":      lady(skin=THAI2, hair="ponytail", hc=DKBRN, shirt=C(0xd028b0), bg=BG_BAR, mouth="smile", acc=["earrings", "nosering"], earc=YELN),
    "fasai":    lady(skin=THAI, hair="sleek", hc=BLACK, shirt=C(0x00bfff), bg=BG_BAR, mouth="neutral", acc=["earrings"], earc=CYAN),
    "tarn":     lady(skin=THAI, hair="long", hc=BLACK, shirt=C(0x2a5aa0), bg=BG_BAR, mouth="grin", acc=["earrings", "bracelets"], earc=YELN),
    "pao":      lady(skin=THAI2, hair="bob", hc=DKBRN, shirt=C(0xffcf40), bg=BG_BAR, mouth="smile", acc=["earrings"], earc=PINKN, blush=True),
    "poom":     lady(skin=THAI, hair="ponytail", hc=BLACK, shirt=C(0x3a8a4a), bg=BG_BAR, mouth="grin", acc=["earrings"], earc=CYAN),
    "bright":   lady(skin=THAI2, hair="long", hc=DKBRN, shirt=C(0xe07820), bg=BG_BAR, mouth="smile", acc=["earrings", "flower"], earc=YELN),
    "lukkade":  lady(skin=THAI, hair="bob", hc=BLACK, shirt=C(0xd02040), bg=BG_BAR, mouth="neutral", acc=["earrings"], earc=PINKN),
    # Soi 7 (Jomtien) beer-bar girls
    "bpom":     lady(skin=THAI, hair="bob", hc=BLACK, shirt=C(0x3a8a4a), bg=BG_BAR, mouth="grin", acc=["earrings"], earc=YELN),
    "proud":    lady(skin=THAI2, hair="long", hc=DKBRN, shirt=C(0x2e7d6e), bg=BG_BAR, mouth="smile", acc=["earrings", "flower"], earc=CYAN),
    "namo":     lady(skin=THAI, hair="ponytail", hc=BLACK, shirt=C(0x00bfff), bg=BG_BAR, mouth="smile", acc=["earrings"], earc=PINKN),
    "somruedee": lady(skin=THAI2, hair="bob", hc=GRBLK, shirt=C(0xe07820), bg=BG_BAR, mouth="neutral", acc=["earrings"], earc=YELN),
    "ratchada": lady(skin=THAI, hair="long", hc=BLACK, shirt=C(0xd02040), bg=BG_BAR, mouth="grin", acc=["earrings", "bracelets"], earc=CYAN),
    "nittaya":  lady(skin=THAI2, hair="bun", hc=GRBLK, shirt=C(0x4a2a6a), bg=BG_BAR, mouth="smile", acc=["earrings"], earc=GOLD),
    "duang":    lady(skin=THAI, hair="ponytail", hc=BLACK, shirt=C(0xf090c0), bg=BG_BAR, mouth="grin", acc=["earrings"], earc=YELN, blush=True),
    "mookda":   lady(skin=THAI2, hair="bob", hc=DKBRN, shirt=C(0x2a5aa0), bg=BG_BAR, mouth="neutral", acc=["earrings", "flower"], earc=PINKN),
    # Thappraya Main Strip — Hyper go-go dancers, beer-bar girls, gents-club hostesses
    "aoi":      lady(skin=THAI, hair="long", hc=BLACK, shirt=C(0xff1493), bg=BG_GOGO, mouth="grin", acc=["earrings"], earc=CYAN),
    "noey":     lady(skin=THAI2, hair="sleek", hc=BLACK, shirt=C(0x00e5ff), bg=BG_GOGO, mouth="neutral", acc=["earrings", "nosering"], earc=YELN),
    "gig":      lady(skin=THAI, hair="ponytail", hc=DKBRN, shirt=C(0x3a8a4a), bg=BG_BAR, mouth="grin", acc=["earrings"], earc=YELN),
    "kade":     lady(skin=THAI, hair="bob", hc=BLACK, shirt=C(0xffcf40), bg=BG_BAR, mouth="smile", acc=["earrings"], earc=PINKN, blush=True),
    "pinky":    lady(skin=THAI2, hair="long", hc=DKBRN, shirt=C(0xf090c0), bg=BG_BAR, mouth="grin", acc=["earrings", "flower"], earc=PINKN, blush=True),
    "mona":     lady(skin=THAI, hair="sleek", hc=BLACK, shirt=C(0xd02040), bg=BG_BAR, mouth="neutral", acc=["earrings", "bracelets"], earc=CYAN),
    "gina":     lady(skin=THAI2, hair="bob", hc=DKBRN, shirt=C(0xe07820), bg=BG_BAR, mouth="smile", acc=["earrings"], earc=YELN),
    "bpaeng":   lady(skin=THAI, hair="ponytail", hc=BLACK, shirt=C(0x00bfff), bg=BG_BAR, mouth="grin", acc=["earrings"], earc=PINKN),
    "tim":      lady(skin=THAI, hair="sleek", hc=BLACK, shirt=C(0x181820), bg=BG_BAR, mouth="neutral", acc=["earrings"], earc=GOLD),
    "min":      lady(skin=THAI2, hair="long", hc=DKBRN, shirt=C(0x1a1a24), bg=BG_BAR, mouth="smile", acc=["earrings", "bracelets"], earc=CYAN),
    "milk":     lady(skin=THAI, hair="bob", hc=BLACK, shirt=C(0x8a2a5a), bg=BG_BAR, mouth="neutral", acc=["earrings"], earc=GOLD),
    "june":     lady(skin=THAI, hair="sleek", hc=BLACK, shirt=C(0x3a2a6a), bg=BG_BAR, mouth="smile", acc=["earrings"], earc=PINKN),
    # --- filler mamas / cashiers / extra hostesses ---
    "pen":      lady(skin=THAI, hair="bun", hc=GREY, shirt=C(0x4a2a6a), bg=BG_BAR, mouth="neutral", acc=["earrings", "chain"], earc=GOLD),
    "muay":     lady(skin=THAI, hair="sleek", hc=SILVER, shirt=C(0x181820), bg=BG_BAR, mouth="neutral", acc=["earrings", "chain"], earc=PINKN),
    "lamai":    lady(skin=THAI2, hair="chignon", hc=GRBLK, shirt=C(0x181820), bg=BG_BAR, mouth="stern", acc=["earrings", "chain"], earc=PINKN),
    "jeab":     lady(skin=THAI2, hair="sleek", hc=GRBLK, shirt=C(0x5a1a4a), bg=BG_GOGO, mouth="neutral", acc=["earrings", "chain"], earc=YELN),
    "da":       lady(skin=THAI, hair="bun", hc=GREY, shirt=C(0x8a1030), bg=BG_GOGO, mouth="neutral", acc=["earrings", "chain"], earc=PINKN),
    "rin":      lady(skin=THAI2, hair="bun", hc=GRBLK, shirt=C(0x2e7d6e), bg=BG_GOGO, mouth="neutral", acc=["earrings", "glasses", "glasschain"], earc=GOLD, framec=GOLD),
    "kob":      lady(skin=THAI, hair="sleek", hc=SILVER, shirt=C(0x303048), bg=BG_GOGO, mouth="smile", acc=["earrings", "chain"], earc=PINKN),
    "koi":      lady(skin=THAI, hair="chignon", hc=SILVER, shirt=C(0x6a0a20), bg=BG_BAR, mouth="neutral", acc=["earrings", "chain"], earc=PINKN),
    "ratana":   lady(skin=THAI2, hair="bob", hc=GRBLK, shirt=C(0x8a1030), bg=BG_BAR, mouth="stern", acc=["earrings", "chain"], earc=YELN),
    "waew":     lady(skin=THAI2, hair="sleek", hc=GRBLK, shirt=C(0x1e2a5a), bg=BG_BAR, mouth="neutral", acc=["earrings", "chain"], earc=CYAN),
    "ple":      lady(skin=THAI, hair="bob", hc=GRBLK, shirt=C(0x2e7d6e), bg=BG_BAR, mouth="neutral", acc=["earrings", "chain"], earc=GOLD),
    "orm":      lady(skin=THAI, hair="chignon", hc=GREY, shirt=C(0x8a1030), bg=BG_BAR, mouth="neutral", acc=["earrings", "glasses"], earc=PINKN, framec=GOLD),
    "jom":      lady(skin=THAI, hair="sleek", hc=SILVER, shirt=C(0x303048), bg=BG_BAR, mouth="stern", acc=["earrings", "chain"], earc=PINKN),
    "nee":      lady(skin=THAI2, hair="chignon", hc=GREY, shirt=C(0x1e2a5a), bg=BG_BAR, mouth="neutral", acc=["earrings", "chain"], earc=CYAN),
    "peung":    lady(skin=THAI, hair="bob", hc=SILVER, shirt=C(0x303048), bg=BG_BAR, mouth="neutral", acc=["earrings", "chain"], earc=YELN),
    "malai":    lady(skin=THAI, hair="bun", hc=GREY, shirt=C(0x303048), bg=BG_BAR, mouth="neutral", acc=["earrings", "glasses"], earc=PINKN, framec=GOLD),
    "somsri":   lady(skin=THAI2, hair="chignon", hc=SILVER, shirt=C(0x5a1a4a), bg=BG_GOGO, mouth="stern", acc=["earrings", "chain"], earc=YELN),
    "ratree":   lady(skin=THAI, hair="bob", hc=GREY, shirt=C(0x4a2a6a), bg=BG_GOGO, mouth="stern", acc=["earrings", "chain"], earc=YELN),
    "golf":     lady(skin=THAI2, hair="sleek", hc=BLACK, shirt=C(0x2a2a3a), collar=True, bg=BG_GOGO, mouth="smile", acc=["earrings", "glasses"], earc=YELN, framec=SILVER),
    "air":      lady(skin=THAI2, hair="sleek", hc=GRBLK, shirt=C(0x2e3a2e), collar=True, bg=BG_BAR, mouth="neutral", acc=["earrings", "ringchain"], earc=GOLD),
    "apple":    lady(skin=THAI2, hair="ponytail", hc=BLACK, shirt=C(0x2a2a3a), collar=True, bg=BG_BAR, mouth="smile", acc=["earrings", "lanyard"], earc=PINKN),
    "cake":     lady(skin=THAI, hair="ponytail", hc=BLACK, shirt=C(0x303040), collar=True, bg=BG_BAR, mouth="neutral", acc=["earrings", "ringchain"], earc=GOLD),
    "care":     lady(skin=THAI, hair="bob", hc=DKBRN, shirt=C(0x1e2a5a), collar=True, bg=BG_BAR, mouth="smile", acc=["earrings", "lanyard"], earc=YELN),
    "cartoon":  lady(skin=THAI2, hair="bun", hc=DKBRN, shirt=C(0x2e3a2e), collar=True, bg=BG_GOGO, mouth="neutral", acc=["earrings", "lanyard"], earc=PINKN),
    "earn":     lady(skin=THAI, hair="bob", hc=BLACK, shirt=C(0x181820), collar=True, bg=BG_GOGO, mouth="smile", acc=["earrings", "lanyard"], earc=PINKN),
    "eye":      lady(skin=THAI2, hair="bob", hc=BLACK, shirt=C(0x181820), collar=True, bg=BG_GOGO, mouth="neutral", acc=["earrings", "lanyard"], earc=CYAN),
    "fai":      lady(skin=THAI, hair="bob", hc=GRBLK, shirt=C(0x2e3a2e), collar=True, bg=BG_GOGO, mouth="neutral", acc=["earrings", "headset"], earc=YELN),
    "gam":      lady(skin=THAI, hair="sleek", hc=BLACK, shirt=C(0x303040), collar=True, bg=BG_BAR, mouth="smile", acc=["earrings", "headset"], earc=YELN),
    "ging":     lady(skin=THAI, hair="bob", hc=DKBRN, shirt=C(0x1e2a5a), collar=True, bg=BG_BAR, mouth="neutral", acc=["earrings", "glasses"], earc=YELN, framec=SILVER),
    "grace":    lady(skin=THAI, hair="ponytail", hc=DKBRN, shirt=C(0x1e2a5a), collar=True, bg=BG_BAR, mouth="smile", acc=["earrings", "ringchain"], earc=CYAN),
    "hong":     lady(skin=THAI2, hair="bob", hc=DKBRN, shirt=C(0x303040), collar=True, bg=BG_BAR, mouth="neutral", acc=["earrings", "ringchain"], earc=GOLD),
    "jah":      lady(skin=THAI, hair="bob", hc=GRBLK, shirt=C(0x181820), collar=True, bg=BG_BAR, mouth="neutral", acc=["earrings"], earc=PINKN),
    "jeed":     lady(skin=THAI2, hair="bob", hc=DKBRN, shirt=C(0x1e2a5a), collar=True, bg=BG_BAR, mouth="neutral", acc=["earrings", "ringchain"], earc=CYAN),
    "jenny":    lady(skin=THAI2, hair="ponytail", hc=GRBLK, shirt=C(0x303040), collar=True, bg=BG_BAR, mouth="neutral", acc=["earrings", "lanyard"], earc=CYAN),
    "joon":     lady(skin=THAI2, hair="bob", hc=DKBRN, shirt=C(0x181820), collar=True, bg=BG_BAR, mouth="neutral", acc=["earrings", "glasses"], earc=GOLD, framec=SILVER),
    "jun":      lady(skin=THAI2, hair="sleek", hc=BLACK, shirt=C(0x24303a), collar=True, bg=BG_BAR, mouth="neutral", acc=["earrings", "glasses"], earc=PINKN, framec=SILVER),
    "kaimook":  lady(skin=THAI, hair="ponytail", hc=GRBLK, shirt=C(0x181820), collar=True, bg=BG_GOGO, mouth="neutral", acc=["earrings"], earc=GOLD),
    "kanom":    lady(skin=THAI, hair="bun", hc=GRBLK, shirt=C(0x2e3a2e), collar=True, bg=BG_GOGO, mouth="neutral", acc=["earrings", "lanyard"], earc=CYAN),
    "keng":     lady(skin=THAI, hair="bob", hc=DKBRN, shirt=C(0x181820), collar=True, bg=BG_BAR, mouth="neutral", acc=["earrings", "ringchain"], earc=CYAN),
    "khing":    lady(skin=THAI, hair="bob", hc=BLACK, shirt=C(0xff1493), bg=BG_BAR, mouth="grin", acc=["earrings", "flower"], earc=GOLD),
    "kwang":    lady(skin=THAI, hair="long", hc=BLACK, shirt=C(0xff1493), bg=BG_BAR, mouth="grin", acc=["earrings", "flower"], earc=CYAN),
    "manow":    lady(skin=THAI, hair="long", hc=BLACK, shirt=C(0x00e5ff), bg=BG_BAR, mouth="grin", acc=["earrings", "flower"], earc=CYAN),
    # --- Darkside strip staff (Water Buffalo / Firefly / Mama Yai's) ---
    "wandee":   lady(skin=THAI2, hair="bun", hc=GRBLK, shirt=C(0x2e5a3a), bg=BG_BAR, mouth="neutral", acc=["earrings", "chain"], earc=GOLD),
    "somjai":   lady(skin=THAI, hair="chignon", hc=GREY, shirt=C(0x5a1a4a), bg=BG_BAR, mouth="smile", acc=["earrings", "glasses", "glasschain"], framec=GOLD, earc=CYAN),
    "yai":      lady(skin=THAI2, hair="bun", hc=SILVER, shirt=C(0x8a3010), bg=BG_BAR, mouth="stern", acc=["earrings", "towel"], earc=GOLD),
    "best":     lady(skin=THAI, hair="bob", hc=BLACK, shirt=C(0x1e2a5a), collar=True, bg=BG_BAR, mouth="neutral", acc=["earrings", "lanyard"], earc=YELN),
    "aim":      lady(skin=THAI, hair="ponytail", hc=DKBRN, shirt=C(0x24303a), collar=True, bg=BG_BAR, mouth="smile", acc=["earrings", "glasses"], framec=SILVER, earc=PINKN),
    "tangmo":   lady(skin=THAI2, hair="bun", hc=BLACK, shirt=C(0x2e3a2e), collar=True, bg=BG_BAR, mouth="smile", acc=["earrings", "headset"], earc=GOLD),
    "lin":      lady(skin=THAI, hair="long", hc=BLACK, shirt=C(0x10b0a0), bg=BG_BAR, mouth="grin", acc=["earrings", "flower"], earc=CYAN),
    "nim":      lady(skin=THAI, hair="bob", hc=DKBRN, shirt=C(0xe86a9a), bg=BG_BAR, mouth="smile", acc=["earrings"], earc=GOLD, blush=True),
    "duan":     lady(skin=THAI2, hair="ponytail", hc=BLACK, shirt=C(0xffe600), bg=BG_BAR, mouth="grin", acc=["earrings", "bracelets"], earc=PINKN),
    "saifon":   lady(skin=THAI, hair="pigtails", hc=BLACK, shirt=C(0x00e5ff), bg=BG_BAR, mouth="smile", acc=["earrings"], earc=CYAN, blush=True),
    "wanpen":   lady(skin=THAI2, hair="sleek", hc=GRBLK, shirt=C(0xd02040), bg=BG_BAR, mouth="smile", acc=["earrings", "chain"], earc=GOLD),
    "kratae":   lady(skin=THAI, hair="pigtails", hc=BLACK, shirt=C(0xf05a30), bg=BG_BAR, mouth="grin", acc=["earrings", "nosering"], earc=YELN),
    "tui":      lady(skin=THAI2, hair="chignon", hc=SILVER, shirt=C(0x181820), bg=BG_BAR, mouth="stern", acc=["earrings", "chain"], earc=GOLD),
    "mon":      lady(skin=THAI, hair="bun", hc=GRBLK, shirt=C(0x2a2a3a), collar=True, bg=BG_BAR, mouth="neutral", acc=["earrings", "ringchain"], earc=GOLD),
    "dokmai":   lady(skin=THAI2, hair="bun", hc=GRBLK, shirt=C(0x8a1030), bg=BG_BAR, mouth="grin", acc=["earrings", "flower", "chain"], earc=GOLD),
    "jampa":    lady(skin=THAI2, hair="chignon", hc=GREY, shirt=C(0x5a1a4a), bg=BG_BAR, mouth="smile", acc=["earrings", "chain"], earc=GOLD),
    # --- patrons ---
    "nigel":    dict(skin=RED, hair="balding", hc=GREY, shirt=C(0x556b55),
                     vest=C(0x3a4d3a), mouth="neutral", bg=BG_BAR),
    "mort":     dict(skin=TAN, hair="balding", hc=SILVER, shirt=C(0xd08a3a),
                     mouth="smile", acc=["glasses", "stubble"], bg=BG_BAR),
    "ron":      dict(skin=RED, hair="short", hc=SILVER, shirt=C(0x8a8a9a),
                     mouth="grin", acc=["stubble"], bg=BG_BAR),
    "glam":     dict(skin=PALE, hair="spiky", hc=C(0xe8e0b0), shirt=C(0x9a2a8a), collar=True,
                     mouth="smile", bg=BG_GOGO),
    "fergie":   dict(skin=RED, hair="bald", hc=GREY, shirt=C(0x3a5a3a),
                     mouth="stern", acc=["stubble"], bg=BG_BAR),
    "chuck":    dict(skin=RED, hair="combover", hc=BROWN, shirt=C(0x3a6ac0), collar=True,
                     mouth="grin", acc=["logo"], bg=BG_BAR),
    "dave":     dict(skin=PALE, hair="short", hc=C(0x8a7a60), shirt=C(0xc8b890),
                     collar=True, mouth="neutral", bg=BG_BAR),
    "helmut":   dict(skin=TAN, hair="short", hc=GREY, shirt=C(0xa8c8e0), collar=True,
                     mouth="stern", acc=["glasses"], bg=BG_BAR),
    "somsak":   dict(skin=THAI2, hair="short", hc=BLACK, shirt=C(0x5a6a7a), collar=True,
                     mouth="smile", bg=BG_BEACH),
    "mikkel":   dict(skin=TAN, hair="messy", hc=BLOND, shirt=C(0xe8e0d0), tank=True,
                     skinshirt=True, mouth="grin", acc=["bracelets"], bg=BG_BAR),
    "randy":    dict(skin=TAN, hair="short", hc=BROWN, shirt=C(0x4a5a8a), collar=True,
                     mouth="smile", acc=["stubble"], bg=BG_BAR),
    "drew":     dict(skin=TAN, hair="buzz", hc=GREY, shirt=C(0x181820),
                     mouth="neutral", acc=["glasses", "cig"], framec=SILVER,
                     bg=BG_BAR),
    "david":    dict(skin=PALE, hair="short", hc=DKBRN, shirt=C(0x8a2a2a), collar=True,
                     mouth="grin", acc=["cap"], capc=C(0xaa2222), bg=BG_BAR),
    "superman": dict(skin=PALE, hair="short", hc=GREY, shirt=C(0x2a4ac0),
                     mouth="smile", acc=["slogo"], bg=BG_BEACH),
    "angela":   dict(skin=PALE, hair="cropped", hc=GRBLK, shirt=C(0x9a2a2a),
                     check=True, mouth="neutral", bg=BG_BAR),
    "danny":    dict(skin=TAN, hair="slick", hc=BLACK, shirt=C(0x282830), tank=True,
                     mouth="grin", acc=["tattoos", "necktattoo", "chain"], bg=BG_BAR),
    "josey":    lady(skin=TAN, hair="ponytail", hc=BLOND, shirt=C(0x10b0a0),
                     bg=BG_GOGO, mouth="grin", acc=["earrings", "sweatband"]),
    "reginald": dict(skin=DEEP, hair="slick", hc=SILVER, shirt=C(0xe8e4d8), collar=True,
                     mouth="smile", acc=["chain"], bg=BG_GOGO),
}

# ---- PNG output ----------------------------------------------------------
def write_png(path, c, scale):
    n = W * scale
    raw = b""
    for row in c:
        line = b""
        for col in row:
            line += bytes(col) * scale
        raw += (b"\x00" + line) * scale
    def chunk(tag, data):
        d = tag + data
        return struct.pack(">I", len(data)) + d + struct.pack(">I", zlib.crc32(d))
    out = b"\x89PNG\r\n\x1a\n"
    out += chunk(b"IHDR", struct.pack(">IIBBBBB", n, n, 8, 2, 0, 0, 0))
    out += chunk(b"IDAT", zlib.compress(raw, 9))
    out += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(out)

def contact_sheet(path, cols=9, scale=4, gap=2):
    ids = list(CHARS)
    rows = (len(ids) + cols - 1) // cols
    sw = cols * (W + gap) + gap
    sh = rows * (H + gap) + gap
    sheet = [[C(0x000000)] * sw for _ in range(sh)]
    for i, cid in enumerate(ids):
        cx = gap + (i % cols) * (W + gap)
        cy = gap + (i // cols) * (H + gap)
        img = draw(CHARS[cid])
        for y in range(H):
            for x in range(W):
                sheet[cy + y][cx + x] = img[y][x]
    raw = b""
    for row in sheet:
        line = b""
        for col in row:
            line += bytes(col) * scale
        raw += (b"\x00" + line) * scale
    def chunk(tag, data):
        d = tag + data
        return struct.pack(">I", len(data)) + d + struct.pack(">I", zlib.crc32(d))
    out = b"\x89PNG\r\n\x1a\n"
    out += chunk(b"IHDR", struct.pack(">IIBBBBB", sw * scale, sh * scale, 8, 2, 0, 0, 0))
    out += chunk(b"IDAT", zlib.compress(raw, 9))
    out += chunk(b"IEND", b"")
    with open(path, "wb") as f:
        f.write(out)
    print(path, f"({len(ids)} portraits, {cols}x{rows})")

def main():
    here = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    outdir = os.path.join(here, "web", "portraits")
    os.makedirs(outdir, exist_ok=True)
    for cid, spec in CHARS.items():
        write_png(os.path.join(outdir, cid + ".png"), draw(spec), SCALE)
    print(f"wrote {len(CHARS)} portraits to {outdir}")
    if "--sheet" in sys.argv:
        contact_sheet(sys.argv[sys.argv.index("--sheet") + 1])

if __name__ == "__main__":
    main()
