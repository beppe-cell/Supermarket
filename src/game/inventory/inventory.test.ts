import { describe, expect, it } from "vitest";
import { Inventory } from "./inventory";
import { Objectives } from "./objectives";
import { clampSettings } from "../../core/settings";

describe("Inventory", () => {
  it("aggiunge e impila fino al limite della pila", () => {
    const inv = new Inventory(4);
    expect(inv.add("gauze", 5)).toBe(5);        // pila max 3 → 2 slot
    expect(inv.used).toBe(2); expect(inv.count("gauze")).toBe(5);
  });
  it("zaino pieno: aggiunge solo ciò che entra", () => {
    const inv = new Inventory(2);
    expect(inv.add("key_warehouse", 1)).toBe(1);
    expect(inv.add("gauze", 9)).toBe(3);
    expect(inv.add("alcohol", 1)).toBe(0);
  });
  it("remove: toglie dalle pile piccole e libera gli slot", () => {
    const inv = new Inventory(4); inv.add("gauze", 5);
    expect(inv.remove("gauze", 3)).toBe(true); expect(inv.count("gauze")).toBe(2);
    expect(inv.remove("gauze", 9)).toBe(false); expect(inv.count("gauze")).toBe(2);
    inv.remove("gauze", 2); expect(inv.used).toBe(0);
  });
  it("oggetto sconosciuto ignorato", () => { expect(new Inventory().add("nope", 1)).toBe(0); });
  it("removeAt", () => {
    const inv = new Inventory(3); inv.add("canned_food", 2);
    expect(inv.removeAt(0)).toBe(true); expect(inv.count("canned_food")).toBe(1);
    expect(inv.removeAt(2)).toBe(false);
  });
});

describe("Objectives", () => {
  it("avanza gli obiettivi in ordine", () => {
    const o = new Objectives();
    expect(o.current?.id).toBe("scavenge"); o.complete("scavenge");
    expect(o.current?.id).toBe("find_key");
    expect(o.complete("find_key")?.done).toBe(true);
    expect(o.complete("find_key")).toBeUndefined();
    expect(o.current?.id).toBe("open_warehouse");
    o.complete("open_warehouse"); expect(o.current?.id).toBe("reach_warehouse"); o.complete("reach_warehouse"); expect(o.current).toBeUndefined();
  });
});

describe("settings", () => {
  it("clamp e default", () => {
    expect(clampSettings({ lookSens: 99, volume: -3 })).toEqual({ lookSens: 3, volume: 0, invertY: false });
    expect(clampSettings({ lookSens: NaN as unknown as number }).lookSens).toBe(1);
  });
});
