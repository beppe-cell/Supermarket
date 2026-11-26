import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import type { AssetContainer } from "@babylonjs/core/assetContainer";
import type { Scene } from "@babylonjs/core/scene";
import type { NavGrid, Pt } from "../ai/nav-grid";
import { angleTo, canSee, detectionRange } from "../ai/perception";
import type { Sfx } from "../../core/audio/sfx";
import type { Damageable, HitPart } from "../combat/damageable";

export type EnemyState = "patrol" | "chase" | "search" | "attack" | "dead";

export interface EnemyContext {
  player: Vector3;
  playerFlags: { torch: boolean; sprinting: boolean; crouching: boolean };
  grid: NavGrid;
  sfx: Sfx;
  hurtPlayer(amount: number, from: Vector3): void;
  playerAlive: boolean;
}

const FACING_OFFSET = 0;           // calibrazione: orientamento del modello rispetto a +Z (verificato a vista)
const WALK_SPEED = 1.15, CHASE_SPEED = 2.5, TURN = 5;
/** Velocità (m/s) a cui i piedi non scivolano a ratio 1 (misurata da tools/humanoid_anims.py). */
const WALK_ANIM_V = 1.15, RUN_ANIM_V = 2.14;
const LOOPS = ["Idle", "Scan", "Walk", "Run"], ONESHOT = ["Attack", "Hit"];
const FOV = (110 * Math.PI) / 180, SIGHT = 15, MELEE_RANGE = 1.55, MELEE_DAMAGE = 12;
const DAMAGE: Record<HitPart, number> = { head: 60, torso: 34, legs: 22 };

/** Nemico "infetto" (uomo realistico): macchina a stati (pattuglia → insegue → cerca → attacca), percorso A*, vista/udito, animazioni crossfade. */
export class Infected implements Damageable {
  readonly root: TransformNode;
  state: EnemyState = "patrol";
  hp = 100;
  private readonly groups = new Map<string, AnimationGroup>();
  private readonly weights = new Map<string, number>([["Idle", 1]]);
  private hitT = 0;
  private scanning = false;
  private readonly hitboxes: AbstractMesh[] = [];
  private yaw = 0;
  private path: Pt[] = [];
  private repath = 0;
  private wp = 0;
  private wait = 0;
  private lastKnown: Pt | undefined;
  private lostSight = 0;
  private sees = false;
  private seeTimer = 0;
  private attackT = 0;
  private attackHit = false;
  private cooldown = 0;
  private stepDist = 0;
  private growled = false;
  private alertT = 0;
  private flashT = 0;

  private constructor(scene: Scene, readonly id: number, private readonly patrolPts: Pt[]) {
    this.root = new TransformNode(`infected${id}`, scene);
  }

  static create(scene: Scene, container: AssetContainer, id: number, start: Pt, patrol: Pt[], yaw = 0): Infected {
    // la pelle sotto il cappuccio resterebbe nera: una piccola quota autoilluminata (stessa texture) la tiene leggibile
    for (const m of container.materials) if (m instanceof PBRMaterial && m.name.startsWith("Std_") && m.albedoTexture && !m.emissiveTexture) { m.emissiveTexture = m.albedoTexture; m.emissiveColor = new Color3(0.2, 0.2, 0.2); }
    const a = new Infected(scene, id, patrol);
    const inst = container.instantiateModelsToScene((n) => `${n}_a${id}`, false, { doNotInstantiate: true });
    const model = inst.rootNodes[0];
    if (model) model.parent = a.root;
    for (const g of inst.animationGroups) { const n = g.name.replace(/_a\d+$/, ""); a.groups.set(n, g); }
    for (const [n, g] of a.groups) { g.stop(); if (n === "Idle") { g.start(true, 1, g.from, g.to, false); g.setWeightForAllAnimatables(1); } }
    a.root.position.set(start.x, 0, start.z); a.yaw = yaw; a.root.rotation.y = yaw + FACING_OFFSET;
    // hitbox invisibili per parte del corpo (raggiungibili dal raycast dei proiettili)
    const mk = (part: HitPart, w: number, h: number, d: number, y: number) => {
      const b = MeshBuilder.CreateBox(`hit_${part}_${id}`, { width: w, height: h, depth: d }, scene);
      b.parent = a.root; b.position.y = y; b.isVisible = false; b.isPickable = true; b.checkCollisions = false; b.metadata = { enemy: a, part }; a.hitboxes.push(b);
    };
    mk("head", 0.26, 0.27, 0.28, 1.71); mk("torso", 0.5, 0.62, 0.3, 1.27); mk("legs", 0.4, 1.0, 0.3, 0.5);
    return a;
  }

