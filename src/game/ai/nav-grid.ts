/** Griglia di navigazione 2D (piano XZ) con A* a 8 direzioni e smoothing per linea di vista. Puro: testabile senza motore. */
export interface Pt { x: number; z: number }

export class NavGrid {
  readonly w: number;
  readonly h: number;
  private readonly blocked: Uint8Array;

  constructor(readonly minX: number, readonly minZ: number, readonly maxX: number, readonly maxZ: number, readonly cell = 0.5) {
    this.w = Math.ceil((maxX - minX) / cell);
    this.h = Math.ceil((maxZ - minZ) / cell);
    this.blocked = new Uint8Array(this.w * this.h);
  }

  private idx(cx: number, cz: number): number { return cz * this.w + cx; }
  inBounds(cx: number, cz: number): boolean { return cx >= 0 && cz >= 0 && cx < this.w && cz < this.h; }
  toCell(x: number, z: number): [number, number] { return [Math.floor((x - this.minX) / this.cell), Math.floor((z - this.minZ) / this.cell)]; }
  toWorld(cx: number, cz: number): Pt { return { x: this.minX + (cx + 0.5) * this.cell, z: this.minZ + (cz + 0.5) * this.cell }; }
  isBlockedCell(cx: number, cz: number): boolean { return !this.inBounds(cx, cz) || this.blocked[this.idx(cx, cz)] === 1; }
  isBlocked(x: number, z: number): boolean { const [cx, cz] = this.toCell(x, z); return this.isBlockedCell(cx, cz); }

