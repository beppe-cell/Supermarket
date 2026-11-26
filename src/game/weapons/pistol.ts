import { Ray } from "@babylonjs/core/Culling/ray";
import "@babylonjs/core/Culling/ray";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Camera } from "@babylonjs/core/Cameras/camera";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { Scene } from "@babylonjs/core/scene";
import { loadModel } from "../assets";
import type { Sfx } from "../../core/audio/sfx";
import type { Damageable, HitPart } from "../combat/damageable";
import { WeaponEffects } from "./effects";

export const MAG_SIZE = 15;
const FIRE_INTERVAL = 0.17, RELOAD_TIME = 1.7, RANGE = 80;
const HIP_FOV = 1.2, AIM_FOV = 0.9;
/** Posizione del viewmodel in mira: la tacca di mira davanti all'occhio, al centro. */
const AIM_POS = new Vector3(0, -0.095, 0.27);
const MUZZLE = new Vector3(0, 0.07, 0.19); // dal JSON di prep_weapon (coordinate glTF)

export interface HitReport {
  kind: "none" | "world" | "enemy"; part?: HitPart; killed?: boolean; enemy?: Damageable;
  /** Per colpi sul mondo: mesh colpito, punto e direzione del proiettile (per far muovere i carrelli). */
  mesh?: AbstractMesh; point?: Vector3; dir?: Vector3;
}

/** Pistola in prima persona (Beretta M9): viewmodel con sway/rinculo, ricarica, hitscan con dispersione, effetti e suoni. */
export class Pistol {
  mag = MAG_SIZE;
  reserve = 30;
  private cooldown = 0;
  private reloadT = 0;
  private kick = 0;
  /** 0..1: calore di fuoco recente, allarga il mirino. */
  heat = 0;
  private bobT = 0;
  /** 0..1: quanto la pistola è in posizione di mira. */
  private aimT = 0;
  /** secondi di mira residui dopo l'ultimo sparo (la pistola va in mira da sola quando si spara). */
  private aimHold = 0;
  private prevFire = false;
  private prevReload = false;
  private readonly vm: TransformNode;
  private readonly muzzleNode: TransformNode;
  private readonly fx: WeaponEffects;
  private readonly ray = new Ray(Vector3.Zero(), Vector3.Forward(), RANGE);

  private constructor(private readonly scene: Scene, private readonly camera: Camera, vm: TransformNode, muzzle: TransformNode, fx: WeaponEffects, private readonly sfx: Sfx) {
    this.vm = vm; this.muzzleNode = muzzle; this.fx = fx;
  }

  static async create(scene: Scene, camera: Camera, sfx: Sfx, maxLights: number): Promise<Pistol> {
    const container = await loadModel(scene, "SM_Pistol_M9");
    container.addAllToScene();
    const vm = new TransformNode("viewmodel", scene); vm.parent = camera;
    const root = container.rootNodes[0] as TransformNode; root.parent = vm;
    for (const m of container.meshes) { m.isPickable = false; m.renderingGroupId = 1; m.alwaysSelectAsActiveMesh = true; }
    const muzzle = new TransformNode("muzzle", scene); muzzle.parent = root; muzzle.position.copyFrom(MUZZLE);
    vm.position.set(0.13, -0.14, 0.3); vm.rotation.set(0.02, -0.04, 0);
    return new Pistol(scene, camera, vm, muzzle, new WeaponEffects(scene, muzzle, maxLights), sfx);
  }

  /** In mira (automatica mentre si spara). */
  get aiming(): boolean { return this.aimT > 0.5; }
  get reloading(): boolean { return this.reloadT > 0; }
  get muzzleWorld(): Vector3 { return this.muzzleNode.getAbsolutePosition(); }

  addAmmo(n: number): void { this.reserve += n; }

