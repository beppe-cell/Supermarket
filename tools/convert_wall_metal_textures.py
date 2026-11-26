"""Converte i set scaricati RammedEarth018 (pareti) e MetalGalvanizedSteelWorn001 (metallo scaffali) nel formato del gioco
(<name>_albedo.jpg, <name>_normal.png, <name>_orm.jpg con R=AO, G=rugosità, B=metallo), adattati al look C.
Uso: python3 tools/convert_wall_metal_textures.py <dir_RammedEarth> <dir_Metal> <out_dir>"""
import sys, glob, os
import numpy as np
from PIL import Image

earth, metal, out = sys.argv[-3:]
def L(d, pat, mode):
    f = glob.glob(os.path.join(d, pat))[0]
    return np.asarray(Image.open(f).convert(mode), dtype=np.float32) / 255.0
def save(name, alb, nrm_path, ao, rough, metallic):
    Image.fromarray((np.clip(alb, 0, 1) * 255).astype(np.uint8)).save(f"{out}/{name}_albedo.jpg", quality=90)
    Image.open(nrm_path).convert("RGB").save(f"{out}/{name}_normal.png", optimize=True)
    orm = np.stack([ao, rough, metallic], -1)
    Image.fromarray((np.clip(orm, 0, 1) * 255).astype(np.uint8)).save(f"{out}/{name}_orm.jpg", quality=90)

# Pareti: crema -> grigio-bianco freddo e sporco (desatura 75%, raffredda, scurisce)
c = L(earth, "*_COL_1K_METALNESS.png", "RGB"); lum = c.mean(axis=2, keepdims=True)
alb = (lum * 0.75 + c * 0.25) * np.array([0.80, 0.86, 0.95], dtype=np.float32) * 0.85
save("wall", alb, glob.glob(os.path.join(earth, "*_NRM_1K_METALNESS.png"))[0], L(earth, "*_AO_1K_METALNESS.png", "L"),
     np.clip(L(earth, "*_ROUGHNESS_1K_METALNESS.png", "L"), 0.2, 1), np.zeros((1024, 1024), dtype=np.float32))
# Metallo scaffali: acciaio zincato consumato, leggermente freddo
c = L(metal, "*_COL_1K_METALNESS.jpg", "RGB") * np.array([0.92, 0.96, 1.0], dtype=np.float32)
save("shelf", c, glob.glob(os.path.join(metal, "*_NRM_1K_METALNESS.jpg"))[0], np.ones((1024, 1024), dtype=np.float32),
     np.clip(L(metal, "*_ROUGHNESS_1K_METALNESS.jpg", "L"), 0.15, 1), L(metal, "*_METALNESS_1K_METALNESS.jpg", "L"))
print("WALL+METAL ok")
