import "@babylonjs/core/Collisions/collisionCoordinator";
import "@babylonjs/core/Culling/ray";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { PointLight } from "@babylonjs/core/Lights/pointLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Scene } from "@babylonjs/core/scene";
import type { Engine } from "@babylonjs/core/Engines/engine";
import type { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine";
import type { QualityProfile } from "../../core/quality";
import type { InteractContext, Interactable } from "../interaction/interactable";
import { ZONE1, type Box } from "./zone1";
import type { LookPreset } from "./look";
import { Props } from "./props";
import { buildDecor } from "./decor";
import { applyHit, createSlider, isMoving, stepSlider, type Box as SBox, type Slider } from "../physics/slider";
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { Texture } from "@babylonjs/core/Materials/Textures/texture";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer";
import type { Mesh as MeshT } from "@babylonjs/core/Meshes/mesh";
import floorA from "../../../assets/exported/textures/floor_albedo.jpg?url";
import floorN from "../../../assets/exported/textures/floor_normal.png?url";
import floorO from "../../../assets/exported/textures/floor_orm.jpg?url";
import wallA from "../../../assets/exported/textures/wall_albedo.jpg?url";
import wallN from "../../../assets/exported/textures/wall_normal.png?url";
import wallO from "../../../assets/exported/textures/wall_orm.jpg?url";
import ceilA from "../../../assets/exported/textures/ceiling_albedo.jpg?url";
import ceilN from "../../../assets/exported/textures/ceiling_normal.png?url";
import ceilO from "../../../assets/exported/textures/ceiling_orm.jpg?url";

/** Materiale PBR da set albedo/normale/ORM (R=AO, G=rugosità, B=metallo). */
function pbr(scene: Scene, name: string, urls: [string, string, string], tint = 1): PBRMaterial {
  const m = new PBRMaterial(name, scene);
  m.albedoTexture = new Texture(urls[0], scene);
  m.bumpTexture = new Texture(urls[1], scene);
  const orm = new Texture(urls[2], scene);
  m.metallicTexture = orm;
  m.useRoughnessFromMetallicTextureGreen = true;
  m.useMetallnessFromMetallicTextureBlue = true;
  m.useAmbientOcclusionFromMetallicTextureRed = true;
  m.metallic = 1; m.roughness = 1; // moltiplicatori: i valori reali vengono dalla texture ORM
  m.albedoColor = new Color3(tint, tint, tint);
  m.maxSimultaneousLights = 6;
  m.environmentIntensity = 0.3;
  return m;
}

/** UV in coordinate mondo (m / `tile`) scelte in base alla normale: le texture mantengono la scala reale su ogni parete. */
function worldUV(mesh: MeshT, tile: number): void {
  const pos = mesh.getVerticesData(VertexBuffer.PositionKind), nor = mesh.getVerticesData(VertexBuffer.NormalKind);
  if (!pos || !nor) return;
  const uv = new Float32Array((pos.length / 3) * 2);
  for (let i = 0; i < pos.length / 3; i++) {
    const x = pos[i * 3] ?? 0, y = pos[i * 3 + 1] ?? 0, z = pos[i * 3 + 2] ?? 0;
    const ax = Math.abs(nor[i * 3] ?? 0), ay = Math.abs(nor[i * 3 + 1] ?? 0), az = Math.abs(nor[i * 3 + 2] ?? 0);
    let u: number, v: number;
    if (ay >= ax && ay >= az) { u = x; v = z; } else if (ax >= az) { u = z; v = y; } else { u = x; v = y; }
    uv[i * 2] = u / tile; uv[i * 2 + 1] = v / tile;
  }
  mesh.setVerticesData(VertexBuffer.UVKind, uv);
}
import { Matrix, Quaternion, Vector3 as V3 } from "@babylonjs/core/Maths/math.vector";

/** Oggetto che si muove se colpito (carrello, gabbia a ruote). */
export class Movable {
  readonly slider: Slider;
  constructor(readonly kind: "SM_Trolley" | "SM_RollCage", readonly parts: InstancedMesh[], readonly collider: Mesh, private readonly yawOffset: number, x: number, z: number, yaw: number, mass: number) {
    this.slider = createSlider(x, z, yaw, 0.45, mass);
    collider.metadata = { movable: this };
  }
  hit(dirX: number, dirZ: number, px: number, pz: number): void {
    this.collider.unfreezeWorldMatrix(); for (const p of this.parts) p.unfreezeWorldMatrix();
    applyHit(this.slider, dirX, dirZ, px, pz, this.kind === "SM_Trolley" ? 2.4 : 1.6);
  }
  get moving(): boolean { return isMoving(this.slider); }
  /** Avanza la simulazione e aggiorna mesh e collisione. Ritorna la velocità d'urto (suoni). */
  step(dt: number, obstacles: readonly SBox[]): number {
    const impact = stepSlider(this.slider, dt, obstacles, 1.5);
    const s = this.slider;
    for (const p of this.parts) Props.pose(p, s.x, s.z, s.yaw);
    this.collider.position.x = s.x; this.collider.position.z = s.z; this.collider.rotation.y = s.yaw + this.yawOffset;
    return impact;
  }
}

export interface BuiltLevel {
  scene: Scene;
  interactables: Interactable[];
  movables: Movable[];
  flicker: (t: number) => void;
  /** Aggiornamenti per frame legati alla posizione del giocatore (lampeggio tessera). */
  tick: (t: number, px: number, pz: number) => void;
}

function mat(scene: Scene, name: string, hex: string, emissive = false): StandardMaterial {
  const m = new StandardMaterial(name, scene);
  const c = Color3.FromHexString(hex);
  if (emissive) { m.emissiveColor = c; m.disableLighting = true; } else { m.diffuseColor = c; m.specularColor = new Color3(0.05, 0.05, 0.05); }
  m.maxSimultaneousLights = 6;
  return m;
}

/** Costruisce Z1 in greybox: geometria statica unita per materiale (poche draw call), collisioni attive. */
export async function buildZone1(engine: Engine | WebGPUEngine, q: QualityProfile, look: LookPreset): Promise<BuiltLevel> {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(look.clear[0], look.clear[1], look.clear[2], 1);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = look.fogDensity * (q.volumetricFog ? 1.3 : 1);
  scene.fogColor = new Color3(...look.fogColor);
  scene.collisionsEnabled = true;

  const amb = new HemisphericLight("amb", new Vector3(0, 1, 0), scene);
  amb.intensity = look.ambient;
  amb.diffuse = new Color3(...look.ambientDiffuse);
  amb.groundColor = new Color3(0.08, 0.09, 0.1);

  const floorM = pbr(scene, "floor", [floorA, floorN, floorO]);
  const wallM = pbr(scene, "wall", [wallA, wallN, wallO]);
  const shelfM = mat(scene, "shelf", look.shelf);
  const counterM = mat(scene, "counter", "#4a5055");
  const freezerM = mat(scene, "freezer", "#7d8a92");
  const ceilM = pbr(scene, "ceiling", [ceilA, ceilN, ceilO], 0.75);
  const neonM = mat(scene, "neon", look.neonColor, true);
  const emergM = mat(scene, "emerg", "#ff2a2a", true);

  const b = ZONE1.bounds;
  const W = b.maxX - b.minX, D = b.maxZ - b.minZ;
  const floor = MeshBuilder.CreateGround("floor", { width: W, height: D }, scene);
  floor.material = floorM; floor.checkCollisions = true; worldUV(floor, 3);
  const ceiling = MeshBuilder.CreateGround("ceiling", { width: W, height: D }, scene);
  ceiling.position.y = ZONE1.ceiling; ceiling.rotation.x = Math.PI; ceiling.material = ceilM; worldUV(ceiling, 1.2);

  const boxes = (list: Box[], name: string, m: StandardMaterial | PBRMaterial, defaultH = ZONE1.ceiling): Mesh | undefined => {
    const parts = list.map((bx, i) => {
      const h = bx.h ?? defaultH;
      const part = MeshBuilder.CreateBox(`${name}${i}`, { width: bx.w, depth: bx.d, height: h }, scene);
      part.position.set(bx.x, (bx.y ?? 0) + h / 2, bx.z);
      return part;
    });
    const merged = Mesh.MergeMeshes(parts, true, true);
    if (merged) { merged.name = name; merged.material = m; merged.checkCollisions = true; if (m === wallM) worldUV(merged, 2); merged.freezeWorldMatrix(); }
    return merged ?? undefined;
  };
  boxes(ZONE1.walls, "walls", wallM);
  const shelvesBox = boxes(ZONE1.shelves, "shelves", shelfM);
  boxes(ZONE1.pillars, "pillars", wallM);
  boxes(ZONE1.checkouts, "checkouts", counterM);
  boxes(ZONE1.freezers, "freezers", freezerM);

  // Neon (strisce emissive unite) + luci dinamiche limitate dal profilo
  const strips = ZONE1.neons.map((n, i) => {
    const s = MeshBuilder.CreateBox(`neon${i}`, { width: 2.4, height: 0.06, depth: 0.2 }, scene);
    s.position.set(n.x, ZONE1.ceiling - 0.05, n.z);
    return s;
  });
  const neonMerged = Mesh.MergeMeshes(strips, true, true);
  if (neonMerged) { neonMerged.material = neonM; neonMerged.freezeWorldMatrix(); }

  const lights: { l: PointLight; base: number; seed: number }[] = [];
  const budget = Math.max(0, q.maxDynamicLights - 1); // 1 riservata alla torcia
  const lightSpots = ZONE1.neons.filter((_, i) => i % 3 === 0).slice(0, budget);
  lightSpots.forEach((n, i) => {
    const l = new PointLight(`nl${i}`, new Vector3(n.x, ZONE1.ceiling - 0.4, n.z), scene);
    l.diffuse = new Color3(...look.neonLightColor); l.intensity = look.neonIntensity; l.range = 14;
    lights.push({ l, base: look.neonIntensity, seed: i * 17.3 });
  });

  const emerg = ZONE1.emergencyLights.map((e, i) => {
    const s = MeshBuilder.CreateBox(`em${i}`, { width: 0.3, height: 0.3, depth: 0.3 }, scene);
    s.position.set(e.x, 2.8, e.z);
    return s;
  });
  const emBudget = Math.max(0, q.maxDynamicLights - 1 - lightSpots.length);
  ZONE1.emergencyLights.slice(0, Math.max(emBudget, q.maxDynamicLights > 1 ? 1 : 0)).forEach((e, i) => {
    const l = new PointLight(`el${i}`, new Vector3(e.x, 2.6, e.z), scene);
    l.diffuse = new Color3(1, 0.12, 0.1); l.intensity = look.emergencyIntensity; l.range = 11;
  });
  const emMerged = Mesh.MergeMeshes(emerg, true, true);
  if (emMerged) { emMerged.material = emergM; emMerged.freezeWorldMatrix(); }

  // Porte
  const interactables: Interactable[] = [];
  const doorM = mat(scene, "door", "#7a2024");
  for (const d of ZONE1.doors) {
    const door = MeshBuilder.CreateBox(d.id, d.axis === "z" ? { width: 0.25, height: 2.6, depth: d.w } : { width: d.w, height: 2.6, depth: 0.25 }, scene);
    door.position.set(d.x, 1.3, d.z); door.material = doorM; door.checkCollisions = true;
    let open = false, locked = d.locked ?? false;
    const closedY = door.position.y;
    interactables.push({
      mesh: door,
      auto: { x: d.x, z: d.z, r: 1.7, ready: () => !open },
      prompt: () => (locked ? `${d.label} — bloccata` : open ? `Chiudi ${d.label}` : `Apri ${d.label}`),
      interact: (ctx: InteractContext) => {
        if (locked) {
          if (d.id === "door-warehouse" && ctx.hasItem("key-warehouse")) { locked = false; ctx.message("Tessera accettata: porta del magazzino sbloccata."); ctx.event("warehouse_unlocked"); }
          else { ctx.message(d.id === "door-entrance" ? "L'ingresso è sbarrato dall'esterno." : "Serve una chiave elettronica."); return; }
        }
        open = !open;
        door.position.y = open ? closedY + 2.7 : closedY; // greybox: la porta scorre verso l'alto
        door.checkCollisions = !open;
      },
    });
  }

  const decor = buildDecor(scene, q);
  // Oggetti raccoglibili (greybox: cubetti; la tessera elettronica ha la sua mesh)
  const pickM = mat(scene, "pickup", "#c9b458");
  for (const p of ZONE1.pickups) {
    const isKey = p.id === "key-warehouse";
    const m = isKey ? decor.keycard : MeshBuilder.CreateBox(p.id, { size: 0.22 }, scene);
    if (!isKey) { m.position.set(p.x, p.y, p.z); m.material = pickM; }
    interactables.push({
      mesh: m,
      auto: { x: p.x, z: p.z, r: isKey ? 1.9 : 1.3 },
      prompt: () => `Raccogli ${p.label}`,
      interact: (ctx) => { if (!ctx.addItem(p.id, p.label)) return; m.dispose(); interactables.splice(interactables.findIndex((i) => i.mesh === m), 1); },
    });
  }

  const movables: Movable[] = [];
  // Props reali (se il caricamento fallisce restano i box grigi visibili)
  try {
    const props = await Props.load(scene);
    movables.push(...placeProps(props, q, scene));
    if (shelvesBox) shelvesBox.isVisible = false; // restano come collisioni; casse e frigoriferi restano visibili (texture Gemini)
  } catch (e) {
    console.warn("Props non caricati, uso greybox:", e);
  }

  const flicker = (t: number) => {
    for (const { l, base, seed } of lights) {
      const n = Math.sin(t * 3.1 + seed) * Math.sin(t * 7.7 + seed * 1.7);
      const off = Math.sin(t * 0.37 + seed) > 0.985;
      l.intensity = off ? 0.05 : base * (n > 0.92 ? 0.35 : 1);
    }
  };
  return { scene, interactables, movables, flicker, tick: decor.tick };
}

/** Piazzamento dei props dai dati ZONE1 (posizioni deterministiche). */
function placeProps(props: Props, q: QualityProfile, scene: Scene): Movable[] {
  const SHELF_W = 1.2;
  const units: { x: number; z: number; yaw: number }[] = [];
  for (const sh of ZONE1.shelves) {
    const n = Math.floor(sh.d / SHELF_W);
    const z0 = sh.z - (n * SHELF_W) / 2 + SHELF_W / 2;
    for (let i = 0; i < n; i++) {
      const z = z0 + i * SHELF_W;
      // schiena contro schiena: fronte verso la corsia (sinistra -X, destra +X); fronte nativo = +Z
      props.spawn("SM_Shelf_Unit", sh.x - 0.27, z, -Math.PI / 2);
      props.spawn("SM_Shelf_Unit", sh.x + 0.27, z, Math.PI / 2);
      units.push({ x: sh.x - 0.27, z, yaw: -Math.PI / 2 }, { x: sh.x + 0.27, z, yaw: Math.PI / 2 });
    }
  }
  placeProducts(props, units, q.productDensity);
  const movables: Movable[] = [];
  for (const t of ZONE1.trolleys) {
    const parts = props.spawnAll(t.kind, t.x, t.z, t.yaw, 0, false);
    // collisione semplice (box invisibile) che segue l'oggetto quando si muove
    const dim = t.kind === "SM_Trolley" ? { w: 0.5, d: 0.9, h: 1 } : { w: 0.66, d: 0.79, h: 1.7 };
    const c = MeshBuilder.CreateBox(`col-${t.kind}-${t.x}`, { width: dim.w, depth: dim.d, height: dim.h }, scene);
    const yawOff = t.kind === "SM_Trolley" ? Math.PI / 2 : 0;
    c.position.set(t.x, dim.h / 2, t.z); c.rotation.y = t.yaw + yawOff;
    c.isVisible = false; c.checkCollisions = true; c.freezeWorldMatrix();
    for (const p of parts) p.freezeWorldMatrix();
    movables.push(new Movable(t.kind, parts, c, yawOff, t.x, t.z, t.yaw, t.kind === "SM_Trolley" ? 1 : 1.7));
  }
  // Estintori a muro con collisione e bersaglio per i proiettili
  for (const e of ZONE1.extinguishers) {
    props.spawn("SM_Extinguisher", e.x, e.z, e.yaw, 0.95);
    const c = MeshBuilder.CreateBox(`col-ext-${e.x}-${e.z}`, { width: 0.2, depth: 0.3, height: 0.66 }, scene);
    c.position.set(e.x, 0.95 + 0.33, e.z); c.rotation.y = -e.yaw; c.isVisible = false; c.checkCollisions = true; c.freezeWorldMatrix();
  }
  // Scatoloni lungo il muro ovest (posizioni fisse, nessun random)
  [-12, -9, -4, 0, 5, 9, 12].forEach((z, i) => props.spawn(i % 2 ? "SM_Box_Closed" : "SM_Box_Open", -19.3, z, i * 0.4));
  return movables;
}

// --- Prodotti sugli scaffali ---------------------------------------------------------------------------------
const BOARD_Z = [0.26, 0.62, 0.98, 1.34, 1.7]; // altezza ripiani (m, dal pavimento)
type Kind = { names: string[]; width: number; rows: number; h: number };
const KINDS: Kind[] = [
  { names: ["SM_P_Can_0", "SM_P_Can_1", "SM_P_Can_2"], width: 0.072, rows: 3, h: 0.122 },
  { names: ["SM_P_Bottle_3", "SM_P_Bottle_4", "SM_P_Bottle_14"], width: 0.07, rows: 2, h: 0.24 },
  { names: ["SM_P_Jar_9", "SM_P_Jar_10"], width: 0.08, rows: 2, h: 0.11 },
  { names: ["SM_P_Cereal_5", "SM_P_Cereal_6", "SM_P_Cereal_13"], width: 0.215, rows: 1, h: 0.3 },
  { names: ["SM_P_Bag_7", "SM_P_Bag_8", "SM_P_Bag_15"], width: 0.21, rows: 1, h: 0.28 },
  { names: ["SM_P_Carton_11"], width: 0.075, rows: 2, h: 0.24 },
  { names: ["SM_P_Pasta_12"], width: 0.105, rows: 2, h: 0.26 },
];

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/** Riempie i ripiani in modo deterministico; `density` = frazione di slot occupati (scaffali saccheggiati). */
function placeProducts(props: Props, units: { x: number; z: number; yaw: number }[], density: number): void {
  const r = rng(1337);
  const out = new Map<string, Matrix[]>();
  units.forEach((u, ui) => {
    const unitM = Props.unitMatrix(u.x, u.z, u.yaw);
    BOARD_Z.forEach((bz, bi) => {
      const kind = KINDS[Math.floor(r() * KINDS.length)] as Kind;
      const name = kind.names[Math.floor(r() * kind.names.length)] as string;
      if (!props.has(name)) return;
      // Alcuni ripiani vuoti del tutto (saccheggiati)
      if (r() > density * 2.2 + 0.1) return;
      const slots = Math.floor(1.04 / kind.width);
      for (let row = 0; row < kind.rows; row++) {
        const yBlender = -0.15 + row * Math.min(0.1, 0.34 / Math.max(kind.rows, 1)); // fronte -> dietro (Blender Y)
        for (let i = 0; i < slots; i++) {
          if (r() > density * 2.2) continue;
          const lx = -0.52 + (i + 0.5) * (1.04 / slots) + (r() - 0.5) * 0.01;
          const jitter = (r() - 0.5) * 0.12;
          const p = Matrix.Compose(V3.One(), Quaternion.RotationYawPitchRoll(jitter, 0, 0), new V3(lx, bz + 0.011, -yBlender));
          const m = p.multiply(unitM);
          const list = out.get(name) ?? [];
          list.push(m); out.set(name, list);
        }
      }
      void ui; void bi;
    });
  });
  props.fillProducts(out);
}
