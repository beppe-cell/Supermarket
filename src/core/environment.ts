import "@babylonjs/core/Engines/Extensions/engine.rawTexture";
import { Constants } from "@babylonjs/core/Engines/constants";
import { RawCubeTexture } from "@babylonjs/core/Materials/Textures/rawCubeTexture";
import { HDRFiltering } from "@babylonjs/core/Materials/Textures/Filtering/hdrFiltering";
import type { Scene } from "@babylonjs/core/scene";

/**
 * Mappa ambiente procedurale dell'interno del supermercato (nessun asset): soffitto buio con file di neon freddi,
 * pareti grigie, pavimento scuro, qualche punto rosso (luci d'emergenza). Serve ai riflessi PBR (metalli, piastrelle smaltate).
 * Radianza in lineare HDR; prefiltrata a runtime da HDRFiltering.
 */
function radiance(x: number, y: number, z: number): [number, number, number] {
  let r = 0.05, g = 0.058, b = 0.07; // pareti
  if (y > 0.15) { // soffitto: pannelli + file di neon ogni 6 m a quota 3.6 m (piano proiettato)
    const t = 3.6 / y, px = x * t, pz = z * t;
    const row = Math.abs(((pz / 6) % 1 + 1) % 1 - 0.5) < 0.04;
    const seg = Math.abs(((px / 10) % 1 + 1) % 1 - 0.5) < 0.12;
    const k = Math.min(1, (y - 0.15) * 3);
    r = g = b = 0.06 * k + 0.05 * (1 - k);
    if (row && seg) { r = 7; g = 8.2; b = 8; }
  } else if (y < -0.1) { // pavimento
    r = 0.045; g = 0.05; b = 0.06;
  }
  // luci d'emergenza rosse su 3 direzioni orizzontali
  for (const [dx, dz] of [[1, 0], [-0.7, -0.7], [-0.7, 0.7]] as const) {
    const d = x * dx + z * dz; // x,z già normalizzati con y
    if (d > 0.985 && Math.abs(y - 0.25) < 0.08) { r += 5; g += 0.2; b += 0.2; }
  }
  return [r, g, b];
}

/** Crea e assegna `scene.environmentTexture`. Ritorna false se il dispositivo non supporta il prefiltro (si prosegue senza riflessi). */
export async function createEnvironment(scene: Scene, size = 32): Promise<boolean> {
  try {
    const faces: Float32Array[] = [];
    // ordine facce: +X, -X, +Y, -Y, +Z, -Z
    const dir = [
      (u: number, v: number): [number, number, number] => [1, -v, -u],
      (u: number, v: number): [number, number, number] => [-1, -v, u],
      (u: number, v: number): [number, number, number] => [u, 1, v],
      (u: number, v: number): [number, number, number] => [u, -1, -v],
      (u: number, v: number): [number, number, number] => [u, -v, 1],
      (u: number, v: number): [number, number, number] => [-u, -v, -1],
    ];
    for (const f of dir) {
      const data = new Float32Array(size * size * 4);
      for (let j = 0; j < size; j++) for (let i = 0; i < size; i++) {
        const u = ((i + 0.5) / size) * 2 - 1, v = ((j + 0.5) / size) * 2 - 1;
        const [dx, dy, dz] = f(u, v), l = Math.hypot(dx, dy, dz);
        const [r, g, b] = radiance(dx / l, dy / l, dz / l);
        const o = (j * size + i) * 4; data[o] = r; data[o + 1] = g; data[o + 2] = b; data[o + 3] = 1;
      }
      faces.push(data);
    }
    const tex = new RawCubeTexture(scene, faces, size, Constants.TEXTUREFORMAT_RGBA, Constants.TEXTURETYPE_FLOAT, true, false, Constants.TEXTURE_TRILINEAR_SAMPLINGMODE);
    tex.gammaSpace = false;
    await new HDRFiltering(scene.getEngine()).prefilter(tex);
    scene.environmentTexture = tex;
    scene.environmentIntensity = 1;
    return true;
  } catch (e) {
    console.warn("Mappa ambiente non disponibile:", e);
    return false;
  }
}
