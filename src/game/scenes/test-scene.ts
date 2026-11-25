import { Color3, Color4 } from "@babylonjs/core/Maths/math.color";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Scene } from "@babylonjs/core/scene";
import type { Engine } from "@babylonjs/core/Engines/engine";
import type { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine";
import "@babylonjs/core/Meshes/thinInstanceMesh";

/** Scena di test M0: pavimento + scaffali fittizi (thin instances) per misurare fps. Non è contenuto di gioco. */
export function createTestScene(engine: Engine | WebGPUEngine): Scene {
  const scene = new Scene(engine);
  scene.clearColor = new Color4(0.03, 0.04, 0.05, 1);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.04;
  scene.fogColor = new Color3(0.03, 0.04, 0.05);

  const light = new HemisphericLight("amb", new Vector3(0, 1, 0), scene);
  light.intensity = 0.5;
  light.diffuse = new Color3(0.75, 0.85, 0.9);

  const floorMat = new StandardMaterial("floor", scene);
  floorMat.diffuseColor = new Color3(0.28, 0.3, 0.32);
  const floor = MeshBuilder.CreateGround("floor", { width: 60, height: 60 }, scene);
  floor.material = floorMat;

  const shelfMat = new StandardMaterial("shelf", scene);
  shelfMat.diffuseColor = new Color3(0.5, 0.52, 0.55);
  const shelf = MeshBuilder.CreateBox("shelf", { width: 0.5, height: 2, depth: 4 }, scene);
  shelf.material = shelfMat;
  shelf.isVisible = false;
  const matrices: number[] = [];
  for (let row = -4; row <= 4; row++) for (let col = -5; col <= 5; col++) {
    const m = Matrix.Translation(col * 3, 1, row * 6);
    matrices.push(...m.asArray());
  }
  shelf.thinInstanceSetBuffer("matrix", new Float32Array(matrices), 16, true);
  shelf.isVisible = true;
  return scene;
}
