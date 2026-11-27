import type { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { AssetContainer } from "@babylonjs/core/assetContainer";
import type { Scene } from "@babylonjs/core/scene";
import type { NavGrid } from "../ai/nav-grid";
import type { Sfx } from "../../core/audio/sfx";
import { Infected } from "./infected";

export interface HordeConfig {
  /** Nemici totali dell'assalto. */
  total: number;
  /** Massimo di nemici vivi contemporaneamente. */
  maxAlive: number;
  /** Nemici per ondata e secondi fra le ondate. */
  waveSize: number;
  interval: number;
}

/** Orde dall'ingresso (sud): ondate successive di infetti che entrano dalla bussola e seguono un unico campo di flusso verso il giocatore. */
export class Horde {
  readonly list: Infected[] = [];
  private started = false;
  private spawned = 0;
  private waveT = 0;
  private fieldT = 0;
  private field: Float32Array | undefined;
  private nextId = 1;
  private seed = 20251127;

  constructor(private readonly scene: Scene, private readonly model: AssetContainer, private readonly grid: NavGrid, private readonly cfg: HordeConfig) {}

  get isStarted(): boolean { return this.started; }
  get aliveCount(): number { let n = 0; for (const e of this.list) if (e.alive) n++; return n; }
  get remaining(): number { return this.cfg.total - this.spawned + this.aliveCount; }

  private rnd = (): number => { this.seed = (this.seed + 0x6d2b79f5) >>> 0; let t = this.seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

  private warmup: Infected | undefined;
  /** Mostra un nemico davanti alla camera durante il caricamento (shader di mesh scheletrata e texture compilati prima dell'assalto). */
  warm(x: number, z: number): void { this.warmup = Infected.create(this.scene, this.model, 0, x, z, Math.PI, this.rnd); }
  endWarm(): void { this.warmup?.dispose(); this.warmup = undefined; }

  start(): void { if (!this.started) { this.started = true; this.waveT = 0; } }

  private spawnWave(n: number): void {
    for (let i = 0; i < n; i++) {
      const x = (this.rnd() - 0.5) * 4.4, z = -22.6 + (this.rnd() - 0.5) * 1.2;
      this.list.push(Infected.create(this.scene, this.model, this.nextId++, x, z, 0, this.rnd));
      this.spawned++;
    }
  }

  update(dt: number, player: Vector3, ctx: { playerAlive: boolean; sfx: Sfx; hurtPlayer(n: number, from: Vector3): void }): void {
    if (!this.started) return;
    this.waveT -= dt; this.fieldT -= dt;
    if (!this.field || this.fieldT <= 0) { this.fieldT = 0.4; this.field = this.grid.flowField({ x: player.x, z: player.z }); }
    if (this.waveT <= 0 && this.spawned < this.cfg.total) {
      const n = Math.min(this.cfg.waveSize, this.cfg.total - this.spawned, this.cfg.maxAlive - this.aliveCount);
      if (n > 0) { this.spawnWave(n); this.waveT = this.cfg.interval; } else this.waveT = 1.5;
    }
    const full = { player, playerAlive: ctx.playerAlive, grid: this.grid, field: this.field, sfx: ctx.sfx, hurtPlayer: ctx.hurtPlayer, others: this.list };
    for (const e of this.list) e.update(dt, full);
    // i cadaveri restano a terra, ma al massimo 10 (i più vecchi spariscono)
    const dead = this.list.filter((e) => !e.alive).sort((a, b) => b.corpseAge - a.corpseAge);
    for (let i = 10; i < dead.length; i++) { const e = dead[i] as Infected; e.dispose(); this.list.splice(this.list.indexOf(e), 1); }
  }
}
