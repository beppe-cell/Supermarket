import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import type { AssetContainer } from "@babylonjs/core/assetContainer";
import type { Scene } from "@babylonjs/core/scene";
import type { NavGrid } from "../ai/nav-grid";
import { angleTo } from "../ai/perception";
import type { Sfx } from "../../core/audio/sfx";
import type { Damageable, HitPart } from "../combat/damageable";

export type EnemyState = "move" | "attack" | "hit" | "dead";

/** Gruppo di 3–4 infetti: gira per il negozio verso un punto, finché uno di loro non nota il giocatore (allora attaccano e inseguono tutti). */
export interface HordeGroup {
  id: number;
  field: Float32Array | undefined;     // campo di flusso verso il punto di passeggio corrente
  waypoint: { x: number; z: number };
  alerted: boolean;
  loseT: number;
  waitT: number;
  arrived: boolean;
}
type Kind = "walk" | "shamble" | "run";

export interface HordeContext {
  player: Vector3;
  playerAlive: boolean;
  grid: NavGrid;
  /** Campo di distanze verso il giocatore (condiviso da tutta l'orda). */
  field: Float32Array;
  sfx: Sfx;
  hurtPlayer(amount: number, from: Vector3): void;
  others: readonly Infected[];
  /** Un membro ha notato il giocatore: allerta tutto il gruppo. */
  alert(g: HordeGroup): void;
}

const FACING_OFFSET = 0;                                   // il fronte del modello (glTF +Z) guarda +Z locale (verificato a vista)
/** Velocità di riferimento dei cicli (m/s a ratio 1, misurate da tools/humanoid_anims.py: piedi senza scivolamento) e velocità di movimento. */
const ANIM_V: Record<Kind, number> = { walk: 1.15, shamble: 0.76, run: 2.14 };
const SPEED: Record<Kind, number> = { walk: 1.15, shamble: 0.8, run: 2.35 };
const LOOPS = new Set(["Idle", "Walk", "Shamble", "Run"]);
const WANDER_SPEED = 0.55, SIGHT = 13, HEAR = 3.6, FOV_HALF = 1.25;
const MELEE_RANGE = 1.35, MELEE_DAMAGE = 7;
const DAMAGE: Record<HitPart, number> = { head: 70, torso: 34, legs: 24 };

/** Membro dell'orda: uomo infetto disarmato che segue il campo di flusso verso il giocatore, con andature diverse, separazione dai vicini,
 *  attacco corpo a corpo, reazione al colpo e morte (due varianti). */
export class Infected implements Damageable {
  readonly root: TransformNode;
  state: EnemyState = "move";
  hp = 70;
  readonly kind: Kind;
  private readonly groups = new Map<string, AnimationGroup>();
  private cur = ""; private prev = ""; private fade = 1;
  private readonly hitboxes: AbstractMesh[] = [];
  private yaw = 0;
  private readonly speedMul: number;
  private cooldown = 0; private attackT = 0; private attackHit = false; private hitT = 0; private deadT = 0;
  private growlT: number;
  private debugHold = false;
  group!: HordeGroup;
  /** Vede/sente il giocatore in questo frame (usato dal gruppo per decidere quando perdere le tracce). */
  sees = false;

  private constructor(scene: Scene, readonly id: number, rnd: () => number) {
    this.root = new TransformNode(`infected${id}`, scene);
    const r = rnd();
    this.kind = r < 0.2 ? "run" : r < 0.55 ? "shamble" : "walk";
    this.speedMul = 0.88 + rnd() * 0.26;
    this.growlT = 2 + rnd() * 8;
  }

  static create(scene: Scene, container: AssetContainer, id: number, x: number, z: number, yaw: number, rnd: () => number, group?: HordeGroup): Infected {
    const a = new Infected(scene, id, rnd);
    if (group) a.group = group;
    const inst = container.instantiateModelsToScene((n) => `${n}_e${id}`, false, { doNotInstantiate: true });
    const model = inst.rootNodes[0]; if (model) model.parent = a.root;
    for (const g of inst.animationGroups) { g.stop(); a.groups.set(g.name.replace(/_e\d+$/, ""), g); }
    a.root.position.set(x, 0, z); a.yaw = yaw; a.root.rotation.y = yaw + FACING_OFFSET;
    const mk = (part: HitPart, w: number, h: number, d: number, y: number) => {
      const b = MeshBuilder.CreateBox(`hit_${part}_${id}`, { width: w, height: h, depth: d }, scene);
      b.parent = a.root; b.position.y = y; b.isVisible = false; b.isPickable = true; b.checkCollisions = false; b.metadata = { enemy: a, part }; a.hitboxes.push(b);
    };
    mk("head", 0.26, 0.27, 0.28, 1.71); mk("torso", 0.5, 0.62, 0.3, 1.27); mk("legs", 0.4, 1.0, 0.3, 0.5);
    a.play("Idle", 0, rnd);
    return a;
  }

