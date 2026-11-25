export interface StaminaConfig { max: number; drain: number; regen: number; regenDelay: number; resumeAt: number }
export const DEFAULT_STAMINA: StaminaConfig = { max: 100, drain: 20, regen: 14, regenDelay: 1, resumeAt: 25 };

/** Stamina pura (testabile): corsa consuma, recupero dopo un ritardo, sblocco sopra `resumeAt`. */
export class Stamina {
  value: number;
  private idle = 0;
  private exhausted = false;

  constructor(private readonly cfg: StaminaConfig = DEFAULT_STAMINA) {
    this.value = cfg.max;
  }

  get canSprint(): boolean { return !this.exhausted && this.value > 0; }
  get ratio(): number { return this.value / this.cfg.max; }

  /** Ritorna true se il giocatore sta effettivamente correndo. */
  update(wantsSprint: boolean, moving: boolean, dt: number): boolean {
    const sprinting = wantsSprint && moving && this.canSprint;
    if (sprinting) {
      this.value = Math.max(0, this.value - this.cfg.drain * dt);
      this.idle = 0;
      if (this.value === 0) this.exhausted = true;
    } else {
      this.idle += dt;
      if (this.idle >= this.cfg.regenDelay) this.value = Math.min(this.cfg.max, this.value + this.cfg.regen * dt);
      if (this.exhausted && this.value >= this.cfg.resumeAt) this.exhausted = false;
    }
    return sprinting;
  }
}
