/** Dati livello Z1 "Sala vendita" (greybox). Unità: metri. Il builder legge solo questi dati. */
export interface Box { x: number; z: number; w: number; d: number; h?: number; y?: number }
export interface DoorDef { id: string; x: number; z: number; w: number; axis: "x" | "z"; locked?: boolean; label: string }
export interface PickupDef { id: string; x: number; y: number; z: number; label: string }
export interface LightDef { x: number; z: number }

export const ZONE1 = {
  id: "z1",
  bounds: { minX: -20, maxX: 20, minZ: -15, maxZ: 15 },
  ceiling: 3.6,
  spawn: { x: -4.4, z: -12, yaw: 0 }, // in asse con la corsia x=-4.4, lontano dai pilastri
  /** Muri perimetrali e interni: centro + dimensioni. */
  walls: [
    { x: 0, z: 15, w: 40, d: 0.4 }, // nord (reparto frigo)
    { x: -20, z: 0, w: 0.4, d: 30 }, // ovest
    { x: 0, z: -15, w: 40, d: 0.4 }, // sud (ingresso)
    { x: 20, z: 9, w: 0.4, d: 12 }, // est (con porta magazzino)
    { x: 20, z: -9, w: 0.4, d: 12 },
    { x: 14, z: -6, w: 12, d: 0.3 }, // parete casse
  ] as Box[],
  doors: [
    { id: "door-warehouse", x: 20, z: 0, w: 4, axis: "z", locked: true, label: "Porta magazzino" },
    { id: "door-entrance", x: -15, z: -15, w: 4, axis: "x", locked: true, label: "Ingresso (chiuso)" },
  ] as DoorDef[],
  /** Scaffali: 8 blocchi schiena contro schiena (largh. 1.1 m), passo 4.4 m => corsie libere di 3.3 m. */
  shelves: Array.from({ length: 8 }, (_, i): Box => ({ x: -15.4 + i * 4.4, z: 3, w: 1.1, d: 16, h: 2.0 })),
  pillars: [-10, 0, 10].flatMap((x) => [-10, 10].map((z): Box => ({ x, z, w: 0.8, d: 0.8, h: 3.6 }))),
  checkouts: [8, 11, 14, 17].map((x): Box => ({ x: x + 0.5, z: -11, w: 0.9, d: 2.2, h: 1.0 })),
  freezers: Array.from({ length: 6 }, (_, i): Box => ({ x: -16 + i * 5.2, z: 14, w: 4.4, d: 1, h: 2.1 })),
  pickups: [
    { id: "key-warehouse", x: 1.8, y: 1.0, z: 13.2, label: "Chiave magazzino" },
    { id: "med-1", x: -13.2, y: 1.2, z: -2, label: "Garze" },
    { id: "can-1", x: -8.8, y: 1.2, z: 6, label: "Lattina di cibo" },
    { id: "bat-1", x: 4.4, y: 1.2, z: -4, label: "Batterie" },
    { id: "alc-1", x: 8.8, y: 1.2, z: 3, label: "Alcol" },
    { id: "ammo-1", x: -6.2, y: 0.9, z: -11.6, label: "Munizioni 9 mm" },
    { id: "ammo-2", x: 12.2, y: 0.9, z: 12.2, label: "Munizioni 9 mm" },
  ] as PickupDef[],
  /** Carrelli: `kind` = SM_Trolley (carrello spesa) o SM_RollCage (gabbia a ruote). */
  trolleys: [
    { kind: "SM_Trolley", x: -12.5, z: -13.2, yaw: 0.4 },
    { kind: "SM_Trolley", x: -9.8, z: -12.6, yaw: -0.3 },
    { kind: "SM_Trolley", x: -2.5, z: -9.0, yaw: 2.2 },
    { kind: "SM_Trolley", x: 4.4, z: -0.6, yaw: 1.1 },
    { kind: "SM_RollCage", x: 13.2, z: 6.0, yaw: 0.3 },
    { kind: "SM_RollCage", x: 13.6, z: 8.8, yaw: -0.5 },
  ] as { kind: "SM_Trolley" | "SM_RollCage"; x: number; z: number; yaw: number }[],
  /** Estintori a muro (asse a 11 cm dal muro, fronte `yaw`: 0 = +Z, π/2 = +X, π = -Z, -π/2 = -X). */
  extinguishers: [
    { x: -3, z: -14.69, yaw: 0 }, { x: 3, z: -14.69, yaw: 0 }, { x: -17, z: -14.69, yaw: 0 },
    { x: -19.69, z: -8, yaw: Math.PI / 2 }, { x: -19.69, z: 8, yaw: Math.PI / 2 },
    { x: 19.69, z: 6, yaw: -Math.PI / 2 }, { x: 19.69, z: -9, yaw: -Math.PI / 2 },
    { x: 10.5, z: -5.74, yaw: 0 }, { x: 15, z: 14.69, yaw: Math.PI },
  ] as { x: number; z: number; yaw: number }[],
  /** Neon: ogni punto genera una striscia emissiva; alcuni anche luce dinamica. */
  neons: Array.from({ length: 5 }, (_, r) => Array.from({ length: 4 }, (_, c): LightDef => ({ x: -15 + c * 10, z: -10 + r * 6 }))).flat(),
  emergencyLights: [{ x: 19, z: 0 }, { x: -19, z: -14 }, { x: -19, z: 14 }] as LightDef[],
};

export type Zone1Data = typeof ZONE1;

/** Ostacoli statici (box) per la fisica degli oggetti mobili. */
export function zone1Obstacles(): { x: number; z: number; w: number; d: number }[] {
  return [...ZONE1.walls, ...ZONE1.shelves, ...ZONE1.pillars, ...ZONE1.checkouts, ...ZONE1.freezers].map((b) => ({ x: b.x, z: b.z, w: b.w, d: b.d }));
}
