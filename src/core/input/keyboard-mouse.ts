import type { InputSource, InputState } from "./input-state";

export class KeyboardMouseInput implements InputSource {
  private keys = new Set<string>();
  private dx = 0;
  private dy = 0;
  private firing = false;
  private readonly abort = new AbortController();

  constructor(canvas: HTMLCanvasElement) {
    const o = { signal: this.abort.signal };
    addEventListener("keydown", (e) => this.keys.add(e.code), o);
    addEventListener("keyup", (e) => this.keys.delete(e.code), o);
    addEventListener("blur", () => this.keys.clear(), o);
    canvas.addEventListener("click", () => { void canvas.requestPointerLock?.(); }, o);
    addEventListener("mousemove", (e) => {
      if (document.pointerLockElement === canvas) { this.dx += e.movementX; this.dy += e.movementY; }
    }, o);
    addEventListener("mousedown", (e) => { if (e.button === 0 && document.pointerLockElement === canvas) this.firing = true; }, o);
    addEventListener("mouseup", (e) => { if (e.button === 0) this.firing = false; }, o);
  }

  poll(out: InputState): void {
    const k = this.keys;
    const x = (k.has("KeyD") ? 1 : 0) - (k.has("KeyA") ? 1 : 0);
    const y = (k.has("KeyW") ? 1 : 0) - (k.has("KeyS") ? 1 : 0);
    if (x !== 0 || y !== 0) { out.moveX = x; out.moveY = y; }
    out.lookDX += this.dx; out.lookDY += this.dy;
    this.dx = 0; this.dy = 0;
    out.sprint ||= k.has("ShiftLeft");
    out.crouch ||= k.has("ControlLeft") || k.has("KeyC");
    out.fire ||= this.firing;
    out.interact ||= k.has("KeyE");
    out.torch ||= k.has("KeyF");
  }

  dispose(): void { this.abort.abort(); }
}
