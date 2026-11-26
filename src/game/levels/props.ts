import "@babylonjs/loaders/glTF";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import type { Scene } from "@babylonjs/core/scene";
import packUrl from "../../../assets/exported/models/environment/props_pack_clean.glb?url";
import extUrl from "../../../assets/exported/models/environment/SM_Extinguisher.glb?url";
import shelfUrl from "../../../assets/exported/models/environment/SM_Shelf_Unit.glb?url";
import productsUrl from "../../../assets/exported/models/environment/SM_Products.glb?url";
import trolleyUrl from "../../../assets/exported/models/environment/SM_Trolley.glb?url";
import cageUrl from "../../../assets/exported/models/environment/SM_RollCage.glb?url";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector";
import "@babylonjs/core/Meshes/thinInstanceMesh";

const FILES: Record<string, string> = { props_pack_clean: packUrl, SM_Shelf_Unit: shelfUrl, SM_Products: productsUrl, SM_Trolley: trolleyUrl, SM_RollCage: cageUrl, SM_Extinguisher: extUrl };

/** In modalità `artifact` (hosting senza file .glb) i modelli sono pubblicati come base64 in .txt. */
async function source(key: string): Promise<string | Uint8Array> {
  if (import.meta.env.MODE !== "artifact") return FILES[key] ?? "";
  const b64 = (await (await fetch(new URL(`assets/${key}.glb.txt`, document.baseURI))).text()).trim();
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

/**
 * Props del livello. Pack AspectStudios (CC-BY 4.0, vedi ASSET_REGISTRY T03, ripulito da tools/clean_props_pack.py)
 * e scaffale originale SM_Shelf_Unit (tools/make_shelf.py) con LOD.
 */
export class Props {
  private constructor(private readonly sources: Map<string, Mesh>, private readonly groups: Map<string, Mesh[]>) {}

  static async load(scene: Scene): Promise<Props> {
    const sources = new Map<string, Mesh>();
    const groups = new Map<string, Mesh[]>(); // modelli con più materiali: SM_X_primitive0..n
    for (const key of Object.keys(FILES)) {
      const container = await LoadAssetContainerAsync(await source(key), scene, { pluginExtension: ".glb" });
      container.addAllToScene();
      for (const m of container.meshes) {
        if (m.name.startsWith("SM_") && "createInstance" in m) {
          const mesh = m as Mesh;
          mesh.isVisible = m.name.startsWith("SM_P_"); // i prodotti si disegnano solo come thin instances
          sources.set(m.name, mesh);
          const g = /^(SM_[A-Za-z_]+?)_primitive\d+$/.exec(m.name);
          if (g?.[1]) { const list = groups.get(g[1]) ?? []; list.push(mesh); groups.set(g[1], list); }
        }
      }
      for (const mat of container.materials) {
        const pbr = mat as PBRMaterial;
        pbr.maxSimultaneousLights = 6;
        // Con la mappa ambiente i riflessi ci sono: metallo quasi pieno ma non specchio (usura già nella texture ORM).
        if (key === "SM_Shelf_Unit") pbr.metallic = 0.85;
      }
    }
    const lod = sources.get("SM_Shelf_Unit_LOD1"), high = sources.get("SM_Shelf_Unit");
    if (lod && high) high.addLODLevel(14, lod);
    return new Props(sources, groups);
  }

  has(name: string): boolean { return this.sources.has(name) || this.groups.has(name); }

  /** Istanze (una per primitiva del modello) con base a terra in (x, z), rotazione `yaw` (rad, mondo). `frozen=false` per oggetti che si muovono. */
  spawnAll(name: string, x: number, z: number, yaw = 0, y = 0, frozen = true): InstancedMesh[] {
    const parts = this.groups.get(name) ?? (this.sources.has(name) ? [this.sources.get(name) as Mesh] : []);
    const out: InstancedMesh[] = [];
    for (const src of parts) {
      if (src.getTotalVertices() === 0) continue;
      const inst = src.createInstance(`${name}@${x.toFixed(1)},${z.toFixed(1)}`);
      inst.rotationQuaternion = null; // i mesh glTF usano il quaternione, che nasconderebbe `rotation`
      Props.pose(inst, x, z, yaw, y);
      if (frozen) inst.freezeWorldMatrix();
      out.push(inst);
    }
    return out;
  }

  /** Le istanze ereditano il nodo radice glTF (mano destra->sinistra = specchio su X): si compensa X e il segno dell'angolo. */
  static pose(inst: InstancedMesh, x: number, z: number, yaw: number, y = 0): void { inst.position.set(-x, y, z); inst.rotation.y = -yaw; }

  /** Compatibilità: prima istanza. */
  spawn(name: string, x: number, z: number, yaw = 0, y = 0): InstancedMesh | undefined { return this.spawnAll(name, x, z, yaw, y)[0]; }

  /** Matrice mondo di un'istanza `spawn` (stessa convenzione: X invertita, angolo negato). */
  static unitMatrix(x: number, z: number, yaw: number): Matrix {
    return Matrix.Compose(Vector3.One(), Quaternion.RotationYawPitchRoll(-yaw, 0, 0), new Vector3(-x, 0, z));
  }

  /** Disegna i prodotti come thin instances (1 draw call per tipo). `local` = matrici nel frame dello scaffale. */
  fillProducts(items: Map<string, Matrix[]>): void {
    for (const [name, mesh] of this.sources) {
      if (!name.startsWith("SM_P_")) continue;
      const list = items.get(name);
      if (!list || list.length === 0) { mesh.setEnabled(false); continue; }
      const buf = new Float32Array(list.length * 16);
      list.forEach((m, i) => m.copyToArray(buf, i * 16));
      mesh.thinInstanceSetBuffer("matrix", buf, 16, true);
      mesh.thinInstanceRefreshBoundingInfo(true);
      mesh.alwaysSelectAsActiveMesh = false;
    }
  }
}
