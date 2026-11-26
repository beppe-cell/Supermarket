import "@babylonjs/loaders/glTF";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import type { Scene } from "@babylonjs/core/scene";
import packUrl from "../../../assets/exported/models/environment/props_pack_clean.glb?url";
import shelfUrl from "../../../assets/exported/models/environment/SM_Shelf_Unit.glb?url";

const FILES: Record<string, string> = { props_pack_clean: packUrl, SM_Shelf_Unit: shelfUrl };

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
  private constructor(private readonly sources: Map<string, Mesh>) {}

  static async load(scene: Scene): Promise<Props> {
    const sources = new Map<string, Mesh>();
    for (const key of Object.keys(FILES)) {
      const container = await LoadAssetContainerAsync(await source(key), scene, { pluginExtension: ".glb" });
      container.addAllToScene();
      for (const m of container.meshes) {
        if (m.name.startsWith("SM_") && "createInstance" in m) {
          const mesh = m as Mesh;
          mesh.isVisible = false;
          sources.set(m.name, mesh);
        }
      }
      for (const mat of container.materials) (mat as PBRMaterial).maxSimultaneousLights = 6;
    }
    const lod = sources.get("SM_Shelf_Unit_LOD1"), high = sources.get("SM_Shelf_Unit");
    if (lod && high) high.addLODLevel(14, lod);
    return new Props(sources);
  }

  has(name: string): boolean { return this.sources.has(name); }

  /** Istanza con base a terra in (x, z), rotazione `yaw` (rad, mondo). */
  spawn(name: string, x: number, z: number, yaw = 0, y = 0): InstancedMesh | undefined {
    const src = this.sources.get(name);
    if (!src) return undefined;
    const inst = src.createInstance(`${name}@${x.toFixed(1)},${z.toFixed(1)}`);
    // Le istanze ereditano il nodo radice glTF (mano destra->sinistra = specchio su X): si compensa X e il segno dell'angolo.
    inst.position.set(-x, y, z);
    inst.rotationQuaternion = null; // i mesh glTF usano il quaternione, che nasconderebbe `rotation`
    inst.rotation.y = -yaw;
    inst.freezeWorldMatrix();
    return inst;
  }
}
