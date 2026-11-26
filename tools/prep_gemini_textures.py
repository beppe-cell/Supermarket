"""Prepara le texture generate con Gemini (assets/source/textures/gemini/*.jpg) per il gioco:
- floor_grime.jpg  -> sporco sul pavimento (moltiplicato su floor_albedo, rugosità più alta dove è sporco), parte dalle basi pulite floor_base_*.jpg
- decals.jpg       -> decals.png con alpha ricavato dalla luminanza (fondo nero = trasparente)
- signs/cartons/fridges -> copie ricompresse in assets/exported/textures
Uso: python3 tools/prep_gemini_textures.py   (richiede Pillow e numpy)"""
from PIL import Image
import numpy as np, os
SRC = "assets/source/textures"; G = f"{SRC}/gemini"; OUT = "assets/exported/textures"

# pavimento: sporco moltiplicato (normalizzato sulla media così non scurisce tutto), rugosità +
base = Image.open(f"{SRC}/floor_base_albedo.jpg").convert("RGB"); N = base.size[0]
grime = np.asarray(Image.open(f"{G}/floor_grime.jpg").convert("L").resize((N, N), Image.LANCZOS), dtype=np.float32) / 255.0
rel = np.clip(grime / max(grime.mean(), 1e-3), 0.25, 1.35)          # 1 = neutro, <1 = sporco
k = 0.75
mult = (1 - k) + k * rel
alb = np.clip(np.asarray(base, dtype=np.float32) * mult[..., None], 0, 255).astype(np.uint8)
Image.fromarray(alb).save(f"{OUT}/floor_albedo.jpg", quality=90)
orm = np.asarray(Image.open(f"{SRC}/floor_base_orm.jpg").convert("RGB"), dtype=np.float32)
dirt = np.clip(1.0 - rel, 0, 1)                                     # 0 pulito .. ~0.7 molto sporco
orm[..., 1] = np.clip(orm[..., 1] + dirt * 70, 0, 255)             # canale G = roughness
orm[..., 0] = np.clip(orm[..., 0] * (1 - dirt * 0.35), 0, 255)     # canale R = AO: leggermente più scuro nello sporco
Image.fromarray(orm.astype(np.uint8)).save(f"{OUT}/floor_orm.jpg", quality=90)

# decalcomanie: alpha dalla luminanza
im = np.asarray(Image.open(f"{G}/decals.jpg").convert("RGB"), dtype=np.float32)
lum = im.max(axis=2) / 255.0
alpha = np.clip((lum - 0.06) * 3.2, 0, 1)
rgba = np.dstack([im, alpha * 255]).astype(np.uint8)
Image.fromarray(rgba, "RGBA").save(f"{OUT}/decals.png", optimize=True)

for n in ("signs", "cartons", "fridges"):
    Image.open(f"{G}/{n}.jpg").convert("RGB").save(f"{OUT}/{n}.jpg", quality=88)
print("ok")
