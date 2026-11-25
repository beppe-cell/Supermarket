import type { Engine } from "@babylonjs/core/Engines/engine";
import type { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { createEngine } from "./engine-factory";
import { FixedTimestep } from "./fixed-timestep";
import { InputManager } from "./input/input-manager";
import { QUALITY_PROFILES, adaptScaling, detectQuality, readDeviceInfo, type QualityId, type QualityProfile } from "./quality";
import { FpsCamera } from "../game/player/fps-camera";
import { createTestScene } from "../game/scenes/test-scene";

export class Game {
  private engine!: Engine | WebGPUEngine;
  private input!: InputManager;
  private quality!: QualityProfile;
  private readonly hud = document.createElement("div");
  private fpsAcc: number[] = [];

  constructor(private readonly canvas: HTMLCanvasElement) {}

  async start(): Promise<void> {
    const params = new URLSearchParams(location.search);
    this.engine = await createEngine(this.canvas, { preferWebGPU: params.get("gpu") === "1" });
    const dev = readDeviceInfo({ maxTextureSize: this.engine.getCaps().maxTextureSize });
    const forced = params.get("quality") as QualityId | null;
    this.quality = QUALITY_PROFILES[forced && forced in QUALITY_PROFILES ? forced : detectQuality(dev)];
    this.engine.setHardwareScalingLevel(this.quality.hardwareScaling);

    this.input = new InputManager(this.canvas, dev.isTouch);
    const scene = createTestScene(this.engine);
    const player = new FpsCamera(scene, new Vector3(0, 0, 0));
    const step = new FixedTimestep(1 / 60);

    this.hud.style.cssText = "position:fixed;top:6px;left:6px;color:#9fb;font:12px monospace;pointer-events:none;white-space:pre";
    document.body.appendChild(this.hud);

    addEventListener("resize", () => this.engine.resize());
    let t = 0;
    this.engine.runRenderLoop(() => {
      const dt = this.engine.getDeltaTime() / 1000;
      const input = this.input.poll();
      const n = step.advance(dt);
      for (let i = 0; i < n; i++) player.update(input, step.stepSize);
      scene.render();
      this.tickHud(dt, scene.getActiveMeshes().length);
      t += dt;
    });
  }

  private tickHud(dt: number, meshes: number): void {
    this.fpsAcc.push(1 / Math.max(dt, 1e-4));
    if (this.fpsAcc.length < 60) return;
    const avg = this.fpsAcc.reduce((a, b) => a + b, 0) / this.fpsAcc.length;
    this.fpsAcc.length = 0;
    const next = adaptScaling(this.engine.getHardwareScalingLevel(), avg, this.quality.targetFps, this.quality.hardwareScaling, 3);
    if (next !== this.engine.getHardwareScalingLevel()) this.engine.setHardwareScalingLevel(next);
    this.hud.textContent = `${avg.toFixed(0)} fps | ${this.quality.id} | scala ${next} | mesh ${meshes} | ${this.engine.getClassName()}`;
  }
}
