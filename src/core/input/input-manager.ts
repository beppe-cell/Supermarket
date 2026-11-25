import { createInputState, type InputSource, type InputState } from "./input-state";
import { KeyboardMouseInput } from "./keyboard-mouse";
import { TouchInput } from "./touch-controls";

export class InputManager {
  readonly state: InputState = createInputState();
  private sources: InputSource[] = [];

  constructor(canvas: HTMLCanvasElement, touch: boolean) {
    this.sources.push(new KeyboardMouseInput(canvas));
    if (touch) this.sources.push(new TouchInput(document.body));
  }

  /** Chiamare una volta per frame di render, prima dei sistemi. */
  poll(): InputState {
    const s = this.state;
    s.moveX = 0; s.moveY = 0; s.lookDX = 0; s.lookDY = 0;
    s.sprint = false; s.crouch = false; s.fire = false; s.interact = false;
    for (const src of this.sources) src.poll(s);
    return s;
  }

  dispose(): void { this.sources.forEach((s) => s.dispose()); }
}
