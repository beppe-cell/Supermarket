import { createInputState, type InputSource, type InputState } from "./input-state";
import { KeyboardMouseInput } from "./keyboard-mouse";
import { TouchInput } from "./touch-controls";
import type { Settings } from "../settings";

export class InputManager {
  readonly state: InputState = createInputState();
  readonly touch: TouchInput | undefined;
  private sources: InputSource[] = [];

  constructor(canvas: HTMLCanvasElement, touch: boolean, private readonly settings: Settings, onInventory: () => void) {
    this.sources.push(new KeyboardMouseInput(canvas));
    if (touch) { this.touch = new TouchInput(document.body, { onInventory }); this.sources.push(this.touch); }
  }

  /** Chiamare una volta per frame di render, prima dei sistemi. Applica sensibilità e inversione asse Y. */
  poll(): InputState {
    const s = this.state;
    s.moveX = 0; s.moveY = 0; s.lookDX = 0; s.lookDY = 0;
    s.sprint = false; s.crouch = false; s.fire = false; s.interact = false; s.torch = false; s.reload = false;
    for (const src of this.sources) src.poll(s);
    s.lookDX *= this.settings.lookSens; s.lookDY *= this.settings.lookSens * (this.settings.invertY ? -1 : 1);
    return s;
  }

  dispose(): void { this.sources.forEach((s) => s.dispose()); }
}