  /**
   * Aggiorna il viewmodel e gestisce sparo/ricarica. `fire` è il tasto premuto (si spara sul fronte di salita, semiautomatica).
   * `onShot` riceve il rumore dello sparo (per allertare i nemici); `trace` risolve il colpo contro il mondo.
   */
  update(dt: number, input: { fire: boolean; reload: boolean; aim?: boolean }, state: { moving: boolean; sprinting: boolean }, hooks: {
    onShot(): void; onRecoil(pitch: number, yaw: number): void; onReport(r: HitReport): void;
  }): void {
    this.cooldown = Math.max(0, this.cooldown - dt);
    const wantFire = input.fire && !this.prevFire, wantReload = input.reload && !this.prevReload;
    this.prevFire = input.fire; this.prevReload = input.reload;

    if (this.reloadT > 0) {
      this.reloadT -= dt;
      if (this.reloadT <= 0) { const take = Math.min(MAG_SIZE - this.mag, this.reserve); this.mag += take; this.reserve -= take; }
    } else if (wantReload && this.mag < MAG_SIZE && this.reserve > 0) { this.reloadT = RELOAD_TIME; this.sfx.reload(); }
    else if (wantFire && this.cooldown <= 0 && !state.sprinting) {
      if (this.mag > 0) this.fire(state, hooks); else { this.sfx.dryFire(); this.cooldown = 0.3; if (this.reserve > 0) this.reloadT = RELOAD_TIME, this.sfx.reload(); }
    }

    // animazione del viewmodel: rinculo a molla, bob, abbassamento in corsa/ricarica
    this.kick = Math.max(0, this.kick - dt * 9); this.heat = Math.max(0, this.heat - dt * 2.2);
    this.bobT += dt * (state.moving ? (state.sprinting ? 11 : 7) : 1.5);
    if (input.fire) this.aimHold = 0.45; else this.aimHold = Math.max(0, this.aimHold - dt);
    const wantAim = (!!input.aim || this.aimHold > 0) && !state.sprinting && this.reloadT <= 0;
    this.aimT += ((wantAim ? 1 : 0) - this.aimT) * Math.min(1, dt * 12);
    const a = this.aimT, hip = 1 - a;
    this.camera.fov = HIP_FOV + (AIM_FOV - HIP_FOV) * a;
    const amp = (state.moving ? 0.006 : 0.0015) * (1 - 0.7 * a);
    const lower = this.reloadT > 0 ? Math.sin(Math.min(1, (RELOAD_TIME - this.reloadT) / RELOAD_TIME) * Math.PI) : 0;
    const sprint = state.sprinting ? 1 : 0;
    const k = this.kick * this.kick;
    this.vm.position.set(AIM_POS.x * a + (0.13 + Math.sin(this.bobT * 0.5) * amp - sprint * 0.04) * hip, AIM_POS.y * a + (-0.14 + Math.abs(Math.cos(this.bobT * 0.5)) * amp - lower * 0.16 - sprint * 0.07) * hip + Math.abs(Math.cos(this.bobT * 0.5)) * amp * a, AIM_POS.z * a + 0.3 * hip - k * 0.055);
    this.vm.rotation.set(0.02 * hip - k * 0.22 + lower * 0.9 + sprint * 0.55, -0.04 * hip - sprint * 0.35, lower * 0.25 + Math.sin(this.bobT * 0.5) * amp * 2);
    this.fx.update(dt);
  }

  private fire(state: { moving: boolean; sprinting: boolean }, hooks: { onShot(): void; onRecoil(p: number, y: number): void; onReport(r: HitReport): void }): void {
    this.mag--; this.cooldown = FIRE_INTERVAL; this.kick = 1; this.heat = Math.min(1, this.heat + 0.45);
    this.fx.muzzleFlash(); this.sfx.gunshot(); hooks.onShot();
    hooks.onRecoil(0.022 + Math.random() * 0.01, (Math.random() - 0.5) * 0.012);

    const cam = this.camera, origin = cam.globalPosition.clone(), fwd = cam.getDirection(Vector3.Forward());
    const spread = (0.003 + (state.moving ? 0.007 : 0) + (state.sprinting ? 0.01 : 0)) * (1 - 0.65 * this.aimT);
    const right = cam.getDirection(Vector3.Right()), up = cam.getDirection(Vector3.Up());
    const dir = fwd.add(right.scale((Math.random() - 0.5) * 2 * spread)).add(up.scale((Math.random() - 0.5) * 2 * spread)).normalize();
    this.ray.origin.copyFrom(origin); this.ray.direction.copyFrom(dir); this.ray.length = RANGE;
    const hit = this.scene.pickWithRay(this.ray, (m: AbstractMesh) => !!(m.metadata?.enemy) || (m.checkCollisions && m.name !== "player-body"));
    const muzzle = this.muzzleWorld;
    if (hit?.hit && hit.pickedPoint) {
      const p = hit.pickedPoint, enemy = hit.pickedMesh?.metadata?.enemy as Damageable | undefined;
      this.fx.tracer(muzzle, p);
      if (enemy) {
        const part = hit.pickedMesh?.metadata?.part as HitPart;
        this.fx.impactEnemy(p, dir); this.sfx.metalHit(0);
        hooks.onReport({ kind: "enemy", part, enemy });
      } else {
        const n = hit.getNormal(true, true) ?? dir.scale(-1);
        this.fx.impactWorld(p, n); this.sfx.impact(); hooks.onReport({ kind: "world", mesh: hit.pickedMesh ?? undefined, point: p.clone(), dir: dir.clone() });
      }
    } else { this.fx.tracer(muzzle, origin.add(dir.scale(40))); hooks.onReport({ kind: "none" }); }
  }
}
