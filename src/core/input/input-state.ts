/** Stato di input astratto: i sistemi leggono solo questo (mai eventi DOM). */
export interface InputState {
  moveX: number; // -1..1 (destra +)
  moveY: number; // -1..1 (avanti +)
  lookDX: number; // delta in pixel accumulato dall'ultimo frame
  lookDY: number;
  sprint: boolean;
  crouch: boolean;
  fire: boolean;
  interact: boolean;
  torch: boolean;
}

export function createInputState(): InputState {
  return { moveX: 0, moveY: 0, lookDX: 0, lookDY: 0, sprint: false, crouch: false, fire: false, interact: false, torch: false };
}

export interface InputSource {
  /** Scrive nello stato (somma i delta di look, imposta assi/pulsanti). */
  poll(out: InputState): void;
  dispose(): void;
}
