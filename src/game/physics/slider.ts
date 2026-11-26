/** Fisica 2D semplificata per oggetti che scivolano/rotolano sul pavimento (carrelli): attrito, rotazione, urti con scatole. Pura. */
export interface Slider { x: number; z: number; yaw: number; vx: number; vz: number; w: number; radius: number; mass: number }
export interface Box { x: number; z: number; w: number; d: number }

export function createSlider(x: number, z: number, yaw: number, radius: number, mass = 1): Slider {
  return { x, z, yaw, vx: 0, vz: 0, w: 0, radius, mass };
}

/** Colpo: spinta nella direzione (orizzontale) del proiettile e rotazione in base al punto d'impatto rispetto al centro. */
export function applyHit(s: Slider, dirX: number, dirZ: number, px: number, pz: number, strength = 2.2): void {
  const l = Math.hypot(dirX, dirZ); if (l < 1e-6) return;
  const nx = dirX / l, nz = dirZ / l, k = strength / s.mass;
  s.vx += nx * k; s.vz += nz * k;
  const rx = px - s.x, rz = pz - s.z;
  s.w += (rx * nz - rz * nx) * 5 * k;
}

export function isMoving(s: Slider): boolean { return Math.hypot(s.vx, s.vz) > 0.02 || Math.abs(s.w) > 0.02; }

/** Un passo di simulazione. Ritorna la velocità d'urto più alta contro un ostacolo (0 se nessun urto), per i suoni. */
export function stepSlider(s: Slider, dt: number, boxes: readonly Box[], friction = 1.5, restitution = 0.35): number {
  if (!isMoving(s)) { s.vx = s.vz = s.w = 0; return 0; }
  s.x += s.vx * dt; s.z += s.vz * dt; s.yaw += s.w * dt;
  const f = Math.exp(-friction * dt); s.vx *= f; s.vz *= f; s.w *= Math.exp(-2.4 * dt);
  let impact = 0;
  for (const b of boxes) {
    const hx = b.w / 2, hz = b.d / 2;
    const cx = Math.max(b.x - hx, Math.min(s.x, b.x + hx)), cz = Math.max(b.z - hz, Math.min(s.z, b.z + hz));
    let dx = s.x - cx, dz = s.z - cz, dist = Math.hypot(dx, dz);
    if (dist >= s.radius) continue;
    if (dist < 1e-6) { // centro dentro la scatola: espelli sul lato più vicino
      const ox = hx - Math.abs(s.x - b.x), oz = hz - Math.abs(s.z - b.z);
      if (ox < oz) { dx = Math.sign(s.x - b.x) || 1; dz = 0; dist = -ox; } else { dx = 0; dz = Math.sign(s.z - b.z) || 1; dist = -oz; }
    } else { dx /= dist; dz /= dist; }
    const push = s.radius - dist;
    s.x += dx * push; s.z += dz * push;
    const vn = s.vx * dx + s.vz * dz;
    if (vn < 0) { s.vx -= (1 + restitution) * vn * dx; s.vz -= (1 + restitution) * vn * dz; s.w *= 0.6; impact = Math.max(impact, -vn); }
  }
  return impact;
}
