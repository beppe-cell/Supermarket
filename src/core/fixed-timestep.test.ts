import { describe, expect, it } from "vitest";
import { FixedTimestep } from "./fixed-timestep";

describe("FixedTimestep", () => {
  it("esegue un passo per 1/60 s", () => {
    const f = new FixedTimestep(1 / 60);
    expect(f.advance(1 / 60 + 1e-9)).toBe(1);
  });
  it("accumula frame corti", () => {
    const f = new FixedTimestep(1 / 60);
    expect(f.advance(0.01)).toBe(0);
    expect(f.advance(0.01)).toBe(1);
  });
  it("limita i passi dopo un hitch", () => {
    const f = new FixedTimestep(1 / 60, 5);
    expect(f.advance(2)).toBeLessThanOrEqual(5);
  });
});
