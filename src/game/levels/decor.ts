import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3, Vector4 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import type { Scene } from "@babylonjs/core/scene";
import signsUrl from "../../../assets/exported/textures/signs.jpg?url";
import cartonsUrl from "../../../assets/exported/textures/cartons.jpg?url";
import fridgesUrl from "../../../assets/exported/textures/fridges.jpg?url";
import decalsUrl from "../../../assets/exported/textures/decals.png?url";
import { ZONE1 } from "./zone1";

/** Rettangolo in pixel (x0,y0,x1,y1) di una texture 1024×1024 → UV Babylon (v verso l'alto). */
const uv = (r: [number, number, number, number]): Vector4 => new Vector4(r[0] / 1024, 1 - r[3] / 1024, r[2] / 1024, 1 - r[1] / 1024);

// --- cartelli (signs.jpg, generato con Gemini) ---------------------------------------------------------------------
const SIGN: Record<string, [number, number, number, number]> = {
  aisle1: [14, 16, 240, 190], aisle2: [270, 16, 497, 190], aisle3: [527, 16, 753, 190], aisle4: [784, 16, 1010, 190],
  beverages: [12, 228, 242, 382], canned: [270, 228, 498, 382], frozen: [526, 228, 754, 382], bakery: [782, 228, 1010, 382],
  exit: [12, 450, 242, 540], warehouse: [268, 420, 498, 572], checkout1: [820, 408, 970, 602], checkout2: [50, 606, 200, 798], offer: [268, 632, 498, 754],
};

// --- cartoni e casse (cartons.jpg): celle 256 px, indice = riga*4 + colonna ----------------------------------------------
const cell = (i: number): [number, number, number, number] => { const c = i % 4, r = Math.floor(i / 4); return [c * 256 + 6, r * 256 + 6, c * 256 + 250, r * 256 + 250]; };
interface Stack { x: number; z: number; yaw: number; kinds: number[][]; }  // kinds[livello] = celle dei lati per ogni scatola del livello
const BRAND = [4, 5, 6, 7];

// --- decalcomanie (decals.png): celle 256 px; solo quelle su fondo nero ---------------------------------------------------
const DECALS: { cell: number; x: number; z: number; size: number; rot: number }[] = [
  { cell: 3, x: -4.4, z: -9.0, size: 1.7, rot: 0.4 }, { cell: 6, x: -4.0, z: -6.6, size: 0.9, rot: 2.2 }, { cell: 5, x: -4.7, z: -7.6, size: 0.7, rot: 0.0 },
  { cell: 4, x: -8.8, z: 2.0, size: 2.2, rot: 1.9 }, { cell: 7, x: -8.6, z: 5.5, size: 1.5, rot: 0.3 }, { cell: 2, x: -13.2, z: 6.0, size: 1.6, rot: 5.0 },
  { cell: 0, x: 4.4, z: -3.0, size: 1.3, rot: 1.2 }, { cell: 1, x: 4.3, z: 0.5, size: 1.4, rot: 3.0 }, { cell: 3, x: 13.2, z: 7.0, size: 1.9, rot: 2.7 },
  { cell: 12, x: -2.0, z: -12.0, size: 1.8, rot: 0.8 }, { cell: 14, x: 0.5, z: 10.8, size: 1.6, rot: 1.0 }, { cell: 9, x: -17.0, z: -12.0, size: 1.5, rot: 0.0 },
  { cell: 10, x: 8.8, z: 11.0, size: 1.3, rot: 0.2 }, { cell: 11, x: 12.0, z: -8.5, size: 1.8, rot: 4.0 }, { cell: 13, x: 15.5, z: -2.0, size: 1.0, rot: 0.0 },
  { cell: 5, x: 11.0, z: -8.0, size: 0.8, rot: 1.0 }, { cell: 2, x: 0.5, z: -5.8, size: 1.3, rot: 2.0 },
];
const decalUv = (i: number): Vector4 => { const c = i % 4, r = Math.floor(i / 4); return uv([c * 256 + 4, r * 256 + 4, c * 256 + 252, r * 256 + 252]); };

