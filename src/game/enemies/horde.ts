import { Color3 } from "@babylonjs/core/Maths/math.color";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial";
import type { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { AssetContainer } from "@babylonjs/core/assetContainer";
import type { Scene } from "@babylonjs/core/scene";
import type { NavGrid, Pt } from "../ai/nav-grid";
import type { Sfx } from "../../core/audio/sfx";
import { ZONE1 } from "../levels/zone1";
import { Infected, type HordeGroup } from "./infected";

export interface HordeConfig {
  /** Gruppi totali (3–4 infetti ciascuno). */
  groups: number;
  /** Massimo di nemici vivi contemporaneamente. */
  maxAlive: number;
  /** Secondi fra l'ingresso di un gruppo e il successivo. */
  interval: number;
}

const LOSE_TRACK = 10;                      // s senza vedere il giocatore: il gruppo torna a vagare

/** Orde a gruppi: ogni gruppo (3–4) entra dall'ingresso, vaga fra le corsie verso punti casuali e, quando uno di loro nota il giocatore
 *  (vista, udito, sparo vicino, colpo subito), tutto il gruppo attacca e insegue con un unico campo di flusso. */
export class Horde {
  readonly list: Infected[] = [];
  private readonly groups: HordeGroup[] = [];
  private started = false;
  private spawnedGroups = 0;
  private spawnT = 0;
  private fieldT = 0;
  private field: Float32Array | undefined;
  private nextId = 1;
  private nextGroup = 1;
  private seed = 20251127;
  private readonly waypoints: Pt[] = [];

  constructor(private readonly scene: Scene, private readonly model: AssetContainer, private readonly grid: NavGrid, private readonly cfg: HordeConfig) {
    // la pelle sotto il cappuccio e nella penombra resterebbe nera: quota autoilluminata con la stessa texture (viso e mani leggibili)
    for (const m of model.materials) {
      if (m instanceof PBRMaterial && m.name.startsWith("Std_") && m.albedoTexture && !m.emissiveTexture) {
        m.emissiveTexture = m.albedoTexture; const k = m.name.includes("Head") ? 0.5 : 0.32; m.emissiveColor = new Color3(k, k, k);
      }
    }
    for (const x of ZONE1.aisleX) for (const z of [-8.2, 1.5, 6, 11, 15.2]) if (!grid.isBlocked(x, z)) this.waypoints.push({ x, z });
    for (const p of [{ x: -27.5, z: 2 }, { x: -27.5, z: 12 }, { x: -27.5, z: -10 }, { x: 30, z: -10 }, { x: 30, z: 10 }, { x: 0, z: -17 }, { x: -12, z: -17 }, { x: 12, z: -17 }]) if (!grid.isBlocked(p.x, p.z)) this.waypoints.push(p);
  }

  get isStarted(): boolean { return this.started; }
  get aliveCount(): number { let n = 0; for (const e of this.list) if (e.alive) n++; return n; }
  get groupCount(): number { return this.groups.length; }
  get alertedCount(): number { return this.groups.filter((g) => g.alerted).length; }

  private rnd = (): number => { this.seed = (this.seed + 0x6d2b79f5) >>> 0; let t = this.seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  private warmup: Infected | undefined;
  /** Mostra un nemico davanti alla camera durante il caricamento (shader di mesh scheletrata e texture compilati prima dell'assalto). */
  warm(x: number, z: number): void { this.warmup = Infected.create(this.scene, this.model, 0, x, z, Math.PI, this.rnd, { id: 0, field: undefined, waypoint: { x, z }, alerted: false, loseT: 0, waitT: 0, arrived: true }); }
  endWarm(): void { this.warmup?.dispose(); this.warmup = undefined; }

  start(): void { if (!this.started) { this.started = true; this.spawnT = 0; } }

  private pickWaypoint(g: HordeGroup, from?: Pt): void {
    let best: Pt | undefined;
    for (let i = 0; i < 6; i++) { const w = this.waypoints[Math.floor(this.rnd() * this.waypoints.length)]; if (w && (!from || Math.hypot(w.x - from.x, w.z - from.z) > 8)) { best = w; break; } }
    g.waypoint = best ?? (this.waypoints[0] as Pt); g.field = this.grid.flowField(g.waypoint); g.arrived = false; g.waitT = 0;
  }

  private spawnGroup(): void {
    const g: HordeGroup = { id: this.nextGroup++, field: undefined, waypoint: { x: 0, z: 0 }, alerted: false, loseT: 0, waitT: 0, arrived: false };
    this.pickWaypoint(g, { x: 0, z: -22 }); this.groups.push(g);
    const n = 3 + (this.rnd() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * 1.1 + (this.rnd() - 0.5) * 0.4, z = -22.8 - this.rnd() * 0.6;
      this.list.push(Infected.create(this.scene, this.model, this.nextId++, x, z, 0, this.rnd, g));
    }
    this.spawnedGroups++;
  }

  /** Rumore (sparo) o presenza: allerta i gruppi con un membro entro `radius` metri da (x,z). */
  alertNear(x: number, z: number, radius: number): void {
    for (const g of this.groups) if (!g.alerted && this.list.some((e) => e.group === g && e.alive && Math.hypot(e.position.x - x, e.position.z - z) < radius)) { g.alerted = true; g.loseT = 0; }
  }

  update(dt: number, player: Vector3, ctx: { playerAlive: boolean; sfx: Sfx; hurtPlayer(n: number, from: Vector3): void }): void {
    if (!this.started) return;
    this.spawnT -= dt; this.fieldT -= dt;
    if (!this.field || this.fieldT <= 0) { this.fieldT = 0.4; this.field = this.grid.flowField({ x: player.x, z: player.z }); }
    if (this.spawnT <= 0 && this.spawnedGroups < this.cfg.groups) {
      if (this.aliveCount + 4 <= this.cfg.maxAlive) { this.spawnGroup(); this.spawnT = this.cfg.interval; } else this.spawnT = 2;
    }
    // vita dei gruppi: arrivo al punto → sosta → nuovo punto; perdita delle tracce → si torna a vagare
    for (const g of this.groups) {
      const members = this.list.filter((e) => e.group === g && e.alive);
      if (members.length === 0) continue;
      if (g.alerted) {
        g.loseT = members.some((e) => e.sees) ? 0 : g.loseT + dt;
        if (g.loseT > LOSE_TRACK) { g.alerted = false; g.loseT = 0; this.pickWaypoint(g, members[0]?.position); }
      } else {
        const near = members.filter((e) => Math.hypot(e.position.x - g.waypoint.x, e.position.z - g.waypoint.z) < 3.2).length;
        if (!g.arrived && near >= Math.ceil(members.length / 2)) { g.arrived = true; g.waitT = 3 + this.rnd() * 6; }
        if (g.arrived) { g.waitT -= dt; if (g.waitT <= 0) this.pickWaypoint(g, g.waypoint); }
      }
    }
    const full = { player, playerAlive: ctx.playerAlive, grid: this.grid, field: this.field, sfx: ctx.sfx, hurtPlayer: ctx.hurtPlayer, others: this.list, alert: (g: HordeGroup) => { g.alerted = true; g.loseT = 0; } };
    for (const e of this.list) e.update(dt, full);
    // i cadaveri restano a terra, ma al massimo 10 (i più vecchi spariscono)
    const dead = this.list.filter((e) => !e.alive).sort((a, b) => b.corpseAge - a.corpseAge);
    for (let i = 10; i < dead.length; i++) { const e = dead[i] as Infected; e.dispose(); this.list.splice(this.list.indexOf(e), 1); }
  }
}
