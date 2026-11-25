import type { InputSource, InputState } from "./input-state";

/** Joystick virtuale a sinistra (movimento), trascinamento a destra (mira), pulsanti fuoco/interazione. */
export class TouchInput implements InputSource {
  private moveId = -1;
  private lookId = -1;
  private origin = { x: 0, y: 0 };
  private last = { x: 0, y: 0 };
  private mx = 0;
  private my = 0;
  private dx = 0;
  private dy = 0;
  private fire = false;
  private interact = false;
  private torchBtn = false;
  private readonly root: HTMLDivElement;
  private readonly stick: HTMLDivElement;
  private readonly abort = new AbortController();
  private static readonly RADIUS = 60;

  constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.style.cssText = "position:fixed;inset:0;pointer-events:none;touch-action:none;user-select:none";
    this.stick = document.createElement("div");
    this.stick.style.cssText = "position:absolute;width:70px;height:70px;margin:-35px 0 0 -35px;border-radius:50%;background:#ffffff33;display:none";
    this.root.append(this.stick, this.button("FUOCO", "right:24px;bottom:120px", (v) => (this.fire = v)), this.button("USA", "right:120px;bottom:40px", (v) => (this.interact = v)), this.button("LUCE", "right:24px;bottom:230px", (v) => (this.torchBtn = v)));
    parent.appendChild(this.root);

    const o = { signal: this.abort.signal, passive: false } as const;
    const layer = document.body;
    layer.addEventListener("touchstart", (e) => this.onStart(e), o);
    layer.addEventListener("touchmove", (e) => this.onMove(e), o);
    layer.addEventListener("touchend", (e) => this.onEnd(e), o);
    layer.addEventListener("touchcancel", (e) => this.onEnd(e), o);
  }

  private button(label: string, pos: string, set: (v: boolean) => void): HTMLDivElement {
    const b = document.createElement("div");
    b.textContent = label;
    b.style.cssText = `position:absolute;${pos};width:80px;height:80px;border-radius:50%;background:#aa222299;color:#fff;font:bold 13px sans-serif;display:flex;align-items:center;justify-content:center;pointer-events:auto`;
    b.addEventListener("touchstart", (e) => { e.stopPropagation(); e.preventDefault(); set(true); }, { signal: this.abort.signal, passive: false });
    const up = (e: Event) => { e.stopPropagation(); set(false); };
    b.addEventListener("touchend", up, { signal: this.abort.signal });
    b.addEventListener("touchcancel", up, { signal: this.abort.signal });
    return b;
  }

  private onStart(e: TouchEvent): void {
    for (const t of Array.from(e.changedTouches)) {
      if (t.clientX < innerWidth / 2 && this.moveId < 0) {
        this.moveId = t.identifier;
        this.origin = { x: t.clientX, y: t.clientY };
        this.stick.style.display = "block";
        this.stick.style.left = `${t.clientX}px`;
        this.stick.style.top = `${t.clientY}px`;
      } else if (t.clientX >= innerWidth / 2 && this.lookId < 0) {
        this.lookId = t.identifier;
        this.last = { x: t.clientX, y: t.clientY };
      }
    }
    e.preventDefault();
  }

  private onMove(e: TouchEvent): void {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === this.moveId) {
        const r = TouchInput.RADIUS;
        this.mx = Math.max(-1, Math.min(1, (t.clientX - this.origin.x) / r));
        this.my = Math.max(-1, Math.min(1, -(t.clientY - this.origin.y) / r));
      } else if (t.identifier === this.lookId) {
        this.dx += t.clientX - this.last.x;
        this.dy += t.clientY - this.last.y;
        this.last = { x: t.clientX, y: t.clientY };
      }
    }
    e.preventDefault();
  }

  private onEnd(e: TouchEvent): void {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === this.moveId) { this.moveId = -1; this.mx = 0; this.my = 0; this.stick.style.display = "none"; }
      if (t.identifier === this.lookId) this.lookId = -1;
    }
  }

  poll(out: InputState): void {
    if (this.mx !== 0 || this.my !== 0) { out.moveX = this.mx; out.moveY = this.my; }
    out.lookDX += this.dx * 1.5; out.lookDY += this.dy * 1.5;
    this.dx = 0; this.dy = 0;
    out.fire ||= this.fire;
    out.interact ||= this.interact;
    out.torch ||= this.torchBtn;
  }

  dispose(): void { this.abort.abort(); this.root.remove(); }
}
