import { describe, expect, it } from "vitest";
import { applyHit, createSlider, isMoving, stepSlider } from "./slider";

const run = (s: ReturnType<typeof createSlider>, t: number, boxes: Parameters<typeof stepSlider>[2] = []) => { let imp = 0; for (let i = 0; i < t * 60; i++) imp = Math.max(imp, stepSlider(s, 1 / 60, boxes)); return imp; };

describe("slider", () => {
  it("un colpo lo spinge nella direzione del proiettile", () => {
    const s = createSlider(0, 0, 0, 0.45); applyHit(s, 1, 0, 0, 0);
    run(s, 1); expect(s.x).toBeGreaterThan(0.5); expect(Math.abs(s.z)).toBeLessThan(0.01);
  });
  it("l'attrito lo ferma", () => {
    const s = createSlider(0, 0, 0, 0.45); applyHit(s, 0, 1, 0, 0); run(s, 8); expect(isMoving(s)).toBe(false);
  });
  it("colpo fuori centro lo fa ruotare", () => {
    const s = createSlider(0, 0, 0, 0.45); applyHit(s, 1, 0, 0, 0.3); run(s, 0.3); expect(Math.abs(s.yaw)).toBeGreaterThan(0.05);
  });
  it("non entra in un muro e rimbalza", () => {
    const s = createSlider(0, 0, 0, 0.45); applyHit(s, 1, 0, 0, 0, 6);
    const imp = run(s, 2, [{ x: 3, z: 0, w: 0.4, d: 10 }]);
    expect(s.x).toBeLessThanOrEqual(3 - 0.2 - 0.45 + 1e-6); expect(imp).toBeGreaterThan(0.5); expect(s.vx).toBeLessThanOrEqual(0.5);
  });
  it("più massa = meno spinta", () => {
    const a = createSlider(0, 0, 0, 0.45, 1), b = createSlider(0, 0, 0, 0.45, 2); applyHit(a, 1, 0, 0, 0); applyHit(b, 1, 0, 0, 0);
    expect(b.vx).toBeLessThan(a.vx);
  });
});