  get position(): Vector3 { return this.root.position; }
  get alive(): boolean { return this.state !== "dead"; }

  private play(name: string, loop: boolean, speed = 1): void {
    const g = this.groups.get(name); if (!g) return;
    g.stop(); g.start(loop, speed, g.from, g.to, false); g.setWeightForAllAnimatables(0);
    this.weights.set(name, 0);
  }

  /** Colpito da un proiettile. Ritorna true se il nemico è morto con questo colpo. */
  hit(part: HitPart, ctx: Pick<EnemyContext, "sfx" | "player">): boolean {
    if (!this.alive) return false;
    this.hp -= DAMAGE[part]; this.flashT = 0.12;
    if (this.hp > 0 && this.state !== "attack") { this.hitT = 0.5; this.play("Hit", false, 1.1); }
    if (this.state === "patrol" || this.state === "search") { this.state = "chase"; this.lastKnown = { x: ctx.player.x, z: ctx.player.z }; this.alertT = 0; }
    if (this.hp <= 0) { this.die(ctx); return true; }
    return false;
  }

  /** Un rumore (sparo, corsa vicina) richiama l'attenzione. */
  hear(at: Pt): void {
    if (!this.alive || this.state === "chase" || this.state === "attack") return;
    this.lastKnown = at; this.state = "search"; this.path = []; this.repath = 0; this.wait = 0;
  }

  private die(ctx: Pick<EnemyContext, "sfx" | "player">): void {
    this.state = "dead";
    for (const b of this.hitboxes) b.isPickable = false;
    for (const [n, g] of this.groups) if (n !== "Death") g.stop();
    this.play("Death", false, 1); this.weights.set("Death", 1); this.groups.get("Death")?.setWeightForAllAnimatables(1);
    const d = Vector3.Distance(this.root.position, ctx.player);
    ctx.sfx.death(d, 0);
  }

  /** Solo QA (?debug=1): blocca l'IA e riproduce un clip; `yaw` orienta il modello. */
  debugPlay(name: string, loop: boolean, yaw?: number, frac?: number): void {
    this.debugHold = true; if (yaw !== undefined) { this.yaw = yaw; this.root.rotation.y = yaw + FACING_OFFSET; }
    for (const g of this.groups.values()) g.stop();
    const g = this.groups.get(name); if (g) { g.start(loop, 1, g.from, g.to, false); g.setWeightForAllAnimatables(1); if (frac !== undefined) { g.goToFrame(g.from + frac * (g.to - g.from)); g.pause(); } }
  }
  private debugHold = false;
  debugBone(name: string): unknown { const n = this.root.getChildTransformNodes(false, (x) => x.name.startsWith(name))[0]; return n ? [n.name, n.rotationQuaternion?.asArray().map((v) => +v.toFixed(3)), n.position.asArray().map((v) => +v.toFixed(3))] : null; }
  debugInfo(): unknown { return [...this.groups].map(([n, g]) => [n, g.isPlaying, g.from, g.to, g.targetedAnimations.length, +(g.animatables[0]?.masterFrame ?? -1).toFixed(1), g.speedRatio]); }

