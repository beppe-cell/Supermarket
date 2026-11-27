import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3, Vector4 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture";
import { ParticleSystem } from "@babylonjs/core/Particles/particleSystem";
import "@babylonjs/core/Particles/particleSystemComponent";
import type { QualityProfile } from "../../core/quality";
import type { Scene } from "@babylonjs/core/scene";
import signsUrl from "../../../assets/exported/textures/signs.jpg?url";
import cartonsUrl from "../../../assets/exported/textures/cartons.jpg?url";
import fridgesUrl from "../../../assets/exported/textures/fridges.jpg?url";
import keycardUrl from "../../../assets/exported/textures/keycard.png?url";
import decalsUrl from "../../../assets/exported/textures/decals.png?url";
import { ZONE1, type Box } from "./zone1";

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
const BRAND = [4, 5, 6, 7];

// --- decalcomanie (decals.png): celle 256 px; solo quelle su fondo nero ---------------------------------------------------
const DECALS: { cell: number; x: number; z: number; size: number; rot: number }[] = [
  { cell: 3, x: -5.75, z: -16.5, size: 1.7, rot: 0.4 }, { cell: 6, x: -5.5, z: -14.6, size: 0.9, rot: 2.2 }, { cell: 5, x: -6.0, z: -15.4, size: 0.7, rot: 0.0 },
  { cell: 4, x: -8.8, z: 4.0, size: 2.2, rot: 1.9 }, { cell: 7, x: -8.6, z: 8.5, size: 1.5, rot: 0.3 }, { cell: 2, x: -13.2, z: 6.0, size: 1.6, rot: 5.0 },
  { cell: 0, x: 4.4, z: -3.0, size: 1.3, rot: 1.2 }, { cell: 1, x: 4.3, z: 0.5, size: 1.4, rot: 3.0 }, { cell: 3, x: 13.2, z: 7.0, size: 1.9, rot: 2.7 },
  { cell: 12, x: -2.0, z: -20.0, size: 1.8, rot: 0.8 }, { cell: 14, x: 0.5, z: 15.8, size: 1.6, rot: 1.0 }, { cell: 9, x: -22, z: -9.0, size: 1.5, rot: 0.0 },
  { cell: 10, x: 8.8, z: 11.0, size: 1.3, rot: 0.2 }, { cell: 11, x: 12.0, z: -8.5, size: 1.8, rot: 4.0 }, { cell: 13, x: 24.5, z: -2.0, size: 1.0, rot: 0.0 },
  { cell: 5, x: 11.0, z: -8.0, size: 0.8, rot: 1.0 }, { cell: 2, x: 0.5, z: 1.8, size: 1.3, rot: 2.0 }, { cell: 4, x: 17.6, z: 3.0, size: 2.0, rot: 0.6 },
  { cell: 1, x: -22, z: 10.0, size: 1.4, rot: 2.4 }, { cell: 3, x: -26.4, z: 6.0, size: 1.8, rot: 1.4 }, { cell: 6, x: 22, z: -4.0, size: 1.0, rot: 3.6 },
  { cell: 14, x: -17.6, z: -3.0, size: 1.5, rot: 0.9 }, { cell: 12, x: 13.2, z: 18.0, size: 1.7, rot: 2.1 }, { cell: 7, x: 0, z: 5.0, size: 1.6, rot: 4.2 },
  { cell: 0, x: -13.2, z: 15.8, size: 1.1, rot: 0.5 }, { cell: 3, x: 29.5, z: 0.0, size: 2.0, rot: 1.0 }, { cell: 4, x: -30, z: 14, size: 1.8, rot: 0.2 },
];
const decalUv = (i: number): Vector4 => { const c = i % 4, r = Math.floor(i / 4); return uv([c * 256 + 4, r * 256 + 4, c * 256 + 252, r * 256 + 252]); };

/** Pile negli angoli (non percorsi dai nemici). */
const CORNER_STACKS: Box[] = [
  { x: -30.8, z: -22.8, w: 1.6, d: 1.0, h: 1.2 }, { x: 30.8, z: -22.8, w: 1.6, d: 1.0, h: 1.6 }, { x: -30.8, z: 22.4, w: 1.6, d: 1.0, h: 1.2 }, { x: 30.8, z: 22.4, w: 1.6, d: 1.0, h: 1.2 },
];