  /** Blocca un box centrato (cx,cz) di dimensioni w×d, gonfiato di `margin` (raggio del nemico). */
  blockBox(cx: number, cz: number, w: number, d: number, margin = 0): void {
    const [x0, z0] = this.toCell(cx - w / 2 - margin, cz - d / 2 - margin);
    const [x1, z1] = this.toCell(cx + w / 2 + margin, cz + d / 2 + margin);
    for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) if (this.inBounds(x, z)) this.blocked[this.idx(x, z)] = 1;
  }

  /** Cella libera più vicina (anello crescente) a una cella possibilmente bloccata. */
  nearestFree(cx: number, cz: number, maxR = 8): [number, number] | undefined {
    if (!this.isBlockedCell(cx, cz)) return [cx, cz];
    for (let r = 1; r <= maxR; r++) {
      let best: [number, number] | undefined, bd = Infinity;
      for (let dz = -r; dz <= r; dz++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        if (!this.isBlockedCell(cx + dx, cz + dz)) { const d = dx * dx + dz * dz; if (d < bd) { bd = d; best = [cx + dx, cz + dz]; } }
      }
      if (best) return best;
    }
    return undefined;
  }

  /** Linea di vista/percorribilità tra due punti mondo (campionamento a metà cella). */
  lineClear(a: Pt, b: Pt): boolean {
    const dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz), n = Math.max(1, Math.ceil(len / (this.cell * 0.5)));
    for (let i = 0; i <= n; i++) if (this.isBlocked(a.x + (dx * i) / n, a.z + (dz * i) / n)) return false;
    return true;
  }

  /** A* da `from` a `to` (mondo). Ritorna waypoint mondo (senza il punto di partenza) o [] se irraggiungibile. */
  findPath(from: Pt, to: Pt): Pt[] {
    const s0 = this.toCell(from.x, from.z), g0 = this.toCell(to.x, to.z);
    const s = this.nearestFree(s0[0], s0[1]), g = this.nearestFree(g0[0], g0[1]);
    if (!s || !g) return [];
    const W = this.w, key = (x: number, z: number) => z * W + x;
    const open: { k: number; f: number }[] = [{ k: key(s[0], s[1]), f: 0 }];
    const gScore = new Map<number, number>([[key(s[0], s[1]), 0]]);
    const came = new Map<number, number>();
    const closed = new Set<number>();
    const oct = (x: number, z: number) => { const dx = Math.abs(x - g[0]), dz = Math.abs(z - g[1]); return (dx + dz) + (Math.SQRT2 - 2) * Math.min(dx, dz); };
    let found = false;
    while (open.length) {
      let bi = 0; for (let i = 1; i < open.length; i++) if ((open[i] as { f: number }).f < (open[bi] as { f: number }).f) bi = i;
      const cur = open.splice(bi, 1)[0] as { k: number; f: number };
      if (closed.has(cur.k)) continue; closed.add(cur.k);
      const cx = cur.k % W, cz = Math.floor(cur.k / W);
      if (cx === g[0] && cz === g[1]) { found = true; break; }
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const nx = cx + dx, nz = cz + dz;
        if (this.isBlockedCell(nx, nz)) continue;
        if (dx && dz && (this.isBlockedCell(cx + dx, cz) || this.isBlockedCell(cx, cz + dz))) continue; // niente tagli d'angolo
        const nk = key(nx, nz); if (closed.has(nk)) continue;
        const ng = (gScore.get(cur.k) ?? 0) + (dx && dz ? Math.SQRT2 : 1);
        if (ng < (gScore.get(nk) ?? Infinity)) { gScore.set(nk, ng); came.set(nk, cur.k); open.push({ k: nk, f: ng + oct(nx, nz) }); }
      }
    }
    if (!found) return [];
    const cells: Pt[] = []; let k = key(g[0], g[1]);
    while (k !== key(s[0], s[1])) { cells.push(this.toWorld(k % W, Math.floor(k / W))); const p = came.get(k); if (p === undefined) break; k = p; }
    cells.reverse();
    // string pulling: salta i waypoint intermedi se c'è linea libera
    const out: Pt[] = []; let anchor: Pt = from; let i = 0;
    while (i < cells.length) {
      let j = cells.length - 1;
      while (j > i && !this.lineClear(anchor, cells[j] as Pt)) j--;
      out.push(cells[j] as Pt); anchor = cells[j] as Pt; i = j + 1;
    }
    return out;
  }

  /** Campo di distanze (Dijkstra a 8 direzioni) dal bersaglio: serve a far seguire a un'orda intera un solo calcolo. Infinity = irraggiungibile. */
  flowField(target: Pt): Float32Array {
    const dist = new Float32Array(this.w * this.h).fill(Infinity);
    const t0 = this.toCell(target.x, target.z), t = this.nearestFree(t0[0], t0[1]);
    if (!t) return dist;
    const W = this.w;
    // coda a bucket (costi 1 e √2): più semplice e veloce di uno heap per griglie piccole
    let heap: number[] = [t[1] * W + t[0]]; dist[t[1] * W + t[0]] = 0;
    const pushed: number[] = [];                                     // heap binario (indici) con priorità = dist corrente
    const less = (a: number, b: number) => (dist[a] as number) < (dist[b] as number);
    const up = (i: number) => { while (i > 0) { const p = (i - 1) >> 1; if (less(heap[i] as number, heap[p] as number)) { const x = heap[i] as number; heap[i] = heap[p] as number; heap[p] = x; i = p; } else break; } };
    const down = (i: number) => { for (;;) { let m = i; const l = 2 * i + 1, r = l + 1; if (l < heap.length && less(heap[l] as number, heap[m] as number)) m = l; if (r < heap.length && less(heap[r] as number, heap[m] as number)) m = r; if (m === i) break; const x = heap[i] as number; heap[i] = heap[m] as number; heap[m] = x; i = m; } };
    void pushed;
    while (heap.length) {
      const cur = heap[0] as number; const last = heap.pop() as number; if (heap.length) { heap[0] = last; down(0); }
      const cx = cur % W, cz = Math.floor(cur / W), cd = dist[cur] as number;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dz) continue;
        const nx = cx + dx, nz = cz + dz;
        if (this.isBlockedCell(nx, nz)) continue;
        if (dx && dz && (this.isBlockedCell(cx + dx, cz) || this.isBlockedCell(cx, cz + dz))) continue;
        const nk = nz * W + nx, nd = cd + (dx && dz ? Math.SQRT2 : 1);
        if (nd < (dist[nk] as number)) { dist[nk] = nd; heap.push(nk); up(heap.length - 1); }
      }
    }
    heap = [];
    return dist;
  }

  /** Direzione (versore mondo) verso la cella vicina con distanza minore nel campo. Da celle bloccate/irraggiungibili: undefined. */
  flowDir(field: Float32Array, x: number, z: number): Pt | undefined {
    let [cx, cz] = this.toCell(x, z);
    if (this.isBlockedCell(cx, cz)) { const n = this.nearestFree(cx, cz, 4); if (!n) return undefined; [cx, cz] = n; }
    const W = this.w; let best = field[cz * W + cx] as number, bx = cx, bz = cz;
    for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dz) continue;
      const nx = cx + dx, nz = cz + dz;
      if (this.isBlockedCell(nx, nz)) continue;
      if (dx && dz && (this.isBlockedCell(cx + dx, cz) || this.isBlockedCell(cx, cz + dz))) continue;
      const d = field[nz * W + nx] as number; if (d < best) { best = d; bx = nx; bz = nz; }
    }
    if (bx === cx && bz === cz) return undefined;
    const w = this.toWorld(bx, bz), vx = w.x - x, vz = w.z - z, l = Math.hypot(vx, vz) || 1;
    return { x: vx / l, z: vz / l };
  }
}
