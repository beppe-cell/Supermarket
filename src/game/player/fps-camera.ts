import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Scene } from "@babylonjs/core/scene";
import type { InputState } from "../../core/input/input-state";

const WALK = 2.2; // m/s
const SPRINT = 4.2;
const EYE = 1.7;
const SENS = 0.0022;

/** Controller prima persona minimale per M0 (collisioni e stamina arrivano in M1). */
export class FpsCamera {
  readonly camera: FreeCamera;
  private yaw = 0;
  private pitch = 0;
  private readonly fwd = new Vector3();
  private readonly right = new Vector3();

  constructor(scene: Scene, start: Vector3) {
    this.camera = new FreeCamera("fps", new Vector3(start.x, EYE, start.z), scene);
    this.camera.minZ = 0.05;
    this.camera.fov = 1.2;
    this.camera.inputs.clear();
  }

  update(input: InputState, dt: number): void {
    this.yaw += input.lookDX * SENS;
    this.pitch = Math.max(-1.45, Math.min(1.45, this.pitch + input.lookDY * SENS));
    this.camera.rotation.set(this.pitch, this.yaw, 0);
    const sy = Math.sin(this.yaw), cy = Math.cos(this.yaw);
    this.fwd.set(sy, 0, cy);
    this.right.set(cy, 0, -sy);
    const speed = (input.sprint ? SPRINT : WALK) * dt;
    this.camera.position.addInPlace(this.fwd.scale(input.moveY * speed)).addInPlace(this.right.scale(input.moveX * speed));
    this.camera.position.y = EYE;
  }
}
