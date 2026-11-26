import "@babylonjs/core/Collisions/collisionCoordinator";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { SpotLight } from "@babylonjs/core/Lights/spotLight";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { Scene } from "@babylonjs/core/scene";
import type { InputState } from "../../core/input/input-state";
import { Stamina } from "./stamina";

const WALK = 2.2, SPRINT = 4.2, CROUCH = 1.2; // m/s
const EYE_STAND = 1.65, EYE_CROUCH = 1.05;
const SENS = 0.0022, GRAVITY = 9.8;

/** Giocatore in prima persona: corpo con collisioni (box) + camera + torcia. */
export class Player {
  readonly camera: FreeCamera;
  readonly stamina = new Stamina();
  health = 100;
  readonly maxHealth = 100;
  private recoilPitch = 0;
  private recoilYaw = 0;
  readonly torch: SpotLight;
  private readonly body: Mesh;
  private yaw = 0;
  private pitch = 0;
  private eye = EYE_STAND;
  private vy = 0;
  private readonly move = new Vector3();

  constructor(scene: Scene, spawn: { x: number; z: number; yaw: number }, torchIntensity = 1.6) {
    this.yaw = spawn.yaw;
    this.body = MeshBuilder.CreateBox("player-body", { width: 0.6, depth: 0.6, height: 1.8 }, scene);
    this.body.isVisible = false;
    this.body.position.set(spawn.x, 0.9, spawn.z);
    this.body.checkCollisions = true;
    this.body.ellipsoid = new Vector3(0.3, 0.9, 0.3);

    this.camera = new FreeCamera("fps", new Vector3(spawn.x, this.eye, spawn.z), scene);
    this.camera.minZ = 0.05;
    this.camera.fov = 1.2;
    this.camera.inputs.clear();
    scene.activeCamera = this.camera;

    this.torch = new SpotLight("torch", Vector3.Zero(), new Vector3(0, 0, 1), 1.7, 1, scene);
    this.torch.innerAngle = 0.4;
    this.torch.diffuse = new Color3(1, 0.96, 0.86);
    this.torch.intensity = torchIntensity;
    this.torch.range = 22;
    this.torch.parent = this.camera;
  }

  get alive(): boolean { return this.health > 0; }
  heal(n: number): void { this.health = Math.min(this.maxHealth, this.health + n); }
  damage(n: number): void { this.health = Math.max(0, this.health - n); }
  /** Rinculo visivo: sposta la mira e rientra da solo. */
  addRecoil(pitch: number, yaw: number): void { this.recoilPitch += pitch; this.recoilYaw += yaw; }

  get position(): Vector3 { return this.camera.position; }
  get yawAngle(): number { return this.yaw; }
  get isCrouching(): boolean { return this.eye < 1.4; }

  teleport(x: number, z: number): void {
    this.body.position.set(x, 0.9, z);
    this.vy = 0;
  }

  setLook(yaw: number, pitch: number): void {
    this.yaw = yaw;
    this.pitch = pitch;
  }


  update(input: InputState, dt: number): { moving: boolean; sprinting: boolean } {
    this.yaw += input.lookDX * SENS;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch + input.lookDY * SENS));
    this.recoilPitch *= Math.max(0, 1 - dt * 9); this.recoilYaw *= Math.max(0, 1 - dt * 9);
    this.camera.rotation.set(this.pitch - this.recoilPitch, this.yaw + this.recoilYaw, 0);

    const moving = input.moveX !== 0 || input.moveY !== 0;
    const crouching = input.crouch;
    const sprinting = this.stamina.update(input.sprint && !crouching, moving, dt);
    const speed = crouching ? CROUCH : sprinting ? SPRINT : WALK;

    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    const len = Math.hypot(input.moveX, input.moveY) || 1;
    const fx = input.moveY / len, rx = input.moveX / len;
    this.move.set((sy * fx + cy * rx) * speed * dt, 0, (cy * fx - sy * rx) * speed * dt);

    this.vy = this.body.position.y <= 0.91 ? 0 : this.vy - GRAVITY * dt;
    this.move.y = this.vy * dt;
    this.body.moveWithCollisions(this.move);

    const target = crouching ? EYE_CROUCH : EYE_STAND;
    this.eye += (target - this.eye) * Math.min(1, dt * 10);
    this.camera.position.set(this.body.position.x, this.body.position.y - 0.9 + this.eye, this.body.position.z);
    return { moving, sprinting };
  }
}
