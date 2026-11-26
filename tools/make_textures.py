"""Texture PBR ripetibili per l'ambiente (look C: grigi freddi, sporco, usura), generate proceduralmente.
Output in <out>/ (solo soffitto; pavimento/pareti/metallo: convert_*_texture.py): <name>_albedo.jpg, <name>_normal.png (OpenGL, Y+), <name>_orm.jpg (R=AO, G=roughness, B=metallic).
Uso: python3 tools/make_textures.py <out_dir>"""
import sys, os
import numpy as np
from PIL import Image

out = sys.argv[-1]; os.makedirs(out, exist_ok=True)
rng = np.random.default_rng(7)

def pnoise(n, beta=2.0, seed=0):
    """Rumore periodico (tileable) con spettro 1/f^beta, normalizzato 0..1."""
    r = np.random.default_rng(seed)
    f = np.fft.fftfreq(n)[:, None] ** 2 + np.fft.fftfreq(n)[None, :] ** 2
    f[0, 0] = 1
    spec = (r.normal(size=(n, n)) + 1j * r.normal(size=(n, n))) / (f ** (beta / 2))
    spec[0, 0] = 0
    a = np.real(np.fft.ifft2(spec)); a -= a.min(); return a / a.max()

def normal_from_height(h, strength):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * strength
    dy = (np.roll(h, -1, 0) - np.roll(h, 1, 0)) * strength
    n = np.stack([-dx, dy, np.ones_like(h)], -1); n /= np.linalg.norm(n, axis=-1, keepdims=True)
    return ((n * 0.5 + 0.5) * 255).astype(np.uint8)

def save(name, albedo, height, rough, ao, metal=0.0, nstrength=6.0):
    n = albedo.shape[0]
    Image.fromarray((np.clip(albedo, 0, 1) * 255).astype(np.uint8)).save(f"{out}/{name}_albedo.jpg", quality=88)
    Image.fromarray(normal_from_height(height, nstrength)).save(f"{out}/{name}_normal.png", optimize=True)
    orm = np.stack([np.clip(ao, 0, 1), np.clip(rough, 0, 1), np.full((n, n), metal)], -1)
    Image.fromarray((orm * 255).astype(np.uint8)).save(f"{out}/{name}_orm.jpg", quality=88)

def tiles_mask(n, count, grout):
    """Griglia di piastrelle: 1 = piastrella, 0 = fuga. Ritorna anche indice piastrella per variazione."""
    y, x = np.mgrid[0:n, 0:n]; cell = n / count
    fx = (x % cell) / cell; fy = (y % cell) / cell
    inner = (fx > grout) & (fy > grout)
    idx = (y // cell).astype(int) * count + (x // cell).astype(int)
    return inner.astype(float), idx

# Pavimento: texture scaricata, convertita con tools/convert_floor_texture.py (vedi ASSET_REGISTRY T07)

# Pareti e metallo scaffali: set scaricati, vedi tools/convert_wall_metal_textures.py (ASSET_REGISTRY T08/T09)

# --- Soffitto: pannelli 0.6 m (2x2 in 1.2 m) con profilo a T ------------------------------------------------
n = 512
inner, idx = tiles_mask(n, 2, 0.03)
n1, n2 = pnoise(n, 2.4, 21), pnoise(n, 1.8, 22)
rng2 = np.random.default_rng(9); tone = (rng2.random(4) - 0.5) * 0.05
alb = (0.56 + tone[idx] + 0.07 * (n1 - 0.5))
alb = np.where(inner > 0.5, alb, 0.20)
col = np.stack([alb * 0.97, alb * 0.99, alb * 1.01], -1)
height = inner * 0.4 + 0.25 * n2
rough = 0.85 + 0.1 * n1
ao = 0.6 + 0.4 * inner
save("ceiling", col, height, rough, ao, 0.0, 4.0)
# --- Acciaio verniciato grigio sporco (accenti degli scaffali): look "vecchio" procedurale, 512 ripetibile -------------
n = 512
g1, g2, g3 = pnoise(n, 2.2, 31), pnoise(n, 1.4, 32), pnoise(n, 3.0, 33)
yy = np.linspace(0, 2 * np.pi, n, endpoint=False)[:, None]
grime = np.clip(0.55 * g1 + 0.35 * (0.5 + 0.5 * np.cos(yy)) * g3 - 0.12, 0, 1)  # più sporco verso il basso
chips = np.clip((g2 - 0.8) * 6, 0, 1)  # scheggiature di vernice
base = np.array([0.66, 0.69, 0.72])[None, None, :]
dirt = np.array([0.17, 0.16, 0.15])[None, None, :]
col = base * (1 - grime[..., None] * 0.8) + dirt * grime[..., None] * 0.8
col = col * (1 - 0.5 * chips[..., None]) + np.array([0.55, 0.57, 0.6])[None, None, :] * 0.5 * chips[..., None]
save("shelfpaint", col, 0.5 * g1 + 0.5 * g3 + chips * 0.6, 0.45 + 0.3 * grime, 0.7 + 0.3 * (1 - grime), 0.2 + 0.5 * chips, 3.0)
print("TEXTURES ok", sorted(os.listdir(out)))
