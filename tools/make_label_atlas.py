"""Atlante 1024x1024 di etichette INVENTATE (nessun marchio reale) per i prodotti. 4x4 tile da 256 px.
Ogni tile: sfondo con striscia laterale piatta (x<16) usata dai lati delle scatole. Uso: python3 tools/make_label_atlas.py <out.png>"""
import sys
from PIL import Image, ImageDraw, ImageFont

FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
# (nome, sottotitolo, sfondo, accento, testo)   ordine = indice tile (riga per riga)
TILES = [
    ("ZORBA", "COLA", (150, 30, 36), (235, 220, 200), (250, 245, 235)),
    ("VAROLA", "LIMON", (70, 120, 70), (230, 230, 120), (250, 250, 240)),
    ("KELDIN", "ACQUA TONICA", (40, 70, 120), (200, 220, 240), (245, 248, 252)),
    ("OSTRELLA", "ACQUA", (70, 130, 170), (230, 240, 245), (255, 255, 255)),
    ("TRIVO", "OLIO EXTRA", (160, 140, 50), (60, 70, 30), (250, 245, 220)),
    ("PLUMEN", "CEREALI", (200, 120, 40), (120, 40, 30), (255, 250, 235)),
    ("MIELO", "FIOCCHI", (170, 50, 60), (240, 200, 80), (255, 250, 240)),
    ("CRUNCHI", "PATATINE", (200, 160, 40), (150, 40, 40), (255, 255, 245)),
    ("SALTINI", "SNACK", (50, 90, 140), (230, 190, 60), (255, 255, 255)),
    ("MAMMARA", "SUGO", (160, 40, 40), (240, 230, 210), (255, 250, 240)),
    ("OLIVETTA", "CONSERVA", (90, 110, 50), (230, 220, 150), (250, 250, 235)),
    ("LATTEA", "LATTE INT.", (60, 100, 160), (240, 245, 250), (255, 255, 255)),
    ("PASTORI", "SPAGHETTI", (190, 150, 60), (120, 40, 30), (255, 250, 235)),
    ("BISCOTTA", "BISCOTTI", (120, 80, 50), (240, 210, 150), (255, 248, 235)),
    ("NOVELLA", "TE FREDDO", (60, 120, 100), (240, 220, 120), (250, 255, 250)),
    ("DOLCINA", "ZUCCHERO", (230, 230, 235), (60, 100, 160), (30, 50, 90)),
]
T = 256
img = Image.new("RGB", (1024, 1024), (30, 30, 30))
for i, (name, sub, bg, accent, fg) in enumerate(TILES):
    x0, y0 = (i % 4) * T, (i // 4) * T
    t = Image.new("RGB", (T, T), bg)
    d = ImageDraw.Draw(t)
    d.rectangle([0, 0, 15, T], fill=bg)  # striscia laterale piatta
    d.rectangle([16, 0, T, 36], fill=accent)  # fascia alta
    d.rectangle([16, T - 44, T, T], fill=accent)  # fascia bassa
    f1 = ImageFont.truetype(FONT, 38 if len(name) <= 6 else 30)
    f2 = ImageFont.truetype(FONT, 20)
    w = d.textlength(name, font=f1); d.text((16 + (T - 16 - w) / 2, 92), name, font=f1, fill=fg)
    w = d.textlength(sub, font=f2); d.text((16 + (T - 16 - w) / 2, 148), sub, font=f2, fill=fg)
    d.ellipse([T // 2 + 8 - 22, 190 - 22, T // 2 + 8 + 22, 190 + 22], outline=fg, width=3)  # logo generico
    d.line([T // 2 + 8 - 14, 190 + 6, T // 2 + 8, 190 - 14, T // 2 + 8 + 14, 190 + 6], fill=fg, width=3)
    img.paste(t, (x0, y0))
img.save(sys.argv[-1])
print("ATLAS", len(TILES), "tiles")
