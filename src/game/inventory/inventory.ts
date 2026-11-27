/** Inventario a slot (GDD M4): capacità limitata, pile per tipo. Logica pura, testabile senza motore. */
export type ItemKind = "key" | "heal" | "ammo" | "material" | "misc" | "weapon";

export interface ItemDef {
  id: string;
  name: string;
  kind: ItemKind;
  stack: number;
  desc: string;
  /** Nome dell'icona SVG (vedi inventory-ui). */
  icon: string;
  /** Punti vita recuperati all'uso (solo `heal`). */
  heal?: number;
}

export const ITEMS: Record<string, ItemDef> = {
  key_warehouse: { id: "key_warehouse", name: "Chiave elettronica", kind: "key", stack: 1, icon: "card", desc: "Tessera magnetica di accesso. Apre le porte che portano ad altri ambienti, come il magazzino a est." },
  pistol: { id: "pistol", name: "Beretta M9", kind: "weapon", stack: 1, icon: "pistol", desc: "Pistola semiautomatica 9 mm, caricatore da 15. Altre armi verranno aggiunte." },
  tape: { id: "tape", name: "Nastro adesivo", kind: "material", stack: 4, icon: "tape", desc: "Rotolo di nastro americano. Materiale da crafting (non ancora disponibile)." },
  rags: { id: "rags", name: "Stracci", kind: "material", stack: 6, icon: "rags", desc: "Stracci puliti. Materiale da crafting (non ancora disponibile)." },
  gauze: { id: "gauze", name: "Garze", kind: "heal", stack: 3, icon: "gauze", heal: 25, desc: "Garze sterili. Recuperano 25 punti vita." },
  canned_food: { id: "canned_food", name: "Lattina di cibo", kind: "heal", stack: 4, icon: "can", heal: 10, desc: "Cibo in scatola. Recupera 10 punti vita." },
  alcohol: { id: "alcohol", name: "Alcol", kind: "material", stack: 3, icon: "bottle", desc: "Alcol etilico. Utile per il crafting (non ancora disponibile)." },
};

export interface Slot { id: string; count: number }

export class Inventory {
  readonly slots: (Slot | undefined)[];

  constructor(readonly capacity = 12) { this.slots = new Array<Slot | undefined>(capacity).fill(undefined); }

  get used(): number { return this.slots.filter(Boolean).length; }
  count(id: string): number { return this.slots.reduce((n, s) => n + (s?.id === id ? s.count : 0), 0); }
  has(id: string): boolean { return this.count(id) > 0; }

  /** Aggiunge `n` oggetti; ritorna quanti ne sono entrati davvero (0 se lo zaino è pieno). */
  add(id: string, n = 1): number {
    const def = ITEMS[id]; if (!def) return 0;
    let left = n;
    for (const s of this.slots) { if (left <= 0) break; if (s?.id === id && s.count < def.stack) { const t = Math.min(def.stack - s.count, left); s.count += t; left -= t; } }
    for (let i = 0; i < this.slots.length && left > 0; i++) {
      if (!this.slots[i]) { const t = Math.min(def.stack, left); this.slots[i] = { id, count: t }; left -= t; }
    }
    return n - left;
  }

  /** Toglie `n` oggetti (dalle pile più piccole). Ritorna true se erano presenti. */
  remove(id: string, n = 1): boolean {
    if (this.count(id) < n) return false;
    let left = n;
    const order = this.slots.map((s, i) => ({ s, i })).filter((x) => x.s?.id === id).sort((a, b) => (a.s as Slot).count - (b.s as Slot).count);
    for (const { s, i } of order) {
      if (left <= 0) break; const slot = s as Slot; const t = Math.min(slot.count, left); slot.count -= t; left -= t;
      if (slot.count === 0) this.slots[i] = undefined;
    }
    return true;
  }

  removeAt(index: number, n = 1): boolean {
    const s = this.slots[index]; if (!s || s.count < n) return false;
    s.count -= n; if (s.count === 0) this.slots[index] = undefined; return true;
  }
}
