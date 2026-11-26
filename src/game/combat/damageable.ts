import type { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { Sfx } from "../../core/audio/sfx";

export type HitPart = "head" | "torso" | "legs";

/** Qualsiasi bersaglio colpibile dai proiettili: i mesh pickabili portano `metadata = { enemy: Damageable, part: HitPart }`. */
export interface Damageable {
  /** Applica un colpo; ritorna true se il bersaglio è morto. */
  hit(part: HitPart, ctx: { sfx: Sfx; player: Vector3 }): boolean;
}