/** Cartelli, scatoloni, decalcomanie sporche, fronti di frigoriferi e casse: tutte texture generate con Gemini. */
export interface Decor {
  /** La tessera elettronica sullo scaffale (mesh radice; si raccoglie passandoci vicino). */
  keycard: Mesh;
  /** Aggiorna lampeggio della tessera (solo vicino) e nebbia: chiamare ogni frame. */
  tick(t: number, px: number, pz: number): void;
}

export function buildDecor(scene: Scene, q: QualityProfile): Decor {
  const merge = (list: Mesh[], name: string, m: StandardMaterial, collide = false): void => {
    if (list.length === 0) return;
    const mm = Mesh.MergeMeshes(list, true, true); if (!mm) return;
    mm.name = name; mm.material = m; mm.isPickable = false; mm.checkCollisions = collide; mm.freezeWorldMatrix();
  };
  const tex = (url: string, alpha = false): Texture => { const t = new Texture(url, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE); t.anisotropicFilteringLevel = 8; t.hasAlpha = alpha; return t; };
  const std = (name: string, t: Texture, emissive = 0): StandardMaterial => {
    const m = new StandardMaterial(name, scene); m.diffuseTexture = t; m.specularColor = new Color3(0.06, 0.06, 0.06); m.maxSimultaneousLights = 6;
    if (emissive > 0) { m.emissiveTexture = t; m.emissiveColor = new Color3(emissive, emissive, emissive); }
    return m;
  };

  // Cartelli appesi/a muro
  const signM = std("signs", tex(signsUrl), 0.32);
  const signParts: Mesh[] = [];
  const sign = (key: string, w: number, x: number, y: number, z: number, rotY: number, hang = false): void => {
    const r = SIGN[key] as [number, number, number, number]; const h = (w * (r[3] - r[1])) / (r[2] - r[0]);
    const p = MeshBuilder.CreatePlane(`sign-${key}-${x}`, { width: w, height: h, sideOrientation: Mesh.DOUBLESIDE, frontUVs: uv(r), backUVs: uv(r) }, scene);
    p.position.set(x, y, z); p.rotation.y = rotY; signParts.push(p);
    if (hang) for (const dx of [-w * 0.4, w * 0.4]) {
      const len = ZONE1.ceiling - (y + h / 2); const cable = MeshBuilder.CreateBox(`cable-${key}-${x}-${dx}`, { width: 0.012, height: len, depth: 0.012 }, scene);
      cable.position.set(x + dx * Math.cos(rotY), y + h / 2 + len / 2, z - dx * Math.sin(rotY)); signParts.push(cable);
    }
  };
  const names = ["aisle1", "aisle2", "aisle3", "aisle4", "beverages", "canned", "frozen", "bakery"];
  ZONE1.aisleX.forEach((x, i) => sign(names[i % 8] as string, 0.95, x, 2.75, -7.1, Math.PI, true));          // all'imbocco di ogni corsia (lato casse)
  ZONE1.aisleX.forEach((x, i) => sign(names[(i + 3) % 8] as string, 0.95, x, 2.75, 14.6, 0, true));          // e sul lato retro
  sign("exit", 0.9, 0, 2.95, -23.78, Math.PI); sign("warehouse", 1.1, 31.78, 2.2, 0, Math.PI / 2);
  ZONE1.checkouts.forEach((c, i) => sign(i % 2 ? "checkout2" : "checkout1", 0.5, c.x, 2.75, c.z, Math.PI, true));
  for (const x of [-15, 15]) sign("offer", 1.3, x, 2.5, -18.6, Math.PI, true);
  sign("offer", 1.3, -9.5, 2.4, -23.78, Math.PI); sign("offer", 1.3, 9.5, 2.4, -23.78, Math.PI);
  for (const x of [-13.2, 0, 13.2]) sign("frozen", 1.2, x, 2.75, 23.78, 0);
  merge(signParts, "signs", signM);

  // Pile di cartoni/casse: isole promozionali all'ingresso, banchi ortofrutta, angoli. Una sola mesh grafica, collisione = una scatola per isola.
  const cartonM = std("cartons", tex(cartonsUrl));
  const top = uv(cell(0)), taped = uv(cell(15)); const cartonParts: Mesh[] = [];
  const fill = (b: Box, cells: number[], seed: number): void => {
    const cw = 0.5, cd = 0.42, ch = 0.4;
    const cols = Math.max(1, Math.floor(b.w / (cw + 0.02))), rows = Math.max(1, Math.floor(b.d / (cd + 0.02))), lv = Math.max(1, Math.round((b.h ?? 1) / ch));
    const ox = b.x - (cols * (cw + 0.02)) / 2 + cw / 2 + 0.01, oz = b.z - (rows * (cd + 0.02)) / 2 + cd / 2 + 0.01;
    for (let l = 0; l < lv; l++) for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const hsh = (c * 7 + r * 3 + l * 5 + seed) >>> 0, cellId = cells[hsh % cells.length] as number, crate = cellId >= 8;
      const w = crate ? 0.6 : cw, h = crate ? 0.34 : ch, d = crate ? 0.4 : cd, side = uv(cell(cellId));
      if (crate && c * (cw + 0.02) + w > cols * (cw + 0.02)) continue;
      const box = MeshBuilder.CreateBox(`carton-${b.x}-${l}-${r}-${c}`, { width: w, height: h, depth: d, faceUV: [side, side, side, side, l === lv - 1 && (hsh % 3 === 0) ? taped : top, top] }, scene);
      box.position.set(ox + c * (cw + 0.02), l * (ch + 0.004) + h / 2, oz + r * (cd + 0.02)); box.rotation.y = ((hsh % 7) - 3) * 0.012;
      cartonParts.push(box);
    }
    const col = MeshBuilder.CreateBox(`carton-col-${b.x}-${b.z}`, { width: b.w, depth: b.d, height: b.h ?? 1 }, scene);
    col.position.set(b.x, (b.h ?? 1) / 2, b.z); col.isVisible = false; col.checkCollisions = true; col.isPickable = false; col.freezeWorldMatrix();
  };
  ZONE1.promo.forEach((b, i) => fill(b, BRAND, i * 11));
  ZONE1.produce.forEach((b, i) => fill(b, [8, 9, 10, 8], i * 5));
  CORNER_STACKS.forEach((b, i) => fill(b, [...BRAND, 8, 9], i * 13));
  merge(cartonParts, "cartons", cartonM, false);

  // Cassa centrale: cabina a vetri sopra il banco (cornice, vetri, tetto) + striscioni con testo (canvas)
  {
    const o = ZONE1.cashOffice, hy = o.h ?? 1.15, top2 = 2.75, hh = top2 - hy;
    const glassM = new StandardMaterial("glass", scene); glassM.diffuseColor = new Color3(0.5, 0.65, 0.72); glassM.alpha = 0.18; glassM.specularColor = new Color3(0.9, 0.9, 0.9); glassM.specularPower = 80; glassM.backFaceCulling = false;
    const frameM = new StandardMaterial("glass-frame", scene); frameM.diffuseColor = new Color3(0.13, 0.15, 0.17); frameM.specularColor = new Color3(0.2, 0.2, 0.2);
    const panes: Mesh[] = [], frames: Mesh[] = [];
    const pane = (w: number, x: number, z: number, rotY: number): void => { const m = MeshBuilder.CreatePlane(`pane-${x}-${z}`, { width: w, height: hh, sideOrientation: Mesh.DOUBLESIDE }, scene); m.position.set(x, hy + hh / 2, z); m.rotation.y = rotY; panes.push(m); };
    pane(o.w, o.x, o.z - o.d / 2 + 0.05, 0); pane(o.w, o.x, o.z + o.d / 2 - 0.05, 0); pane(o.d, o.x - o.w / 2 + 0.05, o.z, Math.PI / 2); pane(o.d, o.x + o.w / 2 - 0.05, o.z, Math.PI / 2);
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { const pst = MeshBuilder.CreateBox(`post-${sx}-${sz}`, { width: 0.1, height: hh, depth: 0.1 }, scene); pst.position.set(o.x + sx * (o.w / 2 - 0.05), hy + hh / 2, o.z + sz * (o.d / 2 - 0.05)); frames.push(pst); }
    const roof = MeshBuilder.CreateBox("cash-roof", { width: o.w + 0.3, height: 0.12, depth: o.d + 0.3 }, scene); roof.position.set(o.x, top2 + 0.06, o.z); frames.push(roof);
    for (const z of [-1, 1]) { const rail = MeshBuilder.CreateBox("cash-rail", { width: o.w, height: 0.06, depth: 0.06 }, scene); rail.position.set(o.x, hy + 1.0, o.z + z * (o.d / 2 - 0.05)); frames.push(rail); }
    merge(panes, "cash-glass", glassM); merge(frames, "cash-frame", frameM);
  }
  const banner = (title: string, sub: string, w: number, h: number, x: number, y: number, z: number, rotY: number, bg: string, hang = true): void => {
    const px = 1024, py = Math.round((1024 * h) / w);
    const t = new DynamicTexture(`banner-${title}`, { width: px, height: py }, scene, true); const c = t.getContext() as unknown as CanvasRenderingContext2D;
    c.fillStyle = bg; c.fillRect(0, 0, px, py); c.strokeStyle = "rgba(255,255,255,0.55)"; c.lineWidth = 10; c.strokeRect(12, 12, px - 24, py - 24);
    c.fillStyle = "#f2f6f5"; c.textAlign = "center"; c.font = `bold ${Math.round(py * 0.42)}px sans-serif`; c.fillText(title, px / 2, py * (sub ? 0.56 : 0.66));
    if (sub) { c.font = `600 ${Math.round(py * 0.17)}px sans-serif`; c.fillStyle = "rgba(255,255,255,0.8)"; c.fillText(sub, px / 2, py * 0.86); }
    t.update();
    const m = new StandardMaterial(`banner-${title}`, scene); m.diffuseTexture = t; m.emissiveTexture = t; m.emissiveColor = new Color3(0.35, 0.35, 0.35); m.specularColor = Color3.Black(); m.backFaceCulling = true;
    for (const side of [0, 1]) {
      const pl = MeshBuilder.CreatePlane(`banner-${title}-${side}`, { width: w, height: h }, scene);
      const nx = Math.sin(rotY), nz = Math.cos(rotY); const off = side ? 0.02 : -0.02;           // le due facce leggibili da entrambi i lati
      pl.position.set(x + nx * off * -1, y, z + nz * off * -1); pl.rotation.y = rotY + (side ? Math.PI : 0); pl.material = m; pl.isPickable = false; pl.freezeWorldMatrix();
    }
    if (hang) for (const dx of [-w * 0.42, w * 0.42]) {
      const len = ZONE1.ceiling - (y + h / 2); const cable = MeshBuilder.CreateBox(`bcable-${title}-${dx}`, { width: 0.014, height: len, depth: 0.014 }, scene);
      cable.position.set(x + dx * Math.cos(rotY), y + h / 2 + len / 2, z - dx * Math.sin(rotY)); cable.material = frameM2(); cable.isPickable = false; cable.freezeWorldMatrix();
    }
  };
  let _fm: StandardMaterial | undefined; const frameM2 = (): StandardMaterial => (_fm ??= (() => { const m = new StandardMaterial("cable", scene); m.diffuseColor = new Color3(0.1, 0.11, 0.12); return m; })());
  banner("PROMOZIONI", "OFFERTE DELLA SETTIMANA", 5.2, 1.2, 0, 3.0, -16.4, 0, "#a3171c");
  banner("CASSA CENTRALE", "SERVIZIO CLIENTI · RESI", 4.4, 0.9, 0, 3.2, -9.9, 0, "#1d3a6b");
  banner("CASSE", "", 2.2, 0.6, -17, 3.05, -9.2, 0, "#1d3a6b"); banner("CASSE", "", 2.2, 0.6, 17, 3.05, -9.2, 0, "#1d3a6b");
  banner("ORTOFRUTTA", "FRESCO", 3.0, 0.8, -30.3, 3.1, 4.5, Math.PI / 2, "#25643a");
  banner("SURGELATI", "BANCO FRIGO", 3.4, 0.8, 0, 3.15, 22.3, Math.PI, "#1d5f78");
  banner("BEVANDE", "ACQUA · BIBITE", 3.0, 0.8, 27.6, 3.0, -14, -Math.PI / 2, "#7a5a16");
  banner("MAGAZZINO", "SOLO PERSONALE", 3.0, 0.8, 31.5, 3.2, 0, -Math.PI / 2, "#6e1d20", false);

  // Decalcomanie sul pavimento
  const decalM = std("decals", tex(decalsUrl, true)); decalM.useAlphaFromDiffuseTexture = true; decalM.specularColor = Color3.Black(); decalM.zOffset = -2; decalM.backFaceCulling = false;
  decalM.alpha = 0.92;
  const decalParts: Mesh[] = [];
  DECALS.forEach((d, i) => {
    const p = MeshBuilder.CreatePlane(`decal-${i}`, { size: d.size, sideOrientation: Mesh.DOUBLESIDE, frontUVs: decalUv(d.cell), backUVs: decalUv(d.cell) }, scene);
    p.position.set(d.x, 0.012 + i * 0.0004, d.z); p.rotation.x = Math.PI / 2; p.rotation.y = d.rot; decalParts.push(p);
  });
  merge(decalParts, "decals", decalM);

  // Fronti: frigoriferi a vetri sul muro nord, casse con pannello e nastro
  const fridgeM = std("fridges", tex(fridgesUrl), 0.18);
  const fridgeParts: Mesh[] = [];
  for (const f of ZONE1.freezers) {
    const front = MeshBuilder.CreatePlane(`fridge-front-${f.x}`, { width: f.w, height: f.h ?? 2.1, sideOrientation: Mesh.DOUBLESIDE, frontUVs: uv([14, 14, 498, 492]), backUVs: uv([14, 14, 498, 492]) }, scene);
    front.position.set(f.x, (f.h ?? 2.1) / 2, f.z - f.d / 2 - 0.01); fridgeParts.push(front);
  }
  for (const c of ZONE1.checkouts) {
    const hh = c.h ?? 1;
    for (const sx of [-1, 1]) {
      const panel = MeshBuilder.CreatePlane(`co-panel-${c.x}-${sx}`, { width: c.d, height: hh, sideOrientation: Mesh.DOUBLESIDE, frontUVs: uv([22, 600, 488, 930]), backUVs: uv([22, 600, 488, 930]) }, scene);
      panel.position.set(c.x + sx * (c.w / 2 + 0.005), hh / 2, c.z); panel.rotation.y = sx * (Math.PI / 2); fridgeParts.push(panel);
    }
    const belt = MeshBuilder.CreatePlane(`co-belt-${c.x}`, { width: c.w, height: c.d, sideOrientation: Mesh.DOUBLESIDE, frontUVs: uv([560, 520, 1010, 1010]), backUVs: uv([560, 520, 1010, 1010]) }, scene);
    belt.position.set(c.x, hh + 0.004, c.z); belt.rotation.x = Math.PI / 2; fridgeParts.push(belt);
  }
  merge(fridgeParts, "fridge-fronts", fridgeM);


  // --- Tessera elettronica: sullo scaffale, si accende lampeggiando solo se ti avvicini ---------------------------------
  const kp = ZONE1.pickups.find((p) => p.id === "key-warehouse") ?? { x: 1.86, y: 1.0, z: 1.5 };
  const cardTex = tex(keycardUrl, true);
  const cardM = new StandardMaterial("keycard", scene); cardM.diffuseTexture = cardTex; cardM.useAlphaFromDiffuseTexture = true; cardM.transparencyMode = StandardMaterial.MATERIAL_ALPHATEST; cardM.alphaCutOff = 0.5; cardM.backFaceCulling = false; cardM.specularColor = new Color3(0.5, 0.5, 0.5); cardM.specularPower = 48; cardM.maxSimultaneousLights = 6;
  const edge = new Vector4(0, 0, 0.002, 0.002);
  const keycard = MeshBuilder.CreateBox("keycard", { width: 0.14, height: 0.0045, depth: 0.0866, faceUV: [edge, edge, edge, edge, new Vector4(0, 0, 1, 1), edge] }, scene);
  keycard.position.set(kp.x, kp.y - 0.012, kp.z); keycard.rotation.y = 0.35; keycard.material = cardM; keycard.isPickable = false;
  const glowTex = new DynamicTexture("keycard-glow", 128, scene, true); { const c = glowTex.getContext(); const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, "rgba(120,255,210,1)"); g.addColorStop(0.25, "rgba(60,220,170,0.55)"); g.addColorStop(1, "rgba(0,0,0,0)"); c.fillStyle = g; c.fillRect(0, 0, 128, 128); glowTex.update(); glowTex.hasAlpha = true; }
  const glow = MeshBuilder.CreatePlane("keycard-glow", { size: 0.55 }, scene);
  const glowM = new StandardMaterial("keycard-glow", scene); glowM.emissiveTexture = glowTex; glowM.opacityTexture = glowTex; glowM.disableLighting = true; glowM.backFaceCulling = false; glowM.alphaMode = 1; // additivo
  glow.material = glowM; glow.billboardMode = Mesh.BILLBOARDMODE_ALL; glow.isPickable = false; glow.isVisible = false; glow.alwaysSelectAsActiveMesh = true;
  keycard.computeWorldMatrix(true); glow.position.copyFrom(keycard.getAbsolutePosition()); glow.position.y += 0.05;
  const NEAR = 4.5;
  buildMist(scene, q);

  return {
    keycard,
    tick(t, px, pz) {
      if (keycard.isDisposed()) { glow.dispose(); return; }
      const near = Math.hypot(px - kp.x, pz - kp.z) < NEAR;
      const on = near && Math.sin(t * 9) > 0;
      glow.isVisible = on;
      cardM.emissiveColor.set(0, on ? 0.3 : 0, on ? 0.22 : 0);
    },
  };
}

