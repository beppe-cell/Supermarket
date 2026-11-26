const CSS = `
.hud{position:fixed;inset:0;pointer-events:none;color:#dfeaee;font:500 14px/1.3 system-ui,-apple-system,sans-serif;z-index:4;user-select:none;-webkit-user-select:none}
.hud *{box-sizing:border-box}
.hud .plate{background:rgba(10,13,16,.55);border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:8px 10px}
.hud svg{width:1em;height:1em;vertical-align:-.12em;stroke:currentColor;fill:none;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
/* parametri di layout (desktop) */
.hud{--sx:max(18px,env(safe-area-inset-left,0px));--sr:max(18px,env(safe-area-inset-right,0px));--sb:max(18px,env(safe-area-inset-bottom,0px));--st:max(14px,env(safe-area-inset-top,0px))}
.vitals{position:absolute;left:var(--sx);bottom:var(--sb);width:min(260px,44vw);display:grid;gap:6px}
.vrow{display:flex;align-items:center;gap:8px}
.vrow .ico{width:18px;text-align:center;color:#d8dde0}
.vbar{flex:1;height:10px;background:rgba(255,255,255,.1);border-radius:2px;overflow:hidden;position:relative}
.vbar>b{position:absolute;inset:0 auto 0 0;width:100%;background:#c0282d;transition:width .2s}
.vbar.stam{height:6px}.vbar.stam>b{background:#8fc9b0}
.vbar.low>b{background:#e0482f}
.vnum{min-width:2.6em;text-align:right;font:700 15px ui-monospace,monospace}
.weapon{position:absolute;right:var(--sr);bottom:var(--sb);display:flex;align-items:center;gap:12px;padding:8px 14px}
.weapon .wico{font-size:26px;color:#cfd6da}
.weapon .mag{font:800 30px/1 ui-monospace,monospace;letter-spacing:.02em}
.weapon .res{font:600 16px ui-monospace,monospace;color:#9aa5ab;margin-left:4px}
.weapon.low .mag{color:#f0b050;animation:pulse 1s infinite}.weapon.empty .mag{color:#e0482f;animation:pulse .6s infinite}
.weapon .rl{font:700 12px system-ui;letter-spacing:.12em;color:#f0c85a;display:none}
.weapon.reloading .rl{display:block}.weapon.reloading .mag,.weapon.reloading .res{opacity:.35}
@keyframes pulse{50%{opacity:.45}}
.obj{position:absolute;top:var(--st);left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:8px;padding:6px 12px;font:600 13px system-ui;max-width:70vw;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.obj .dia{color:#e0b84a}.obj.done .dia{color:#7fd3a0}
.cross{position:absolute;left:50%;top:50%;width:0;height:0}
.cross i{position:absolute;background:rgba(255,255,255,.85);box-shadow:0 0 2px #000a;transition:transform .08s}
.cross .t{width:2px;height:7px;left:-1px;top:-14px}.cross .b{width:2px;height:7px;left:-1px;top:7px}
.cross .l{width:7px;height:2px;left:-14px;top:-1px}.cross .r{width:7px;height:2px;left:7px;top:-1px}
.cross .d{width:2px;height:2px;left:-1px;top:-1px;border-radius:50%;opacity:.8}
.hitm{position:absolute;left:50%;top:50%;width:28px;height:28px;margin:-14px;opacity:0;transition:opacity .15s;
 background:linear-gradient(45deg,transparent 46%,#fff 46%,#fff 54%,transparent 54%),linear-gradient(-45deg,transparent 46%,#fff 46%,#fff 54%,transparent 54%)}
.hitm.kill{filter:drop-shadow(0 0 4px #e0242c) saturate(0) brightness(1.2) sepia(1) hue-rotate(-30deg) saturate(8)}
.prompt{position:absolute;left:50%;top:58%;transform:translateX(-50%);display:none;align-items:center;gap:10px;padding:7px 12px;font:600 15px system-ui;text-shadow:0 1px 3px #000}
.prompt kbd{font:700 13px ui-monospace,monospace;background:#e6eaec;color:#101418;border-radius:4px;padding:2px 7px;box-shadow:0 2px 0 #7a8288}
.toasts{position:absolute;left:50%;top:calc(var(--st) + 44px);transform:translateX(-50%);display:grid;gap:6px;justify-items:center;width:min(520px,86vw)}
.toast{display:flex;align-items:center;gap:8px;padding:7px 12px;font:600 14px system-ui;border-left:3px solid #8fb7c9;animation:tin .18s ease-out;transition:opacity .4s}
.toast.item{border-color:#e0b84a}.toast.warn{border-color:#e0482f}.toast.ok{border-color:#7fd3a0}
.toast.out{opacity:0}
@keyframes tin{from{transform:translateY(-6px);opacity:0}}
.dmg{position:absolute;left:50%;top:50%;width:0;height:0}
.dmg i{position:absolute;left:-60px;top:-150px;width:120px;height:34px;opacity:0;border-radius:50% 50% 0 0/100% 100% 0 0;background:radial-gradient(ellipse at 50% 100%,rgba(220,30,36,.9),rgba(220,30,36,0) 70%);transition:opacity .7s}
.flash{position:absolute;inset:0;opacity:0;background:radial-gradient(ellipse at center,transparent 35%,rgba(160,0,0,.6) 100%)}
.lowhp{position:absolute;inset:0;opacity:0;background:radial-gradient(ellipse at center,transparent 45%,rgba(120,0,0,.55) 100%);animation:pulse 1.3s infinite}
.lowhp.on{opacity:1}
.over{position:absolute;inset:0;display:none;flex-direction:column;align-items:center;justify-content:center;gap:12px;background:rgba(0,0,0,.8);color:#c0282d;font:800 40px system-ui;pointer-events:auto;text-align:center}
.over small{font:500 16px system-ui;color:#ccc}
.lock{position:absolute;left:50%;bottom:calc(var(--sb) + 4px);transform:translateX(-50%);display:none;padding:8px 14px;font:600 13px system-ui;text-align:center;line-height:1.5}
.lock kbd{font:700 11px ui-monospace,monospace;background:#dfe6e9;color:#101418;border-radius:3px;padding:1px 5px;margin:0 2px}
.dbg{position:absolute;left:50%;bottom:4px;transform:translateX(-50%);font:10px ui-monospace,monospace;color:#6f8a80;opacity:.8;white-space:pre}
/* layout telefono: pannelli compatti in alto, i comandi occupano il basso */
body.touch .vitals{bottom:auto;top:var(--st);left:max(10px,env(safe-area-inset-left,0px));width:min(116px,24vw);gap:3px;padding:4px 6px;border-radius:5px}
body.touch .vrow{gap:5px}body.touch .vrow .ico{width:13px;font-size:12px}
body.touch .vbar{height:6px}body.touch .vbar.stam{height:4px}
body.touch .vnum{min-width:2.2em;font-size:11px}
body.touch .weapon{bottom:auto;right:calc(var(--sr) + 62px);top:var(--st);padding:3px 8px;gap:6px}
body.touch .weapon .mag{font-size:17px}body.touch .weapon .res{font-size:11px;margin-left:2px}
body.touch .weapon .wico{font-size:15px}body.touch .weapon .rl{font-size:9px}
body.touch .obj{top:calc(var(--st) + 42px);font-size:11px;padding:4px 9px}
body.touch .toasts{top:calc(var(--st) + 68px)}
body.touch .prompt{top:50%;margin-top:34px;font-size:14px}
body.touch .prompt kbd{display:none}
@media (max-height:420px){body.touch .obj{display:none}}
`;
const I = {
  heart: '<svg viewBox="0 0 24 24"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/></svg>',
  bolt: '<svg viewBox="0 0 24 24"><path d="M13 3L6 13h5l-1 8 7-10h-5z"/></svg>',
  gun: '<svg viewBox="0 0 24 24" style="stroke-width:1.6"><path d="M3 8h14l2 2v3h-6l-1 3H8l-.5-3H3z"/><path d="M13 13h2"/></svg>',
  dia: '<svg viewBox="0 0 24 24"><path d="M12 3l7 9-7 9-7-9z"/></svg>',
  info: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/></svg>',
};

