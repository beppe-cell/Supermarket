"""Converte il set scaricato (COL_VAR1, NRM, GLOSS, AO) nel formato del gioco: floor_albedo.jpg / floor_normal.png / floor_orm.jpg (R=AO, G=rugosità, B=metallo).
Adatta al look C: albedo scurito e raffreddato, rugosità minima 0.12. Uso: python3 tools/convert_floor_texture.py <dir_estratta> <out_dir>"""
import sys, glob, os
import numpy as np
from PIL import Image

src, out = sys.argv[-2], sys.argv[-1]
def load(pattern, mode=None):
    f = glob.glob(os.path.join(src, pattern))[0]
    im = Image.open(f); return np.asarray(im.convert(mode) if mode else im, dtype=np.float32) / 255.0
col = load("*_COL_VAR1_1K.jpg", "RGB"); gloss = load("*_GLOSS_1K.jpg", "L"); ao = load("*_AO_1K.jpg", "L")
alb = col * np.array([0.60, 0.64, 0.70], dtype=np.float32)  # più scuro e freddo (look C)
rough = np.clip(1.0 - gloss * 0.9, 0.12, 1.0)
Image.fromarray((np.clip(alb, 0, 1) * 255).astype(np.uint8)).save(os.path.join(out, "floor_albedo.jpg"), quality=90)
n = Image.open(glob.glob(os.path.join(src, "*_NRM_1K.png"))[0]).convert("RGB"); n.save(os.path.join(out, "floor_normal.png"), optimize=True)
orm = np.stack([ao, rough, np.zeros_like(ao)], -1)
Image.fromarray((orm * 255).astype(np.uint8)).save(os.path.join(out, "floor_orm.jpg"), quality=90)
print("FLOOR ok")
