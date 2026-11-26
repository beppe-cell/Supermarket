import type { Engine } from "@babylonjs/core/Engines/engine";
import type { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Ray } from "@babylonjs/core/Culling/ray";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { createEngine } from "./engine-factory";
import { FixedTimestep } from "./fixed-timestep";
import { InputManager } from "./input/input-manager";
import { QUALITY_PROFILES, adaptScaling, detectQuality, profileFor, readDeviceInfo, type QualityId, type QualityProfile } from "./quality";
import { buildZone1 } from "../game/levels/zone1-builder";
import { ZONE1 } from "../game/levels/zone1";
import { pickLook } from "../game/levels/look";
import { Player } from "../game/player/player";
import { Hud } from "../game/ui/hud";
import { createEnvironment } from "./environment";
import { createPostFx } from "./postfx";
import type { Interactable } from "../game/interaction/interactable";

const REACH = 2.4;

export class Game {
  private engine!: Engine | WebGPUEngine;
  private input!: InputManager;
  private quality!: QualityProfile;
  private readonly dbg = document.createElement("div");
  private fpsAcc: number[] = [];
  private readonly inventory = new Map<string, string>();

  constructor(private readonly canvas: HTMLCanvasElement) {}

  async start(): Promise<void> {
    const params = new URLSearchParams(location.search);
    this.engine = await createEngine(this.canvas, { preferWebGPU: params.get("gpu") === "1" });
    const dev = readDeviceInfo({ maxTextureSize: this.engine.getCaps().maxTextureSize });
    // Override: ?quality=low|medium|high oppure #low|#medium|#high (l'Artifact accetta solo l'hash)
    const hash = location.hash.slice(1);
    const forced = (params.get("quality") ?? hash) as QualityId;
    this.quality = profileFor(forced in QUALITY_PROFILES ? forced : detectQuality(dev), dev.isTouch);
    this.engine.setHardwareScalingLevel(this.quality.hardwareScaling);

    this.input = new InputManager(this.canvas, dev.isTouch);
    const look = pickLook(params.get("look") ?? location.hash.slice(1));
    const level = await buildZone1(this.engine, this.quality, look);
    const scene = level.scene;
    const envOk = params.get("env") === "0" ? false : await createEnvironment(scene, dev.isTouch ? 16 : 32);
    const player = new Player(scene, ZONE1.spawn, look.torchIntensity);
    const fx = params.get("fx") === "0" ? undefined : createPostFx(scene, player.camera, this.quality, dev.isTouch);
    void envOk; void fx;
    const hud = new Hud();
    const step = new FixedTimestep(1 / 60);

    this.dbg.style.cssText = "position:fixed;top:6px;left:6px;color:#9fb;font:11px monospace;pointer-events:none;white-space:pre;opacity:.7";
    document.body.appendChild(this.dbg);

    const ctx = {
      hasItem: (id: string) => this.inventory.has(id),
      addItem: (id: string, label: string) => { this.inventory.set(id, label); hud.setInventory([...this.inventory.values()]); },
      message: (t: string) => hud.message(t),
    };

    const ray = new Ray(Vector3.Zero(), Vector3.Forward(), REACH);
    let target: Interactable | undefined;
    let interactHeld = false, torchHeld = false, time = 0;

    if (params.get("debug") === "1") {
      // Hook solo per i test QA (?debug=1)
      (window as unknown as { __dbg: unknown }).__dbg = {
        pos: () => [player.position.x, player.position.y, player.position.z],
        inventory: () => [...this.inventory.keys()],
        teleport: (x: number, z: number) => player.teleport(x, z),
        look: (yaw: number, pitch: number) => player.setLook(yaw, pitch),
        top: (x: number, z: number, h: number) => {
          scene.fogMode = 0;
          const c = new FreeCamera("top", new Vector3(x, h, z), scene);
          c.rotation.set(Math.PI / 2, 0, 0);
          c.fov = 0.9;
          scene.activeCamera = c;
          scene.ambientColor.set(1, 1, 1);
          scene.lights.forEach((l) => { l.intensity = Math.max(l.intensity, 1.2); });
        },
        meshes: (re: string) => scene.meshes.filter((m) => new RegExp(re).test(m.name)).slice(0, 12).map((m) => [m.name, m.isVisible, m.isEnabled(), m.getBoundingInfo().boundingBox.centerWorld.asArray().map((v) => +v.toFixed(1))]),
      };
    }
    addEventListener("resize", () => this.engine.resize());
    this.engine.runRenderLoop(() => {
      const dt = Math.min(this.engine.getDeltaTime() / 1000, 0.1);
      time += dt;
      const input = this.input.poll();
      const n = step.advance(dt);
      for (let i = 0; i < n; i++) player.update(input, step.stepSize);

      if (input.torch && !torchHeld) player.torch.setEnabled(!player.torch.isEnabled());
      torchHeld = input.torch;

      // Interazione: raggio dal centro della camera
      scene.activeCamera?.getForwardRayToRef(ray, REACH);
      const hit = scene.pickWithRay(ray, (m) => level.interactables.some((i) => i.mesh === m));
      target = hit?.pickedMesh ? level.interactables.find((i) => i.mesh === hit.pickedMesh) : undefined;
      hud.setPrompt(target ? `[E] ${target.prompt()}` : "");
      if (input.interact && !interactHeld && target) target.interact(ctx);
      interactHeld = input.interact;

      level.flicker(time);
      hud.setStamina(player.stamina.ratio);
      scene.render();
      this.tickDebug(dt, scene.getActiveMeshes().length);
    });
  }

  private tickDebug(dt: number, meshes: number): void {
    this.fpsAcc.push(1 / Math.max(dt, 1e-4));
    if (this.fpsAcc.length < 60) return;
    const avg = this.fpsAcc.reduce((a, b) => a + b, 0) / this.fpsAcc.length;
    this.fpsAcc.length = 0;
    const cur = this.engine.getHardwareScalingLevel();
    const next = adaptScaling(cur, avg, this.quality.targetFps, 1, 3);
    if (next !== cur) this.engine.setHardwareScalingLevel(next);
    this.dbg.textContent = `${avg.toFixed(0)} fps | ${this.quality.id} | scala ${next} | mesh ${meshes}`;
  }
}