  update(dt: number, ctx: EnemyContext): void {
    if (this.state === "dead" || this.debugHold) return;
    const me: Pt = { x: this.root.position.x, z: this.root.position.z };
    const pl: Pt = { x: ctx.player.x, z: ctx.player.z };
    const dist = Math.hypot(pl.x - me.x, pl.z - me.z);
    this.cooldown = Math.max(0, this.cooldown - dt);

    // percezione (10 Hz)
    this.seeTimer -= dt;
    if (this.seeTimer <= 0) {
      this.seeTimer = 0.1;
      const range = detectionRange(SIGHT, ctx.playerFlags);
      this.sees = ctx.playerAlive && canSee(me, this.yaw, pl, { fov: FOV, range }, ctx.grid);
      // udito: corsa vicina o torcia accesa molto vicina → allerta anche senza vista
      if (!this.sees && ctx.playerFlags.sprinting && dist < 9 && ctx.grid.lineClear(me, pl)) this.sees = true;
    }
    if (this.sees && ctx.playerAlive) {
      this.lastKnown = pl; this.lostSight = 0;
      if (this.state === "patrol" || this.state === "search") {
        this.state = "chase"; this.repath = 0; this.growled = false;
      }
    } else if (this.state === "chase") { this.lostSight += dt; if (this.lostSight > 4) { this.state = "search"; this.path = []; this.repath = 0; this.wait = 0; } }
    if (this.state === "chase" && !this.growled) { this.growled = true; ctx.sfx.growl(dist, Math.max(-1, Math.min(1, Math.sin(angleTo(pl, 0, me))))); }

    switch (this.state) {
      case "patrol": this.doPatrol(dt, me, ctx.grid); break;
      case "search": this.doSearch(dt, me, ctx.grid); break;
      case "chase": this.doChase(dt, me, pl, dist, ctx); break;
      case "attack": this.doAttack(dt, me, pl, dist, ctx); break;
      default: break;
    }
    this.blendAnimations(dt);
    this.root.rotation.y = this.yaw + FACING_OFFSET;
    // passi metallici in base alla distanza percorsa
    if (this.moving) { this.stepDist += this.speedNow * dt; if (this.stepDist > 0.75) { this.stepDist = 0; ctx.sfx.step(dist, Math.max(-1, Math.min(1, Math.sin(angleTo(pl, ctx.player.y * 0, me))))); } }
    void this.alertT; void this.flashT;
  }

  private moving = false;
  private speedNow = 0;

  private followPath(dt: number, me: Pt, speed: number): boolean {
    const next = this.path[0]; if (!next) { this.moving = false; return false; }
    const dx = next.x - me.x, dz = next.z - me.z, d = Math.hypot(dx, dz);
    if (d < 0.25) { this.path.shift(); return this.path.length > 0; }
    this.turnTo(Math.atan2(dx, dz), dt);
    if (Math.abs(angleTo(me, this.yaw, next)) < 1.0) {
      const step = Math.min(speed * dt, d);
      this.root.position.x += (dx / d) * step; this.root.position.z += (dz / d) * step;
      this.moving = true; this.speedNow = speed;
    }
    return true;
  }
  private turnTo(target: number, dt: number): void {
    let d = target - this.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    this.yaw += Math.max(-TURN * dt, Math.min(TURN * dt, d));
  }

  private doPatrol(dt: number, me: Pt, grid: NavGrid): void {
    this.moving = false;
    if (this.wait > 0) { this.wait -= dt; return; }
    if (this.path.length === 0) {
      const target = this.patrolPts[this.wp % this.patrolPts.length]; if (!target) return;
      this.path = grid.findPath(me, target); this.wp++;
      if (this.path.length === 0) { this.wait = 1; return; }
    }
    if (!this.followPath(dt, me, WALK_SPEED)) { this.wait = 1.5 + (this.id % 3) * 0.4; this.path = []; }
  }

