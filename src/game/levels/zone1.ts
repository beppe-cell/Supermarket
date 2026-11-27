/** Dati livello Z1 "Sala vendita" (greybox). Unità: metri. Il builder legge solo questi dati. */
export interface Box { x: number; z: number; w: number; d: number; h?: number; y?: number }
export interface DoorDef { id: string; x: number; z: number; w: number; axis: "x" | "z"; locked?: boolean; label: string }
export interface PickupDef { id: string; x: number; y: number; z: number; label: string }
export interface LightDef { x: number; z: number }

/** Corsie a x = multipli di 4.4 m; blocchi di scaffali larghi 1.1 m a metà fra due corsie (corsie libere di 3.3 m). */
const BLOCK_X = [-24.2, -19.8, -15.4, -11, -6.6, -2.2, 2.2, 6.6, 11, 15.4, 19.8, 24.2];
const AISLE_X = [-26.4, -22, -17.6, -13.2, -8.8, -4.4, 0, 4.4, 8.8, 13.2, 17.6, 22, 26.4];
const lanes = (sign: 1 | -1): Box[] => Array.from({ length: 9 }, (_, k): Box => ({ x: sign * (7.5 + k * 2.5), z: -12, w: 0.9, d: 2.2, h: 1.0 }));

export const ZONE1 = {
  id: "z1",
  /** Ipermercato 64×48 m: ingresso e area promo a sud, due file di casse con cassa centrale, 3 fasce di corsie, banco frigo a nord, magazzino a est. */
  bounds: { minX: -32, maxX: 32, minZ: -24, maxZ: 24 },
  ceiling: 3.6,
  spawn: { x: -5.75, z: -21.5, yaw: 0 }, // area promo, di fronte al corridoio tra le casse e la cassa centrale
  aisleX: AISLE_X,
  walls: [
    { x: -17.5, z: -24, w: 29, d: 0.4 }, { x: 17.5, z: -24, w: 29, d: 0.4 },       // sud (ingresso al centro, largo 6 m)
    { x: -3, z: -22, w: 0.3, d: 4 }, { x: 3, z: -22, w: 0.3, d: 4 },               // bussola d'ingresso
    { x: 0, z: 24, w: 64, d: 0.4 },                                                  // nord (reparto frigo)
    { x: -32, z: 0, w: 0.4, d: 48 },                                                 // ovest (fresco)
    { x: 32, z: -13, w: 0.4, d: 22 }, { x: 32, z: 13, w: 0.4, d: 22 },             // est (con porta magazzino)
    { x: 28, z: -16, w: 0.3, d: 12 }, { x: 28, z: 16, w: 0.3, d: 12 },             // corridoio verso il magazzino
  ] as Box[],
  doors: [
    { id: "door-warehouse", x: 32, z: 0, w: 4, axis: "z", locked: true, label: "Porta magazzino" },
    { id: "door-entrance", x: 0, z: -24, w: 6, axis: "x", locked: true, label: "Ingresso (chiuso)" },
  ] as DoorDef[],
  /** Scaffali: sud (z -6.5..-0.5), nord (3.5..13.5) e fascia retro (16.9..20.9), tutti schiena contro schiena. */
  shelves: [
    ...BLOCK_X.map((x): Box => ({ x, z: -3.5, w: 1.1, d: 6, h: 2.0 })),
    ...BLOCK_X.map((x): Box => ({ x, z: 8.5, w: 1.1, d: 10, h: 2.0 })),
    ...[-22, -17.6, -13.2, -8.8, -4.4, 0, 4.4, 8.8, 13.2, 17.6, 22].map((x): Box => ({ x, z: 18.9, w: 1.1, d: 4, h: 2.0 })),
  ],
  pillars: [
    ...[-26.4, -13.2, 0, 13.2, 26.4].flatMap((x) => [1.5, 15.2].map((z): Box => ({ x, z, w: 0.8, d: 0.8, h: 3.6 }))),
    ...[-26.4, -17.6, -8.8, 8.8, 17.6, 26.4].map((x): Box => ({ x, z: -19.5, w: 0.8, d: 0.8, h: 3.6 })),
  ],
  /** Casse: 9 corsie per lato (asse z), separate dalla cassa centrale da un passaggio di 2.5 m. */
  checkouts: [...lanes(-1), ...lanes(1)],
  /** Cassa centrale (servizio clienti): banco con cabina a vetri (vedi decor.ts). */
  cashOffice: { x: 0, z: -12.5, w: 8, d: 3.6, h: 1.15 } as Box,
  /** Banco frigo a muro (nord). */
  freezers: Array.from({ length: 13 }, (_, i): Box => ({ x: -26.4 + i * 4.4, z: 23.5, w: 4.4, d: 1, h: 2.1 })),
  /** Isole promozionali all'ingresso: pile di cartoni (riempite in decor.ts). */
  promo: [
    { x: -21, z: -18.6, w: 3.0, d: 1.9, h: 1.2 }, { x: -15, z: -18.6, w: 3.0, d: 1.9, h: 1.6 }, { x: -9.5, z: -20.4, w: 2.5, d: 1.9, h: 1.2 },
    { x: 9.5, z: -20.4, w: 2.5, d: 1.9, h: 1.2 }, { x: 15, z: -18.6, w: 3.0, d: 1.9, h: 1.6 }, { x: 21, z: -18.6, w: 3.0, d: 1.9, h: 1.2 },
    { x: -26, z: -22, w: 2.0, d: 1.4, h: 1.6 }, { x: -22, z: -22.6, w: 2.0, d: 1.2, h: 1.2 }, { x: 22, z: -22.6, w: 2.0, d: 1.2, h: 1.2 }, { x: 26, z: -22, w: 2.0, d: 1.4, h: 1.6 },
    { x: 0, z: -17.2, w: 3.6, d: 1.6, h: 1.0 },
  ] as Box[],
  /** Banchi ortofrutta (fascia ovest): casse di legno e plastica. */
  produce: Array.from({ length: 7 }, (_, i): Box => ({ x: -30, z: -2 + i * 3.4, w: 1.6, d: 2.2, h: 0.9 })),
  pickups: [
    { id: "key-warehouse", x: 1.86, y: 1.0, z: 7.9, label: "Chiave elettronica" },
    { id: "med-1", x: -13.2, y: 1.2, z: -3, label: "Garze" },
    { id: "can-1", x: -8.8, y: 1.2, z: 10, label: "Lattina di cibo" },
    { id: "alc-1", x: 17.6, y: 1.2, z: 6, label: "Alcol" },
    { id: "ammo-1", x: -26.4, y: 0.9, z: 3, label: "Munizioni 9 mm" },
    { id: "ammo-2", x: 11, y: 0.9, z: 15.2, label: "Munizioni 9 mm" },
    { id: "ammo-3", x: 24, y: 0.9, z: -17, label: "Munizioni 9 mm" },
    { id: "ammo-4", x: -4.4, y: 0.9, z: -3, label: "Munizioni 9 mm" },
    { id: "ammo-5", x: 4.4, y: 0.9, z: 12, label: "Munizioni 9 mm" },
    { id: "ammo-6", x: 8.8, y: 0.9, z: -3, label: "Munizioni 9 mm" },
    { id: "ammo-7", x: -17.6, y: 0.9, z: 8, label: "Munizioni 9 mm" },
    { id: "ammo-8", x: 22, y: 0.9, z: 10, label: "Munizioni 9 mm" },
    { id: "ammo-9", x: -22, y: 0.9, z: -3, label: "Munizioni 9 mm" },
    { id: "ammo-10", x: 17.6, y: 0.9, z: -3, label: "Munizioni 9 mm" },
    { id: "ammo-11", x: -8.8, y: 0.9, z: 15.2, label: "Munizioni 9 mm" },
    { id: "ammo-12", x: 15.4, y: 0.9, z: 15.2, label: "Munizioni 9 mm" },
    { id: "ammo-13", x: -26.4, y: 0.9, z: 17, label: "Munizioni 9 mm" },
    { id: "ammo-14", x: 26.4, y: 0.9, z: 5, label: "Munizioni 9 mm" },
    { id: "ammo-15", x: -20, y: 0.9, z: -21, label: "Munizioni 9 mm" },
    { id: "ammo-16", x: 20, y: 0.9, z: -21, label: "Munizioni 9 mm" },
    { id: "ammo-17", x: -5.75, y: 0.9, z: -12, label: "Munizioni 9 mm" },
    { id: "ammo-18", x: 5.75, y: 0.9, z: -12, label: "Munizioni 9 mm" },
    { id: "ammo-19", x: 0, y: 0.9, z: -8, label: "Munizioni 9 mm" },
    { id: "ammo-20", x: -13.2, y: 0.9, z: 12, label: "Munizioni 9 mm" },
    { id: "ammo-21", x: 2.2, y: 0.9, z: 1.5, label: "Munizioni 9 mm" },
  ] as PickupDef[],
  /** Carrelli: `kind` = SM_Trolley (carrello spesa) o SM_RollCage (gabbia a ruote). */
  trolleys: [
    { kind: "SM_Trolley", x: -12.5, z: -22.2, yaw: 0.4 }, { kind: "SM_Trolley", x: -12.1, z: -23.1, yaw: 0.5 }, { kind: "SM_Trolley", x: 12.6, z: -22.6, yaw: -0.3 },
    { kind: "SM_Trolley", x: -2.5, z: -17.0, yaw: 2.2 }, { kind: "SM_Trolley", x: 4.4, z: -1.8, yaw: 1.1 }, { kind: "SM_Trolley", x: -17.6, z: 1.6, yaw: 0.2 },
    { kind: "SM_Trolley", x: 8.8, z: -8.6, yaw: 2.6 }, { kind: "SM_Trolley", x: -4.4, z: -8.2, yaw: 1.8 },
    { kind: "SM_RollCage", x: 13.2, z: 6.0, yaw: 0.3 }, { kind: "SM_RollCage", x: 13.6, z: 8.8, yaw: -0.5 }, { kind: "SM_RollCage", x: 29.8, z: -12, yaw: 1.2 }, { kind: "SM_RollCage", x: 29.6, z: 12, yaw: 0.4 },
    { kind: "SM_RollCage", x: -26.4, z: 12, yaw: 0.2 },
  ] as { kind: "SM_Trolley" | "SM_RollCage"; x: number; z: number; yaw: number }[],
  /** Estintori a muro (asse a 11 cm dal muro, fronte `yaw`: 0 = +Z, π/2 = +X, π = -Z, -π/2 = -X). */
  extinguishers: [
    { x: -20, z: -23.69, yaw: 0 }, { x: 20, z: -23.69, yaw: 0 }, { x: -20, z: 23.69, yaw: Math.PI }, { x: 20, z: 23.69, yaw: Math.PI },
    { x: -31.69, z: -18, yaw: Math.PI / 2 }, { x: -31.69, z: -4, yaw: Math.PI / 2 }, { x: -31.69, z: 10, yaw: Math.PI / 2 }, { x: -31.69, z: 20, yaw: Math.PI / 2 },
    { x: 31.69, z: -18, yaw: -Math.PI / 2 }, { x: 31.69, z: -10, yaw: -Math.PI / 2 }, { x: 31.69, z: 10, yaw: -Math.PI / 2 }, { x: 31.69, z: 20, yaw: -Math.PI / 2 },
  ] as { x: number; z: number; yaw: number }[],
  /** Neon: ogni punto genera una striscia emissiva; alcuni anche luce dinamica. */
  neons: [-28, -20, -12, -4, 4, 12, 20, 28].flatMap((x) => [-20, -13, -4, 3, 9, 15, 21].map((z): LightDef => ({ x, z }))),
  /** Luci di emergenza rosse lampeggianti: tolte su richiesta dell'AD. */
  emergencyLights: [] as LightDef[],
};

export type Zone1Data = typeof ZONE1;

/** Ostacoli statici (box) per la fisica degli oggetti mobili. */
export function zone1Obstacles(): { x: number; z: number; w: number; d: number }[] {
  return [...ZONE1.walls, ...ZONE1.shelves, ...ZONE1.pillars, ...ZONE1.checkouts, ...ZONE1.freezers, ZONE1.cashOffice, ...ZONE1.promo, ...ZONE1.produce].map((b) => ({ x: b.x, z: b.z, w: b.w, d: b.d }));
}