  get position(): Vector3 { return this.root.position; }
  get alive(): boolean { return this.state !== "dead"; }
  get corpseAge(): number { return this.deadT; }

  /** Cambia clip con dissolvenza incrociata (cicli: fase casuale per non marciare tutti all'unisono). */
  private play(name: string, fadeTime = 0.22, rnd?: () => number): void {
    if (this.cur === name) return;
    const g = this.groups.get(name); if (!g) return;
    if (this.prev) { const pg = this.groups.get(this.prev); if (pg) pg.stop(); }
    this.prev = this.cur; this.cur = name; this.fade = fadeTime <= 0 ? 1 : 0; this.fadeTime = fadeTime;
    const loop = LOOPS.has(name);
    g.start(loop, 1, g.from, g.to, false); g.setWeightForAllAnimatables(this.fade);
    if (loop && rnd) g.goToFrame(g.from + rnd() * (g.to - g.from));
    if (this.fade >= 1 && this.prev) { const pg = this.groups.get(this.prev); if (pg) pg.stop(); this.prev = ""; }
  }
  private fadeTime = 0.22;

  private blend(dt: number): void {
    if (this.fade >= 1) return;
    this.fade = Math.min(1, this.fade + dt / Math.max(0.01, this.fadeTime));
    this.groups.get(this.cur)?.setWeightForAllAnimatables(this.fade);
    const pg = this.prev ? this.groups.get(this.prev) : undefined;
    if (pg) { if (this.fade >= 1) { pg.stop(); this.prev = ""; } else pg.setWeightForAllAnimatables(1 - this.fade); }
  }

  /** Colpito da un proiettile. Ritorna true se muore con questo colpo. */
  hit(part: HitPart, ctx: { sfx: Sfx; player: Vector3 }): boolean {
    if (!this.alive) return false;
    this.hp -= DAMAGE[part]; this.group.alerted = true; this.group.loseT = 0;
    if (this.hp <= 0) { this.die(ctx); return true; }
    if (this.state !== "attack" && Math.random() < 0.75) { this.state = "hit"; this.hitT = 0.5; this.play("Hit", 0.08); }
    return false;
  }

  private die(ctx: { sfx: Sfx; player: Vector3 }): void {
    this.state = "dead"; this.deadT = 0;
    for (const b of this.hitboxes) b.isPickable = false;
    this.play(Math.random() < 0.5 ? "Death" : "DeathF", 0.1);
    ctx.sfx.death(Vector3.Distance(this.root.position, ctx.player), 0);
  }

  dispose(): void { for (const g of this.groups.values()) g.dispose(); this.root.dispose(false, false); }

  /** Solo QA (?debug=1): blocca l'IA e riproduce un clip. */
  debugPlay(name: string, loop: boolean, yaw?: number, frac?: number): void {
    this.debugHold = true; if (yaw !== undefined) { this.yaw = yaw; this.root.rotation.y = yaw + FACING_OFFSET; }
    for (const g of this.groups.values()) g.stop();
    const g = this.groups.get(name); if (g) { g.start(loop, 1, g.from, g.to, false); g.setWeightForAllAnimatables(1); if (frac !== undefined) { g.goToFrame(g.from + frac * (g.to - g.from)); g.pause(); } }
  }

  private turnTo(target: number, rate: number, dt: number): number {
    let d = target - this.yaw; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI;
    this.yaw += Math.max(-rate * dt, Math.min(rate * dt, d));
    return d;
  }

