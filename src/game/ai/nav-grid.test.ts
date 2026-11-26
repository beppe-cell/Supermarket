import { describe, expect, it } from "vitest";
import { NavGrid } from "./nav-grid";
import { angleTo, canSee, detectionRange } from "./perception";

function room(): NavGrid {
  const g = new NavGrid(-10, -10, 10, 10, 0.5);
  g.blockBox(0, 0, 1, 10, 0); // muro lungo in z al centro
  return g;
}

describe("NavGrid", () => {
  it("trova un percorso che aggira l'ostacolo", () => {
    const g = room();
    const path = g.findPath({ x: -5, z: 0 }, { x: 5, z: 0 });
    expect(path.length).toBeGreaterThan(0);
    for (const p of path) expect(g.isBlocked(p.x, p.z)).toBe(false);
    const last = path[path.length - 1]!;
    expect(Math.hypot(last.x - 5, last.z)).toBeLessThan(0.6);
    expect(path.some((p) => Math.abs(p.z) > 5)).toBe(true); // passa oltre l'estremità del muro
  });
  it("percorso diretto in campo libero (un solo waypoint)", () => {
    expect(new NavGrid(-10, -10, 10, 10).findPath({ x: -5, z: -5 }, { x: 5, z: 5 }).length).toBe(1);
  });
  it("destinazione dentro un ostacolo → cella libera più vicina", () => {
    const g = room();
    const path = g.findPath({ x: -5, z: 0 }, { x: 0, z: 0 });
    expect(path.length).toBeGreaterThan(0);
    for (const p of path) expect(g.isBlocked(p.x, p.z)).toBe(false);
  });
  it("irraggiungibile → []", () => {
    const g = new NavGrid(-5, -5, 5, 5);
    g.blockBox(0, 0, 20, 0.5); // muro che taglia tutta la stanza
    expect(g.findPath({ x: 0, z: -4 }, { x: 0, z: 4 })).toEqual([]);
  });
  it("lineClear rispetta gli ostacoli", () => {
    const g = room();
    expect(g.lineClear({ x: -5, z: 0 }, { x: 5, z: 0 })).toBe(false);
    expect(g.lineClear({ x: -5, z: 8 }, { x: 5, z: 8 })).toBe(true);
  });
});

describe("perception", () => {
  const g = new NavGrid(-10, -10, 10, 10);
  it("angleTo: yaw 0 guarda +Z", () => {
    expect(angleTo({ x: 0, z: 0 }, 0, { x: 0, z: 5 })).toBeCloseTo(0);
    expect(angleTo({ x: 0, z: 0 }, 0, { x: 5, z: 0 })).toBeCloseTo(Math.PI / 2);
  });
  it("vede nel cono, non dietro", () => {
    const p = { fov: Math.PI / 2, range: 10 };
    expect(canSee({ x: 0, z: 0 }, 0, { x: 0, z: 6 }, p, g)).toBe(true);
    expect(canSee({ x: 0, z: 0 }, 0, { x: 0, z: -6 }, p, g)).toBe(false);
    expect(canSee({ x: 0, z: 0 }, 0, { x: 0, z: 12 }, p, g)).toBe(false);
  });
  it("gli ostacoli bloccano la vista", () => {
    const g2 = new NavGrid(-10, -10, 10, 10); g2.blockBox(0, 3, 4, 1);
    expect(canSee({ x: 0, z: 0 }, 0, { x: 0, z: 6 }, { fov: Math.PI, range: 10 }, g2)).toBe(false);
  });
  it("portata: torcia e corsa aumentano, accovacciata riduce", () => {
    expect(detectionRange(10, { torch: true, sprinting: false, crouching: false })).toBeGreaterThan(10);
    expect(detectionRange(10, { torch: false, sprinting: true, crouching: false })).toBeGreaterThan(10);
    expect(detectionRange(10, { torch: false, sprinting: false, crouching: true })).toBeLessThan(10);
  });
});