/** HUD: vitali, arma/munizioni, mirino dinamico, indicatori di danno direzionali, avvisi, obiettivo e prompt di interazione. */
export class Hud {
  private readonly root = document.createElement("div");
  private readonly q = <T extends HTMLElement>(c: string): T => this.root.querySelector(`.${c}`) as T;
  private msgCount = 0;
  private hitTimer = 0;
  private lastHurtAngle = 0;

  constructor(parent: HTMLElement = document.body, touch = false) {
    if (!document.getElementById("hud-css")) { const st = document.createElement("style"); st.id = "hud-css"; st.textContent = CSS; document.head.appendChild(st); }
    document.body.classList.toggle("touch", touch);
    this.root.className = "hud";
    this.root.innerHTML = `
      <div class="lowhp"></div><div class="flash"></div>
      <div class="obj plate" style="display:none"><span class="dia">${I.dia}</span><span class="otxt"></span></div>
      <div class="cross"><i class="t"></i><i class="b"></i><i class="l"></i><i class="r"></i><i class="d"></i></div>
      <div class="hitm"></div>
      <div class="dmg"></div>
      <div class="prompt plate"><kbd>E</kbd><span class="ptxt"></span></div>
      <div class="toasts"></div>
      <div class="vitals plate">
        <div class="vrow"><span class="ico">${I.heart}</span><div class="vbar hp"><b></b></div><span class="vnum hpn">100</span></div>
        <div class="vrow"><span class="ico">${I.bolt}</span><div class="vbar stam"><b></b></div><span class="vnum" style="visibility:hidden">0</span></div>
      </div>
      <div class="weapon plate"><span class="wico">${I.gun}</span><div><span class="mag">15</span><span class="res">/ 30</span><div class="rl">RICARICA…</div></div></div>
      <div class="lock plate">Clicca per giocare<br><kbd>WASD</kbd> muovi · <kbd>Shift</kbd> corri · <kbd>Ctrl</kbd> accovacciati · <kbd>R</kbd> ricarica · <kbd>F</kbd> torcia · <kbd>Tasto destro</kbd> mira · <kbd>I</kbd> zaino</div>
      <div class="dbg"></div>
      <div class="over"><div>SEI MORTO</div><small>Clicca o tocca per ricominciare</small></div>`;
    for (let i = 0; i < 8; i++) { const w = document.createElement("i"); w.style.transform = `rotate(${i * 45}deg)`; this.q("dmg").appendChild(w); }
    this.q("over").addEventListener("pointerdown", () => location.reload());
    parent.appendChild(this.root);
  }

