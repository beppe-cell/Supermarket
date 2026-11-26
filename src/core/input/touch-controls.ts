import type { InputSource, InputState } from "./input-state";

const ICONS: Record<string, string> = {
  fire: '<circle cx="12" cy="12" r="6.5"/><path d="M12 2v5M12 17v5M2 12h5M17 12h5"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/>',
  reload: '<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>',
  crouch: '<path d="M6 9l6 6 6-6"/><path d="M6 15l6 6 6-6"/>',
  torch: '<path d="M8 3h8l-1 6H9z"/><path d="M9 9l-1 12h8l-1-12"/><path d="M12 12v4"/>',
  bag: '<path d="M9 6V5a3 3 0 0 1 6 0v1"/><path d="M6 11a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v8a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M9 15h6v4H9zM4 12v5M20 12v5"/>',
};
const svg = (n: string) => `<svg viewBox="0 0 24 24" width="60%" height="60%" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] ?? ""}</svg>`;

const CSS = `
.tc{position:fixed;inset:0;pointer-events:none;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;z-index:5}
.tc.hidden{display:none}
.tc-b{position:absolute;display:flex;align-items:center;justify-content:center;border-radius:50%;color:#e6eef0;pointer-events:auto;
 background:rgba(18,22,26,.5);border:2px solid rgba(255,255,255,.26);transition:transform .06s,background .06s,border-color .06s;touch-action:none;-webkit-tap-highlight-color:transparent}
.tc-b.on,.tc-b:active{transform:scale(.9);background:rgba(40,48,56,.8);border-color:rgba(255,255,255,.6)}
.tc-b.fire{background:rgba(150,28,34,.55);border-color:rgba(255,120,120,.55)}
.tc-b.fire.on{background:rgba(190,40,46,.85)}
.tc-b.latched{background:rgba(70,110,150,.7);border-color:#9cc4e8}
.tc-b.hint{box-shadow:0 0 0 3px rgba(240,200,90,.9),0 0 18px rgba(240,200,90,.6);border-color:#f0c85a}
.tc-b span{position:absolute;bottom:-15px;font:600 10px system-ui,sans-serif;letter-spacing:.06em;color:#cfd8dc;text-shadow:0 1px 2px #000;pointer-events:none}
.tc-j{position:absolute;width:130px;height:130px;margin:-65px 0 0 -65px;border-radius:50%;border:2px solid rgba(255,255,255,.3);background:rgba(18,22,26,.35);display:none;pointer-events:none}
.tc-j i{position:absolute;left:50%;top:50%;width:56px;height:56px;margin:-28px;border-radius:50%;background:rgba(220,230,235,.55);border:2px solid rgba(255,255,255,.7)}
.tc-j em{position:absolute;left:50%;top:-24px;transform:translateX(-50%);font:700 11px system-ui,sans-serif;color:#f0c85a;opacity:0;transition:opacity .1s;font-style:normal;letter-spacing:.08em}
.tc-j.sprint em{opacity:1}.tc-j.sprint{border-color:#f0c85a}
`;

/** Comandi touch: joystick flottante a sinistra (spingi al massimo in avanti = corsa), mira trascinando a destra, pulsanti ergonomici con icone. */
export class TouchInput implements InputSource {
  private moveId = -1;
  private lookId = -1;
  private origin = { x: 0, y: 0 };
  private last = { x: 0, y: 0 };
  private mx = 0;
  private my = 0;
  private sprint = false;
  private dx = 0;
  private dy = 0;
  private fire = false;
  private reload = false;
  private torch = false;
  private crouch = false;
  private readonly root = document.createElement("div");
  private readonly base = document.createElement("div");
  private readonly thumb = document.createElement("i");
  private readonly btns = new Map<string, HTMLDivElement>();
  private readonly abort = new AbortController();
  private static readonly R = 62;
  private static readonly DEAD = 0.12;

