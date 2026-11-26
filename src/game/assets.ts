import "@babylonjs/loaders/glTF";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import type { AssetContainer } from "@babylonjs/core/assetContainer";
import type { Scene } from "@babylonjs/core/scene";
import pistolUrl from "../../assets/exported/models/weapons/SM_Pistol_M9.glb?url";

const URLS: Record<string, string> = { SM_Pistol_M9: pistolUrl };

/** Carica un GLB come AssetContainer. In modalità `artifact` il file è un .glb.txt in base64 (l'hosting non serve .glb). */
export async function loadModel(scene: Scene, key: keyof typeof URLS & string): Promise<AssetContainer> {
  let src: string | Uint8Array = URLS[key] ?? "";
  if (import.meta.env.MODE === "artifact") {
    const b64 = (await (await fetch(new URL(`assets/${key}.glb.txt`, document.baseURI))).text()).trim();
    const bin = atob(b64); const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    src = bytes;
  }
  return LoadAssetContainerAsync(src, scene, { pluginExtension: ".glb" });
}
