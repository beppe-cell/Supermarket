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

export interface BuiltLevel {
  scene: Scene;
  interactables: Interactable[];
  flicker: (t: number) => void;
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

  const floorM = mat(scene, "floor", look.floor);
  const wallM = mat(scene, "wall", look.wall);
  const shelfM = mat(scene, "shelf", look.shelf);
  const counterM = mat(scene, "counter", "#4a5055");
  const freezerM = mat(scene, "freezer", "#7d8a92");
  const ceilM = mat(scene, "ceiling", look.ceiling);
  const neonM = mat(scene, "neon", look.neonColor, true);
  const emergM = mat(scene, "emerg", "#ff2a2a", true);

  const b = ZONE1.bounds;
  const W = b.maxX - b.minX, D = b.maxZ - b.minZ;
  const floor = MeshBuilder.CreateGround("floor", { width: W, height: D }, scene);
  floor.material = floorM; floor.checkCollisions = true;
  const ceiling = MeshBuilder.CreateGround("ceiling", { width: W, height: D }, scene);
  ceiling.position.y = ZONE1.ceiling; ceiling.rotation.x = Math.PI; ceiling.material = ceilM;

  const boxes = (list: Box[], name: string, m: StandardMaterial, defaultH = ZONE1.ceiling): Mesh | undefined => {
    const parts = list.map((bx, i) => {
      const h = bx.h ?? defaultH;
      const part = MeshBuilder.CreateBox(`${name}${i}`, { width: bx.w, depth: bx.d, height: h }, scene);
      part.position.set(bx.x, (bx.y ?? 0) + h / 2, bx.z);
      return part;
    });
    const merged = Mesh.MergeMeshes(parts, true, true);
    if (merged) { merged.name = name; merged.material = m; merged.checkCollisions = true; merged.freezeWorldMatrix(); }
    return merged ?? undefined;
  };
  boxes(ZONE1.walls, "walls", wallM);
  const shelvesBox = boxes(ZONE1.shelves, "shelves", shelfM);
  boxes(ZONE1.pillars, "pillars", wallM);
  const checkoutsBox = boxes(ZONE1.checkouts, "checkouts", counterM);
  const freezersBox = boxes(ZONE1.freezers, "freezers", freezerM);

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
      prompt: () => (locked ? `${d.label} — bloccata` : open ? `Chiudi ${d.label}` : `Apri ${d.label}`),
      interact: (ctx: InteractContext) => {
        if (locked) {
          if (d.id === "door-warehouse" && ctx.hasItem("key-warehouse")) { locked = false; ctx.message("Hai sbloccato la porta del magazzino."); }
          else { ctx.message(d.id === "door-entrance" ? "L'ingresso è sbarrato dall'esterno." : "Serve una chiave."); return; }
        }
        open = !open;
        door.position.y = open ? closedY + 2.7 : closedY; // greybox: la porta scorre verso l'alto
        door.checkCollisions = !open;
      },
    });
  }

  // Oggetti raccoglibili (greybox: cubetti)
  const pickM = mat(scene, "pickup", "#c9b458");
  for (const p of ZONE1.pickups) {
    const m = MeshBuilder.CreateBox(p.id, { size: 0.22 }, scene);
    m.position.set(p.x, p.y, p.z); m.material = pickM;
    interactables.push({
      mesh: m,
      prompt: () => `Raccogli ${p.label}`,
      interact: (ctx) => { ctx.addItem(p.id, p.label); ctx.message(`Raccolto: ${p.label}`); m.dispose(); interactables.splice(interactables.findIndex((i) => i.mesh === m), 1); },
    });
  }

  // Props reali (se il caricamento fallisce restano i box grigi visibili)
  try {
    const props = await Props.load(scene);
    placeProps(props);
    for (const m of [shelvesBox, checkoutsBox, freezersBox]) if (m) m.isVisible = false; // restano come collisioni
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
  return { scene, interactables, flicker };
}

/** Piazzamento dei props dai dati ZONE1 (posizioni deterministiche). */
function placeProps(props: Props): void {
  const SHELF_W = 1.72;
  for (const sh of ZONE1.shelves) {
    const n = Math.floor(sh.d / SHELF_W);
    const z0 = sh.z - (n * SHELF_W) / 2 + SHELF_W / 2;
    for (let i = 0; i < n; i++) {
      const z = z0 + i * SHELF_W;
      // schiena contro schiena: fronte verso la corsia (sinistra -X, destra +X)
      props.spawn("SM_Shelf", sh.x - 0.32, z, Math.PI / 2);
      props.spawn("SM_Shelf", sh.x + 0.32, z, -Math.PI / 2);
    }
  }
  for (const f of ZONE1.freezers) {
    const n = Math.floor(f.w / 1.6);
    for (let i = 0; i < n; i++) props.spawn("SM_Fridge", f.x - ((n - 1) * 1.6) / 2 + i * 1.6, f.z - 0.2, Math.PI);
  }
  for (const c of ZONE1.checkouts) {
    props.spawn("SM_Counter", c.x, c.z, Math.PI / 2);
    props.spawn("SM_Register", c.x, c.z, Math.PI / 2, 0.857);
  }
  // Scatoloni lungo il muro ovest (posizioni fisse, nessun random)
  [-12, -9, -4, 0, 5, 9, 12].forEach((z, i) => props.spawn(i % 2 ? "SM_Box_Closed" : "SM_Box_Open", -19.3, z, i * 0.4));
}