/** Nebbia: strati di sprite morbidi che vagano bassi nella sala (più fitti dove la qualità lo permette). */
function buildMist(scene: Scene, q: QualityProfile): void {
  const count = q.volumetricFog ? 46 : q.id === "low" ? 0 : 16;
  if (count === 0) return;
  const tex = new DynamicTexture("mist-tex", 128, scene, true); const c = tex.getContext();
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64); g.addColorStop(0, "rgba(255,255,255,0.9)"); g.addColorStop(0.5, "rgba(255,255,255,0.35)"); g.addColorStop(1, "rgba(255,255,255,0)");
  c.fillStyle = g; c.fillRect(0, 0, 128, 128); tex.update(); tex.hasAlpha = true;
  const ps = new ParticleSystem("mist", count, scene);
  ps.particleTexture = tex; ps.emitter = new Vector3(0, 0.3, 0);
  ps.minEmitBox = new Vector3(-19, 0, -14); ps.maxEmitBox = new Vector3(19, 1.6, 14);
  ps.minSize = 3.2; ps.maxSize = 5.5; ps.minLifeTime = 18; ps.maxLifeTime = 28; ps.emitRate = count / 20;
  ps.color1 = new Color4(0.62, 0.7, 0.74, 0.07); ps.color2 = new Color4(0.5, 0.58, 0.64, 0.05); ps.colorDead = new Color4(0.5, 0.58, 0.64, 0);
  ps.direction1 = new Vector3(0.2, 0, 0.08); ps.direction2 = new Vector3(-0.1, 0.02, -0.12); ps.minAngularSpeed = -0.05; ps.maxAngularSpeed = 0.05;
  ps.blendMode = ParticleSystem.BLENDMODE_STANDARD; ps.gravity = Vector3.Zero(); ps.preWarmCycles = 160; ps.preWarmStepOffset = 8; ps.start();
}
