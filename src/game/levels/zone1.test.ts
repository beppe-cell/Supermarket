import { describe, expect, it } from "vitest";
import { ZONE1 } from "./zone1";
import { buildZone1Nav } from "./zone1-nav";

const inside = (x: number, z: number) =>
  x > ZONE1.bounds.minX && x < ZONE1.bounds.maxX && z > ZONE1.bounds.minZ && z < ZONE1.bounds.maxZ;

describe("Zone1 data", () => {
  it("spawn dentro i limiti", () => expect(inside(ZONE1.spawn.x, ZONE1.spawn.z)).toBe(true));
  it("pickup, neon e scaffali dentro i limiti", () => {
    for (const p of ZONE1.pickups) expect(inside(p.x, p.z), p.id).toBe(true);
    for (const n of ZONE1.neons) expect(inside(n.x, n.z)).toBe(true);
    for (const s of ZONE1.shelves) expect(inside(s.x, s.z)).toBe(true);
    for (const t of ZONE1.trolleys) expect(inside(t.x, t.z)).toBe(true);
    for (const e of ZONE1.extinguishers) expect(inside(e.x, e.z)).toBe(true);
  });
  it("corsie libere >= 3 m (passaggio) in ogni fascia di scaffali", () => {
    const bands = new Map<number, number[]>();
    for (const sh of ZONE1.shelves) bands.set(sh.z, [...(bands.get(sh.z) ?? []), sh.x]);
    for (const [, list] of bands) {
      const xs = list.sort((a, b) => a - b);
      for (let i = 1; i < xs.length; i++) expect((xs[i] ?? 0) - (xs[i - 1] ?? 0) - 1.1).toBeGreaterThanOrEqual(3);
    }
  });
  it("i pickup non sono dentro scaffali, casse, pilastri o muri", () => {
    const boxes = [...ZONE1.shelves, ...ZONE1.checkouts, ...ZONE1.promo, ...ZONE1.produce, ...ZONE1.pillars, ...ZONE1.walls, ZONE1.cashOffice];
    for (const p of ZONE1.pickups) { if (p.shelf) continue; for (const b of boxes) expect(Math.abs(p.x - b.x) < b.w / 2 + 0.2 && Math.abs(p.z - b.z) < b.d / 2 + 0.2, `${p.id} dentro ${b.x},${b.z}`).toBe(false); }
  });
  it("molte munizioni, una pistola, oggetti da crafting e cure", () => {
    const n = (k: string) => ZONE1.pickups.filter((p) => p.id.startsWith(k)).length;
    expect(n("ammo")).toBeGreaterThanOrEqual(15); expect(n("pistol")).toBe(1); expect(n("tape") + n("rags") + n("alcohol")).toBeGreaterThanOrEqual(8); expect(n("gauze")).toBeGreaterThanOrEqual(4);
  });
  it("molte casse (>= 16) e una cassa centrale", () => {
    expect(ZONE1.checkouts.length).toBeGreaterThanOrEqual(16);
    expect(inside(ZONE1.cashOffice.x, ZONE1.cashOffice.z)).toBe(true);
  });
  it("area promo all'ingresso (sud) con isole", () => {
    expect(ZONE1.promo.length).toBeGreaterThanOrEqual(8);
    for (const p of ZONE1.promo) expect(p.z).toBeLessThan(ZONE1.cashOffice.z - 3);
  });
  it("il giocatore nasce in un punto libero (non dentro scaffali, casse, isole)", () => {
    const hit = (b: { x: number; z: number; w: number; d: number }) => Math.abs(ZONE1.spawn.x - b.x) < b.w / 2 + 0.5 && Math.abs(ZONE1.spawn.z - b.z) < b.d / 2 + 0.5;
    for (const b of [...ZONE1.shelves, ...ZONE1.checkouts, ...ZONE1.promo, ...ZONE1.pillars, ...ZONE1.walls, ZONE1.cashOffice]) expect(hit(b)).toBe(false);
  });
  it("id pickup e porte univoci", () => {
    const ids = [...ZONE1.pickups.map((p) => p.id), ...ZONE1.doors.map((d) => d.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("la chiave del magazzino esiste", () => expect(ZONE1.pickups.some((p) => p.id === "key-warehouse")).toBe(true));
  it("tutti i punti chiave sono raggiungibili dallo spawn (A*)", () => {
    const g = buildZone1Nav(), from = { x: ZONE1.spawn.x, z: ZONE1.spawn.z };
    const targets = [...ZONE1.pickups.map((p) => ({ x: p.x, z: p.z })), { x: 30, z: 0 }, { x: -4.4, z: 11 }, { x: 8.8, z: 11 }, { x: 22, z: -4 }, { x: -13.2, z: 15.2 }];
    for (const t of targets) expect(g.findPath(from, t).length, JSON.stringify(t)).toBeGreaterThan(0);
  });
});
