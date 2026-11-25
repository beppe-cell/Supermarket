import { describe, expect, it } from "vitest";
import { adaptScaling, detectQuality } from "./quality";

const base = { isTouch: false, deviceMemoryGb: 8, cores: 8, maxTextureSize: 16384, isIos: false };

describe("detectQuality", () => {
  it("PC potente -> high", () => expect(detectQuality(base)).toBe("high"));
  it("PC modesto -> medium", () => expect(detectQuality({ ...base, cores: 4 })).toBe("medium"));
  it("iOS -> low", () => expect(detectQuality({ ...base, isTouch: true, isIos: true, cores: 6 })).toBe("low"));
  it("mobile top -> medium", () => expect(detectQuality({ ...base, isTouch: true })).toBe("medium"));
});

describe("adaptScaling", () => {
  it("riduce risoluzione se fps bassi", () => expect(adaptScaling(1, 40, 60)).toBe(1.25));
  it("recupera risoluzione se fps alti", () => expect(adaptScaling(1.5, 70, 60)).toBe(1.25));
  it("non scende sotto il minimo", () => expect(adaptScaling(1, 120, 60)).toBe(1));
  it("non supera il massimo", () => expect(adaptScaling(3, 10, 60)).toBe(3));
});