  setLockHint(v: boolean): void { this.q("lock").style.display = v ? "block" : "none"; }
  setVisible(v: boolean): void { this.root.style.display = v ? "" : "none"; }
  setDebug(t: string): void { this.q("dbg").textContent = t; }

  setPrompt(text: string, key = "E"): void {
    const p = this.q("prompt"); p.style.display = text ? "flex" : "none";
    if (text) { this.q("ptxt").textContent = text; (p.querySelector("kbd") as HTMLElement).textContent = key; }
  }
  setStamina(ratio: number): void { const b = this.q("stam"); (b.firstElementChild as HTMLElement).style.width = `${Math.round(ratio * 100)}%`; b.classList.toggle("low", ratio < 0.25); }
  setHealth(ratio: number, value: number): void {
    const b = this.q("hp"); (b.firstElementChild as HTMLElement).style.width = `${Math.round(ratio * 100)}%`; b.classList.toggle("low", ratio < 0.3);
    this.q("hpn").textContent = String(Math.ceil(value)); this.q("lowhp").classList.toggle("on", ratio < 0.3 && ratio > 0);
  }
  setAmmo(mag: number, reserve: number, reloading: boolean): void {
    const w = this.q("weapon"); w.classList.toggle("reloading", reloading); w.classList.toggle("low", mag > 0 && mag <= 4); w.classList.toggle("empty", mag === 0 && !reloading);
    this.q("mag").textContent = String(mag); this.q("res").textContent = `/ ${reserve}`;
  }
  setObjective(text: string | undefined, done = false): void {
    const o = this.q("obj"); o.style.display = text ? "flex" : "none"; o.classList.toggle("done", done); if (text) this.q("otxt").textContent = text;
  }
  /** Allarga il mirino: `spread` 0..1 (movimento, corsa, ultimo sparo). */
  setCrosshair(spread: number): void {
    const g = 3 + spread * 16; const c = this.q("cross");
    (c.querySelector(".t") as HTMLElement).style.transform = `translateY(${-g}px)`; (c.querySelector(".b") as HTMLElement).style.transform = `translateY(${g}px)`;
    (c.querySelector(".l") as HTMLElement).style.transform = `translateX(${-g}px)`; (c.querySelector(".r") as HTMLElement).style.transform = `translateX(${g}px)`;
  }
  hitMarker(kill: boolean): void {
    const h = this.q("hitm"); h.classList.toggle("kill", kill); h.style.opacity = "1";
    clearTimeout(this.hitTimer); this.hitTimer = window.setTimeout(() => { h.style.opacity = "0"; }, kill ? 380 : 140);
  }
  /** Danno ricevuto: lampo rosso e arco direzionale (angolo relativo allo sguardo: 0 = davanti, π/2 = destra). */
  hurt(angle?: number): void {
    const f = this.q("flash"); f.style.transition = "none"; f.style.opacity = "1"; requestAnimationFrame(() => { f.style.transition = "opacity .5s"; f.style.opacity = "0"; });
    if (angle !== undefined) {
      const idx = ((Math.round(angle / (Math.PI / 4)) % 8) + 8) % 8, el = this.q("dmg").children[idx] as HTMLElement; this.lastHurtAngle = angle;
      el.style.transition = "none"; el.style.opacity = "1"; requestAnimationFrame(() => { el.style.transition = "opacity .9s"; el.style.opacity = "0"; });
    }
  }
  /** Avviso a comparsa: `kind` = info | item | warn | ok. Massimo 3 contemporanei. */
  message(text: string, kind: "info" | "item" | "warn" | "ok" = "info"): void {
    const box = this.q("toasts"); while (box.children.length >= 3) box.firstElementChild?.remove();
    const t = document.createElement("div"); t.className = `toast plate ${kind}`; t.innerHTML = `${I.info}<span></span>`; (t.lastElementChild as HTMLElement).textContent = text;
    box.appendChild(t); this.msgCount++;
    setTimeout(() => t.classList.add("out"), 2800); setTimeout(() => t.remove(), 3250);
  }
  showDeath(): void { this.q("over").style.display = "flex"; }
  get hurtAngle(): number { return this.lastHurtAngle; }
}
