import type { NavGrid, Pt } from "./nav-grid";

/** Angolo (rad) da `yaw` al bersaglio, normalizzato in [-π, π]. Yaw 0 = +Z, positivo verso +X. */
export function angleTo(from: Pt, yaw: number, to: Pt): number {
  let d = Math.atan2(to.x - from.x, to.z - from.z) - yaw;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return d;
}

export interface SightParams { fov: number; range: number }

/** Vista: dentro il cono, entro la portata e con linea libera sulla griglia (scaffali/muri bloccano). */
export function canSee(from: Pt, yaw: number, to: Pt, p: SightParams, grid: NavGrid): boolean {
  const dist = Math.hypot(to.x - from.x, to.z - from.z);
  if (dist > p.range) return false;
  if (dist > 1.2 && Math.abs(angleTo(from, yaw, to)) > p.fov / 2) return false;
  return grid.lineClear(from, to);
}

/** Portata di rilevamento in base al comportamento del giocatore (torcia, corsa, accovacciata). */
export function detectionRange(base: number, o: { torch: boolean; sprinting: boolean; crouching: boolean }): number {
  let r = base;
  if (o.torch) r *= 1.35;
  if (o.sprinting) r *= 1.3;
  if (o.crouching) r *= 0.6;
  return r;
}
