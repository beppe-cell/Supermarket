"""Texture PBR ripetibili per l'ambiente (look C: grigi freddi, sporco, usura), generate proceduralmente.
Output in <out>/: <name>_albedo.jpg, <name>_normal.png (OpenGL, Y+), <name>_orm.jpg (R=AO, G=roughness, B=metallic).
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

# --- Pavimento: piastrelle in vinile 0.5 m (4x4 in 2 m), grigio freddo, sporco e graffi -------------------------
n = 1024
inner, idx = tiles_mask(n, 4, 0.025)
tone = (rng.random(16) - 0.5) * 0.06
base = 0.40 + tone[idx]
grime = pnoise(n, 2.4, 1)
scuff = pnoise(n, 1.2, 2)
alb = base * (0.80 + 0.35 * grime) * (0.92 + 0.12 * scuff)
alb = np.where(inner > 0.5, alb, 0.12 + 0.05 * grime)  # fughe scure
stain = np.clip((pnoise(n, 3.0, 3) - 0.82) * 3, 0, 1) * 0.3  # macchie scure rarefatte
alb = alb * (1 - stain)
col = np.stack([alb * 0.93, alb * 0.97, alb * 1.03], -1)  # tinta fredda
height = inner * 0.5 + 0.35 * scuff + 0.15 * grime
rough = 0.38 + 0.38 * grime + 0.15 * (1 - inner) - 0.1 * (1 - scuff)  # più lucido dove pulito
ao = 0.55 + 0.45 * inner
save("floor", col, height, rough, ao, 0.0, 5.0)

# --- Pareti: intonaco sporco, 2 m ripetibile --------------------------------------------------------------------
n = 512
n1, n2, n3 = pnoise(n, 2.2, 11), pnoise(n, 3.2, 12), pnoise(n, 1.6, 13)
alb = 0.52 + 0.14 * (n1 - 0.5) + 0.06 * (n3 - 0.5)
streak = pnoise(n, 3.4, 14)
streaks = np.clip((np.roll(streak, 0, 0) - 0.6) * 2.2, 0, 1) * 0.25
alb = alb * (1 - streaks)
col = np.stack([alb * 0.95, alb * 0.98, alb * 1.02], -1)
height = 0.5 * n2 + 0.5 * n3
rough = 0.72 + 0.2 * n1
ao = 0.8 + 0.2 * n2
save("wall", col, height, rough, ao, 0.0, 3.0)

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
print("TEXTURES ok", sorted(os.listdir(out)))