  private doSearch(dt: number, me: Pt, grid: NavGrid): void {
    this.moving = false; this.scanning = false;
    if (!this.lastKnown) { this.state = "patrol"; return; }
    if (this.path.length === 0 && this.wait <= 0) {
      this.path = grid.findPath(me, this.lastKnown);
      if (this.path.length === 0) { this.wait = 2.5; }
    }
    if (this.wait > 0) { this.scanning = true; this.wait -= dt; if (this.wait <= 0) { this.state = "patrol"; this.path = []; } return; }
    if (!this.followPath(dt, me, WALK_SPEED * 1.4)) { this.wait = 3; this.path = []; }
  }

  private doChase(dt: number, me: Pt, pl: Pt, dist: number, ctx: EnemyContext): void {
    this.moving = false;
    if (!ctx.playerAlive) { this.state = "patrol"; this.path = []; return; }
    if (dist < MELEE_RANGE && this.sees && this.cooldown <= 0) { this.startAttack(dist, ctx); return; }
    this.repath -= dt;
    const target = this.lastKnown ?? pl;
    if (this.repath <= 0) { this.repath = 0.35; this.path = ctx.grid.lineClear(me, target) ? [target] : ctx.grid.findPath(me, target); }
    if (dist > 1.1) this.followPath(dt, me, CHASE_SPEED); else this.turnTo(Math.atan2(pl.x - me.x, pl.z - me.z), dt);
  }

  private startAttack(dist: number, ctx: EnemyContext): void {
    this.state = "attack"; this.attackT = 0; this.attackHit = false; this.moving = false; this.path = [];
    this.play("Attack", false, 1); ctx.sfx.swing(dist, 0);
  }
  private doAttack(dt: number, me: Pt, pl: Pt, dist: number, ctx: EnemyContext): void {
    this.moving = false;
    this.attackT += dt; this.turnTo(Math.atan2(pl.x - me.x, pl.z - me.z), dt);
    if (!this.attackHit && this.attackT > 0.55) { this.attackHit = true; if (dist < MELEE_RANGE + 0.35 && ctx.playerAlive) ctx.hurtPlayer(MELEE_DAMAGE, this.root.position); }
    if (this.attackT > 1.25) { this.state = "chase"; this.cooldown = 0.7; this.repath = 0; }
  }

  private blendAnimations(dt: number): void {
    this.hitT = Math.max(0, this.hitT - dt);
    let want = "Idle";
    if (this.hitT > 0) want = "Hit";
    else if (this.state === "attack") want = "Attack";
    else if (this.moving) want = this.state === "chase" ? "Run" : "Walk";
    else if (this.scanning && this.state === "search") want = "Scan";
    for (const n of [...LOOPS, ...ONESHOT]) {
      const g = this.groups.get(n); if (!g) continue;
      const cur = this.weights.get(n) ?? 0, tgt = n === want ? 1 : 0, w = cur + (tgt - cur) * Math.min(1, dt * (n === "Hit" ? 22 : 9));
      this.weights.set(n, w);
      if (LOOPS.includes(n)) {
        if (tgt > 0 && !g.isPlaying) { g.start(true, 1, g.from, g.to, false); g.setWeightForAllAnimatables(0); }
        else if (tgt === 0 && w < 0.01 && g.isPlaying) { g.stop(); this.weights.set(n, 0); continue; }
      }
      if (g.isPlaying) g.setWeightForAllAnimatables(w);
    }
    // sincronizza il ritmo dei passi con la velocità reale (niente piedi che scivolano)
    const walk = this.groups.get("Walk"), run = this.groups.get("Run");
    if (walk) walk.speedRatio = Math.max(0.3, this.speedNow / WALK_ANIM_V);
    if (run) run.speedRatio = Math.max(0.4, this.speedNow / RUN_ANIM_V);
  }
}
