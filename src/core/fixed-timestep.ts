/** Accumulatore a passo fisso: logica deterministica separata dal render. */
export class FixedTimestep {
  private acc = 0;

  constructor(
    private readonly step = 1 / 60,
    private readonly maxSteps = 5,
  ) {}

  /** Ritorna quanti passi fissi eseguire per `dt` secondi di frame. */
  advance(dt: number): number {
    this.acc += Math.min(dt, this.step * this.maxSteps);
    let n = 0;
    while (this.acc >= this.step && n < this.maxSteps) {
      this.acc -= this.step;
      n++;
    }
    return n;
  }

  /** Frazione [0,1) per l'interpolazione di render. */
  get alpha(): number {
    return this.acc / this.step;
  }

  get stepSize(): number {
    return this.step;
  }
}
