import { describe, expect, it } from "vitest";
import { Stamina } from "./stamina";

describe("Stamina", () => {
  it("la corsa consuma", () => {
    const s = new Stamina();
    expect(s.update(true, true, 1)).toBe(true);
    expect(s.value).toBeCloseTo(80);
  });
  it("non consuma da fermo", () => {
    const s = new Stamina();
    s.update(true, false, 1);
    expect(s.value).toBe(100);
  });
  it("si esaurisce e blocca la corsa fino a resumeAt", () => {
    const s = new Stamina();
    for (let i = 0; i < 5; i++) s.update(true, true, 1);
    expect(s.value).toBe(0);
    expect(s.canSprint).toBe(false);
    s.update(false, false, 1); // 14 < 25: ancora bloccata
    expect(s.canSprint).toBe(false);
    s.update(false, false, 1); // 28 >= 25: sbloccata
    expect(s.canSprint).toBe(true);
  });
  it("recupera dopo il ritardo", () => {
    const s = new Stamina();
    s.update(true, true, 2); // 60
    s.update(false, false, 0.5);
    expect(s.value).toBe(60);
    s.update(false, false, 1);
    expect(s.value).toBeGreaterThan(60);
  });
});