  update(dt: number, ctx: HordeContext): void {
    if (this.debugHold) return;
    this.blend(dt);
    if (this.state === "dead") { this.deadT += dt; return; }
    const me = this.root.position, pl = ctx.player;
    const dx = pl.x - me.x, dz = pl.z - me.z, dist = Math.hypot(dx, dz);
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.growlT -= dt;
    if (this.growlT <= 0 && this.group.alerted) { this.growlT = 7 + Math.random() * 9; if (dist < 22) ctx.sfx.growl(dist, Math.max(-1, Math.min(1, Math.sin(angleTo({ x: pl.x, z: pl.z }, 0, { x: me.x, z: me.z }))))); }

    if (this.state === "hit") {
      this.hitT -= dt; if (this.hitT <= 0) { this.state = "move"; this.group.alerted = true; this.play(this.kind === "run" ? "Run" : "Walk", 0.2); }
    } else if (this.state === "attack") {
      this.attackT += dt; this.turnTo(Math.atan2(dx, dz), 5, dt);
      if (!this.attackHit && this.attackT > 0.55) { this.attackHit = true; if (dist < MELEE_RANGE + 0.5 && ctx.playerAlive) ctx.hurtPlayer(MELEE_DAMAGE, this.root.position); }
      if (this.attackT > 1.25) { this.state = "move"; this.cooldown = 0.7 + Math.random() * 0.5; }
    } else {
      // percezione: vicino (udito) oppure davanti, entro SIGHT e con linea libera (la torcia accesa li attira)
      this.sees = ctx.playerAlive && (dist < HEAR || (dist < SIGHT && Math.abs(angleTo({ x: me.x, z: me.z }, this.yaw, { x: pl.x, z: pl.z })) < FOV_HALF && ctx.grid.lineClear({ x: me.x, z: me.z }, { x: pl.x, z: pl.z })));
      if (this.sees && !this.group.alerted) { ctx.alert(this.group); this.growlT = 0; }
      const chasing = this.group.alerted;
      let dir: { x: number; z: number } | undefined;
      if (chasing) {
        if (dist < 7 && ctx.grid.lineClear({ x: me.x, z: me.z }, { x: pl.x, z: pl.z })) dir = { x: dx / (dist || 1), z: dz / (dist || 1) };
        else dir = ctx.grid.flowDir(ctx.field, me.x, me.z);
      } else if (this.group.field && !this.group.arrived) dir = ctx.grid.flowDir(this.group.field, me.x, me.z);
      let sx = 0, sz = 0;                                               // separazione dai vicini (niente compenetrazione fra nemici)
      for (const o of ctx.others) {
        if (o === this || !o.alive) continue;
        const ox = me.x - o.root.position.x, oz = me.z - o.root.position.z, d2 = ox * ox + oz * oz;
        if (d2 < 0.64 && d2 > 1e-6) { const d = Math.sqrt(d2), k = (0.8 - d) / 0.8; sx += (ox / d) * k; sz += (oz / d) * k; }
      }
      let v = 0;
      if (dir && (!chasing || dist > 1.0)) {
        const tx = dir.x + sx * 1.6, tz = dir.z + sz * 1.6;
        const diff = this.turnTo(Math.atan2(tx, tz), chasing ? (this.kind === "shamble" ? 3.2 : 4.6) : 1.8, dt);
        const base = chasing ? SPEED[this.kind] : WANDER_SPEED;
        v = base * this.speedMul * Math.max(0, Math.cos(diff)) ** 1.5;
        me.x += Math.sin(this.yaw) * v * dt; me.z += Math.cos(this.yaw) * v * dt;
      } else if (chasing) this.turnTo(Math.atan2(dx, dz), 5, dt);
      const clip = chasing ? (this.kind === "run" ? "Run" : this.kind === "shamble" ? "Shamble" : "Walk") : "Shamble", ref = chasing ? this.kind : "shamble";
      if (v < 0.08) this.play("Idle", 0.35); else { this.play(clip, 0.3); const g = this.groups.get(this.cur); if (g) g.speedRatio = Math.max(0.5, Math.min(1.9, v / ANIM_V[ref as Kind])); }
      if (chasing && dist < MELEE_RANGE && this.cooldown <= 0 && ctx.playerAlive && Math.abs(angleTo({ x: me.x, z: me.z }, this.yaw, { x: pl.x, z: pl.z })) < 0.7) {
        this.state = "attack"; this.attackT = 0; this.attackHit = false; this.play(Math.random() < 0.5 ? "Attack" : "Swipe", 0.12); ctx.sfx.swing(dist, 0);
      }
    }
    this.root.rotation.y = this.yaw + FACING_OFFSET;
  }
}