const STACKS: Stack[] = [
  { x: -18.8, z: -13.6, yaw: 0.1, kinds: [[4, 5], [6]] }, { x: -17.2, z: -14.1, yaw: -0.15, kinds: [[7, 4]] },
  { x: 18.6, z: -13.7, yaw: 0.05, kinds: [[5, 6], [7, 4], [5]] }, { x: 16.0, z: -14.2, yaw: 0.2, kinds: [[6]] },
  { x: -18.9, z: 12.2, yaw: 0.0, kinds: [[7, 5], [4]] }, { x: 18.7, z: 12.3, yaw: -0.1, kinds: [[4, 6], [5, 7]] },
  { x: 18.9, z: 10.4, yaw: 0.2, kinds: [[8]] }, { x: -18.9, z: 10.2, yaw: 0.1, kinds: [[9], [9]] },
];

/** Cartelli, scatoloni, decalcomanie sporche, fronti di frigoriferi e casse: tutte texture generate con Gemini. */
export function buildDecor(scene: Scene): void {
  const tex = (url: string, alpha = false): Texture => { const t = new Texture(url, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE); t.anisotropicFilteringLevel = 8; t.hasAlpha = alpha; return t; };
  const std = (name: string, t: Texture, emissive = 0): StandardMaterial => {
    const m = new StandardMaterial(name, scene); m.diffuseTexture = t; m.specularColor = new Color3(0.06, 0.06, 0.06); m.maxSimultaneousLights = 6;
    if (emissive > 0) { m.emissiveTexture = t; m.emissiveColor = new Color3(emissive, emissive, emissive); }
    return m;
  };

  // Cartelli appesi/a muro
  const signM = std("signs", tex(signsUrl), 0.32);
  const sign = (key: string, w: number, x: number, y: number, z: number, rotY: number, hang = false): void => {
    const r = SIGN[key] as [number, number, number, number]; const h = (w * (r[3] - r[1])) / (r[2] - r[0]);
    const p = MeshBuilder.CreatePlane(`sign-${key}-${x}`, { width: w, height: h, sideOrientation: Mesh.DOUBLESIDE, frontUVs: uv(r), backUVs: uv(r) }, scene);
    p.position.set(x, y, z); p.rotation.y = rotY; p.material = signM; p.isPickable = false; p.freezeWorldMatrix();
    if (hang) for (const dx of [-w * 0.4, w * 0.4]) {
      const len = ZONE1.ceiling - (y + h / 2); const cable = MeshBuilder.CreateBox(`cable-${key}-${x}-${dx}`, { width: 0.012, height: len, depth: 0.012 }, scene);
      cable.position.set(x + dx * Math.cos(rotY), y + h / 2 + len / 2, z - dx * Math.sin(rotY)); cable.material = signM; cable.isPickable = false; cable.freezeWorldMatrix();
    }
  };
  const aisles = [-13.2, -8.8, -4.4, 0, 4.4, 8.8, 13.2], names = ["aisle1", "aisle2", "aisle3", "aisle4", "beverages", "canned", "frozen"];
  aisles.forEach((x, i) => sign(names[i] as string, 0.95, x, 2.75, -5.7, Math.PI, true));
  sign("exit", 0.9, -15, 2.85, -14.78, Math.PI); sign("warehouse", 1.1, 19.78, 2.2, 0, Math.PI / 2);
  sign("checkout1", 0.55, 8.5, 2.7, -11, Math.PI, true); sign("checkout2", 0.55, 11.5, 2.7, -11, Math.PI, true);
  sign("offer", 1.3, 5, 2.3, -14.78, Math.PI); sign("bakery", 1.0, 0, 2.5, 14.78, 0);

  // Scatoloni a pila (brand, casse di legno/plastica)
  const cartonM = std("cartons", tex(cartonsUrl));
  const top = uv(cell(0)), taped = uv(cell(15));
  for (const s of STACKS) {
    s.kinds.forEach((level, li) => level.forEach((c, bi) => {
      const crate = c >= 8; const w = crate ? 0.6 : 0.5, h = crate ? 0.34 : 0.4, d = crate ? 0.4 : 0.42;
      const side = uv(cell(c));
      const box = MeshBuilder.CreateBox(`carton-${s.x}-${li}-${bi}`, { width: w, height: h, depth: d, faceUV: [side, side, side, side, li === 0 && bi === 0 ? taped : top, top] }, scene);
      const lx = (bi - (level.length - 1) / 2) * (w + 0.02), ly = li * (h + 0.005) + h / 2;
      box.position.set(s.x + Math.cos(s.yaw) * lx, ly, s.z - Math.sin(s.yaw) * lx); box.rotation.y = s.yaw + li * 0.07;
      box.material = cartonM; box.checkCollisions = true; box.freezeWorldMatrix();
    }));
  }
  void BRAND;

  // Decalcomanie sul pavimento
  const decalM = std("decals", tex(decalsUrl, true)); decalM.useAlphaFromDiffuseTexture = true; decalM.specularColor = Color3.Black(); decalM.zOffset = -2; decalM.backFaceCulling = false;
  decalM.alpha = 0.92;
  DECALS.forEach((d, i) => {
    const p = MeshBuilder.CreatePlane(`decal-${i}`, { size: d.size, sideOrientation: Mesh.DOUBLESIDE, frontUVs: decalUv(d.cell), backUVs: decalUv(d.cell) }, scene);
    p.position.set(d.x, 0.012 + i * 0.0004, d.z); p.rotation.x = Math.PI / 2; p.rotation.y = d.rot; p.material = decalM; p.isPickable = false; p.freezeWorldMatrix();
  });

  // Fronti: frigoriferi a vetri sul muro nord, casse con pannello e nastro
  const fridgeM = std("fridges", tex(fridgesUrl), 0.18);
  for (const f of ZONE1.freezers) {
    const front = MeshBuilder.CreatePlane(`fridge-front-${f.x}`, { width: f.w, height: f.h ?? 2.1, sideOrientation: Mesh.DOUBLESIDE, frontUVs: uv([14, 14, 498, 492]), backUVs: uv([14, 14, 498, 492]) }, scene);
    front.position.set(f.x, (f.h ?? 2.1) / 2, f.z - f.d / 2 - 0.01); front.material = fridgeM; front.isPickable = false; front.freezeWorldMatrix();
  }
  for (const c of ZONE1.checkouts) {
    const hh = c.h ?? 1;
    for (const sx of [-1, 1]) {
      const panel = MeshBuilder.CreatePlane(`co-panel-${c.x}-${sx}`, { width: c.d, height: hh, sideOrientation: Mesh.DOUBLESIDE, frontUVs: uv([22, 600, 488, 930]), backUVs: uv([22, 600, 488, 930]) }, scene);
      panel.position.set(c.x + sx * (c.w / 2 + 0.005), hh / 2, c.z); panel.rotation.y = sx * (Math.PI / 2); panel.material = fridgeM; panel.isPickable = false; panel.freezeWorldMatrix();
    }
    const belt = MeshBuilder.CreatePlane(`co-belt-${c.x}`, { width: c.w, height: c.d, sideOrientation: Mesh.DOUBLESIDE, frontUVs: uv([560, 520, 1010, 1010]), backUVs: uv([560, 520, 1010, 1010]) }, scene);
    belt.position.set(c.x, hh + 0.004, c.z); belt.rotation.x = Math.PI / 2; belt.material = fridgeM; belt.isPickable = false; belt.freezeWorldMatrix();
  }
  void Vector3;
}
