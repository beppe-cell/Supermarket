import "@babylonjs/loaders/glTF";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import type { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import type { Scene } from "@babylonjs/core/scene";
import propsUrl from "../../../assets/exported/models/environment/props_pack_clean.glb?url";

/** Pack AspectStudios (CC-BY 4.0), ripulito da tools/clean_props_pack.py. Vedi docs/design/ASSET_REGISTRY.md (T03). */
export class Props {
  private constructor(private readonly sources: Map<string, Mesh>) {}

  static async load(scene: Scene): Promise<Props> {
    const container = await LoadAssetContainerAsync(propsUrl, scene, { pluginExtension: ".glb" });
    container.addAllToScene();
    const sources = new Map<string, Mesh>();
    for (const m of container.meshes) {
      if (m.name.startsWith("SM_") && "createInstance" in m) {
        const mesh = m as Mesh;
        mesh.isVisible = false;
        mesh.setEnabled(true);
        sources.set(m.name, mesh);
      }
    }
    for (const mat of container.materials) (mat as PBRMaterial).maxSimultaneousLights = 6;
    return new Props(sources);
  }

  has(name: string): boolean { return this.sources.has(name); }

  /** Crea un'istanza con base a terra in (x, z), rotazione `yaw` (rad). Ritorna undefined se il pezzo manca. */
  spawn(name: string, x: number, z: number, yaw = 0, y = 0): InstancedMesh | undefined {
    const src = this.sources.get(name);
    if (!src) return undefined;
    const inst = src.createInstance(`${name}@${x.toFixed(1)},${z.toFixed(1)}`);
    // Le istanze ereditano il nodo radice glTF (conversione mano destra->sinistra = specchio su X):
    // si compensa invertendo X e il segno dell'angolo, così `x,z,yaw` sono coordinate mondo.
    inst.position.set(-x, y, z);
    inst.rotation.y = -yaw;
    inst.freezeWorldMatrix();
    return inst;
  }
}