  constructor(parent: HTMLElement, private readonly opts: { onInventory(): void }) {
    if (!document.getElementById("tc-css")) { const st = document.createElement("style"); st.id = "tc-css"; st.textContent = CSS; document.head.appendChild(st); }
    this.root.className = "tc";
    this.base.className = "tc-j"; this.base.innerHTML = "<em>CORSA</em>"; this.base.appendChild(this.thumb); this.root.appendChild(this.base);
    const sa = (side: string) => `env(safe-area-inset-${side},0px)`;
    // Cerchio di pulsanti attorno a FUOCO (centro a 82px dal bordo destro e 86 dal basso)
    const place = (name: string, label: string, icon: string, size: number, dx: number, dy: number, cls = "") => {
      const el = document.createElement("div"); el.className = `tc-b ${cls}`; el.innerHTML = svg(icon) + (label ? `<span>${label}</span>` : "");
      el.style.width = el.style.height = `${size}px`;
      el.style.right = `calc(${82 + dx - size / 2}px + ${sa("right")})`; el.style.bottom = `calc(${86 + dy - size / 2}px + ${sa("bottom")})`;
      this.root.appendChild(el); this.btns.set(name, el); return el;
    };
    this.hold(place("fire", "", "fire", 98, 0, 0, "fire"), (v) => { this.fire = v; if (v) navigator.vibrate?.(12); });
    // Gli altri pulsanti stanno su un arco attorno a FUOCO (sopra e a sinistra), a 155 px di distanza: lontani abbastanza da non toccarli per sbaglio
    const side = (name: string, label: string, icon: string, k: number) => {
      const ang = ((12 + k * 33) * Math.PI) / 180, R = 155;                  // 0° = dritto sopra, 90° = dritto a sinistra
      return place(name, label, icon, 54, Math.round(R * Math.sin(ang)), Math.round(R * Math.cos(ang)));
    };
    this.hold(side("reload", "RICARICA", "reload", 0), (v) => { this.reload = v; });
    this.tap(side("crouch", "ABBASSA", "crouch", 1), (el) => { this.crouch = !this.crouch; el.classList.toggle("latched", this.crouch); });
    this.hold(side("torch", "TORCIA", "torch", 2), (v) => (this.torch = v));
    // Inventario: in alto a destra
    const inv = document.createElement("div"); inv.className = "tc-b"; inv.innerHTML = svg("bag") + "<span>ZAINO</span>";
    inv.style.width = inv.style.height = "54px"; inv.style.right = `calc(14px + ${sa("right")})`; inv.style.top = `calc(14px + ${sa("top")})`;
    this.root.appendChild(inv); this.btns.set("inv", inv);
    inv.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); navigator.vibrate?.(8); this.opts.onInventory(); }, { signal: this.abort.signal });
    parent.appendChild(this.root);

    const o = { signal: this.abort.signal, passive: false } as const;
    // Le aree di movimento/mira vengono lette dall'intero schermo; i pulsanti fermano la propagazione
    document.addEventListener("touchstart", (e) => this.onStart(e), o);
    document.addEventListener("touchmove", (e) => this.onMove(e), o);
    document.addEventListener("touchend", (e) => this.onEnd(e), o);
    document.addEventListener("touchcancel", (e) => this.onEnd(e), o);
    document.addEventListener("contextmenu", (e) => e.preventDefault(), { signal: this.abort.signal });
    document.addEventListener("gesturestart", (e) => e.preventDefault(), o);
  }

  private hold(el: HTMLElement, set: (v: boolean) => void): void {
    const o = { signal: this.abort.signal };
    el.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); el.setPointerCapture?.(e.pointerId); el.classList.add("on"); set(true); }, o);
    const up = (e: Event) => { e.stopPropagation(); el.classList.remove("on"); set(false); };
    el.addEventListener("pointerup", up, o); el.addEventListener("pointercancel", up, o); el.addEventListener("lostpointercapture", up, o);
    el.addEventListener("touchstart", (e) => { e.stopPropagation(); e.preventDefault(); }, { signal: this.abort.signal, passive: false });
  }
  private tap(el: HTMLDivElement, fn: (el: HTMLDivElement) => void): void {
    el.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); navigator.vibrate?.(8); fn(el); }, { signal: this.abort.signal });
    el.addEventListener("touchstart", (e) => { e.stopPropagation(); e.preventDefault(); }, { signal: this.abort.signal, passive: false });
  }

  setVisible(v: boolean): void { this.root.classList.toggle("hidden", !v); if (!v) this.release(); }

  private release(): void {
    this.moveId = this.lookId = -1; this.mx = this.my = 0; this.sprint = false; this.fire = this.reload = this.torch = false; this.base.style.display = "none";
    for (const el of this.btns.values()) el.classList.remove("on");
  }

  private onStart(e: TouchEvent): void {
    if ((e.target as HTMLElement | null)?.closest?.(".inv, .tc-b")) return;
    for (const t of Array.from(e.changedTouches)) {
      if (t.clientX < innerWidth * 0.45 && this.moveId < 0) {
        this.moveId = t.identifier; this.origin = { x: t.clientX, y: t.clientY };
        this.base.style.display = "block"; this.base.style.left = `${t.clientX}px`; this.base.style.top = `${t.clientY}px`;
        this.thumb.style.transform = "translate(0,0)"; this.base.classList.remove("sprint");
      } else if (t.clientX >= innerWidth * 0.45 && this.lookId < 0) {
        this.lookId = t.identifier; this.last = { x: t.clientX, y: t.clientY };
      }
    }
    e.preventDefault();
  }
  private onMove(e: TouchEvent): void {
    let used = false;
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === this.moveId || t.identifier === this.lookId) used = true;
      if (t.identifier === this.moveId) {
        let vx = (t.clientX - this.origin.x) / TouchInput.R, vy = -(t.clientY - this.origin.y) / TouchInput.R;
        const m = Math.hypot(vx, vy);
        if (m > 1) { vx /= m; vy /= m; }
        const mag = Math.min(1, m);
        this.thumb.style.transform = `translate(${vx * TouchInput.R * 0.8}px,${-vy * TouchInput.R * 0.8}px)`;
        if (mag < TouchInput.DEAD) { this.mx = 0; this.my = 0; }
        else { const k = ((mag - TouchInput.DEAD) / (1 - TouchInput.DEAD)) ** 1.25; this.mx = (vx / mag) * k; this.my = (vy / mag) * k; }
        const wasSprint = this.sprint;
        this.sprint = mag > 0.93 && vy > 0.55;                         // spingi al massimo in avanti = corsa
        if (this.sprint !== wasSprint) this.base.classList.toggle("sprint", this.sprint);
      } else if (t.identifier === this.lookId) {
        this.dx += t.clientX - this.last.x; this.dy += t.clientY - this.last.y; this.last = { x: t.clientX, y: t.clientY };
      }
    }
    if (used) e.preventDefault(); // altrimenti lo scroll nativo (inventario) resta libero
  }
  private onEnd(e: TouchEvent): void {
    for (const t of Array.from(e.changedTouches)) {
      if (t.identifier === this.moveId) { this.moveId = -1; this.mx = this.my = 0; this.sprint = false; this.base.style.display = "none"; }
      if (t.identifier === this.lookId) this.lookId = -1;
    }
  }

  poll(out: InputState): void {
    if (this.mx !== 0 || this.my !== 0) { out.moveX = this.mx; out.moveY = this.my; }
    out.lookDX += this.dx * 1.3; out.lookDY += this.dy * 1.3; this.dx = 0; this.dy = 0;
    out.sprint ||= this.sprint; out.crouch ||= this.crouch;
    out.fire ||= this.fire; out.torch ||= this.torch; out.reload ||= this.reload;
  }

  dispose(): void { this.abort.abort(); this.root.remove(); }
}
