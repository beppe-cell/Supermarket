import { describe, expect, it } from "vitest";
import { ZONE1 } from "./zone1";

const inside = (x: number, z: number) =>
  x > ZONE1.bounds.minX && x < ZONE1.bounds.maxX && z > ZONE1.bounds.minZ && z < ZONE1.bounds.maxZ;

describe("Zone1 data", () => {
  it("spawn dentro i limiti", () => expect(inside(ZONE1.spawn.x, ZONE1.spawn.z)).toBe(true));
  it("pickup, neon e scaffali dentro i limiti", () => {
    for (const p of ZONE1.pickups) expect(inside(p.x, p.z), p.id).toBe(true);
    for (const n of ZONE1.neons) expect(inside(n.x, n.z)).toBe(true);
    for (const s of ZONE1.shelves) expect(inside(s.x, s.z)).toBe(true);
    for (const t of ZONE1.trolleys) expect(inside(t.x, t.z)).toBe(true);
  });
  it("corsie libere >= 3 m (passaggio)", () => {
    const xs = ZONE1.shelves.map((s) => s.x).sort((a, b) => a - b);
    for (let i = 1; i < xs.length; i++) expect((xs[i] ?? 0) - (xs[i - 1] ?? 0) - 1.1).toBeGreaterThanOrEqual(3);
  });
  it("id pickup e porte univoci", () => {
    const ids = [...ZONE1.pickups.map((p) => p.id), ...ZONE1.doors.map((d) => d.id)];
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("la chiave del magazzino esiste", () => expect(ZONE1.pickups.some((p) => p.id === "key-warehouse")).toBe(true));
});
