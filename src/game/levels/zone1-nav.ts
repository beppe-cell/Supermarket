import { NavGrid } from "../ai/nav-grid";
import { ZONE1 } from "./zone1";

/** Griglia di navigazione di Z1 (celle da 0.5 m), ostacoli gonfiati del raggio del nemico (0.45 m). */
export function buildZone1Nav(margin = 0.45): NavGrid {
  const b = ZONE1.bounds, g = new NavGrid(b.minX, b.minZ, b.maxX, b.maxZ, 0.5);
  for (const w of ZONE1.walls) g.blockBox(w.x, w.z, w.w, w.d, margin);
  for (const s of ZONE1.shelves) g.blockBox(s.x, s.z, s.w, s.d, margin);
  for (const p of ZONE1.pillars) g.blockBox(p.x, p.z, p.w, p.d, margin);
  for (const c of ZONE1.checkouts) g.blockBox(c.x, c.z, c.w, c.d, margin);
  for (const f of ZONE1.freezers) g.blockBox(f.x, f.z, f.w, f.d + 0.4, margin);
  for (const t of ZONE1.trolleys) g.blockBox(t.x, t.z, t.kind === "SM_Trolley" ? 0.5 : 0.7, t.kind === "SM_Trolley" ? 0.9 : 0.8, margin * 0.6);
  for (const d of ZONE1.doors) if (d.axis === "z") g.blockBox(d.x, d.z, 0.4, d.w, margin); // porte chiuse
  return g;
}
