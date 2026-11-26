/** Obiettivi di gioco (GDD M9). Logica pura. */
export interface Objective { id: string; text: string; done: boolean }

export class Objectives {
  readonly list: Objective[] = [
    { id: "find_key", text: "Trova la chiave del magazzino", done: false },
    { id: "open_warehouse", text: "Apri la porta del magazzino", done: false },
  ];
  /** Segna un obiettivo come completato; ritorna l'obiettivo se è appena cambiato. */
  complete(id: string): Objective | undefined {
    const o = this.list.find((x) => x.id === id); if (!o || o.done) return undefined; o.done = true; return o;
  }
  get current(): Objective | undefined { return this.list.find((o) => !o.done); }
}
