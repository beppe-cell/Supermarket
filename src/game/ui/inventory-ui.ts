import { ITEMS, type Inventory } from "../inventory/inventory";
import type { Objectives } from "../inventory/objectives";
import { saveSettings, type Settings } from "../../core/settings";

const ICON: Record<string, string> = {
  card: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M3 10h18M6 15h5"/>',
  key: '<circle cx="8" cy="12" r="3.5"/><path d="M11.5 12H21M17 12v3M20 12v2"/>',
  gauze: '<rect x="4" y="7" width="16" height="10" rx="2"/><path d="M12 9.5v5M9.5 12h5"/>',
  can: '<path d="M7 5h10v14a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1z"/><path d="M7 9h10M7 15h10"/>',
  bottle: '<path d="M10 3h4v4l2 3v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10l2-3z"/><path d="M8 14h8"/>',
  ammo: '<path d="M9 20V9a3 3 0 0 1 6 0v11z"/><path d="M9 16h6"/>',
  pistol: '<path d="M3 8h14l2 2v3h-6l-1 3H8l-.5-3H3z"/><path d="M13 13h2"/>',
};
const ic = (n: string, size = "100%") => `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n] ?? ""}</svg>`;
const KIND_LABEL: Record<string, string> = { key: "Chiave", heal: "Cura", ammo: "Munizioni", material: "Materiale", misc: "Varie" };

const CSS = `
.inv{position:fixed;inset:0;z-index:30;display:none;background:rgba(4,6,8,.9);color:#dfeaee;font:500 14px/1.35 system-ui,-apple-system,sans-serif;
 padding:max(12px,env(safe-area-inset-top,0px)) max(12px,env(safe-area-inset-right,0px)) max(12px,env(safe-area-inset-bottom,0px)) max(12px,env(safe-area-inset-left,0px));touch-action:pan-y;user-select:none;-webkit-user-select:none}
.inv.open{display:flex;align-items:center;justify-content:center}
.inv *{box-sizing:border-box}
.inv-p{width:min(940px,100%);max-height:100%;display:flex;flex-direction:column;background:#0d1114;border:1px solid rgba(255,255,255,.12);border-radius:10px;overflow:hidden}
.inv-h{display:flex;align-items:center;gap:4px;padding:6px 8px;border-bottom:1px solid rgba(255,255,255,.1);background:#11171b}
.inv-t{flex:1;display:flex;gap:2px;overflow-x:auto}
.inv-t button{background:none;border:0;color:#93a1a8;font:600 14px system-ui;padding:11px 14px;min-height:44px;border-bottom:2px solid transparent;cursor:pointer;white-space:nowrap}
.inv-t button[aria-selected=true]{color:#fff;border-color:#c0282d}
.inv-x{background:none;border:1px solid rgba(255,255,255,.2);color:#dfeaee;width:44px;height:44px;border-radius:8px;font:600 20px system-ui;cursor:pointer}
.inv-b{padding:14px;overflow:auto;-webkit-overflow-scrolling:touch}
.inv-z{display:grid;grid-template-columns:minmax(0,1.25fr) minmax(0,1fr);gap:16px}
.inv-g{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.slot{aspect-ratio:1;max-height:92px;min-height:60px;background:#151c21;border:1px solid rgba(255,255,255,.1);border-radius:8px;position:relative;display:flex;align-items:center;justify-content:center;color:#cfd8dc;cursor:pointer;padding:12px}
.slot.empty{opacity:.45;cursor:default}
.slot[aria-pressed=true]{border-color:#e0b84a;box-shadow:0 0 0 2px rgba(224,184,74,.35)}
.slot .n{position:absolute;right:6px;bottom:3px;font:700 12px ui-monospace,monospace;color:#fff;text-shadow:0 1px 2px #000}
.eq{display:flex;align-items:center;gap:12px;background:#151c21;border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:10px 12px;margin-bottom:10px}
.eq .ei{width:38px;height:38px;color:#cfd8dc}.eq b{font:800 20px ui-monospace,monospace}.eq small{color:#93a1a8;display:block;font-size:12px}
.cap{margin-top:8px;color:#93a1a8;font-size:12px}
.det{background:#11171b;border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:14px;min-height:190px;display:flex;flex-direction:column;gap:8px}
.det h3{margin:0;font:700 17px system-ui}.det .k{display:inline-block;font:600 11px system-ui;letter-spacing:.08em;text-transform:uppercase;color:#e0b84a}
.det p{margin:0;color:#b6c1c6}.det .acts{margin-top:auto;display:flex;gap:8px;flex-wrap:wrap}
.btn{background:#1a232a;color:#e8f0f2;border:1px solid rgba(255,255,255,.2);border-radius:8px;min-height:44px;padding:0 16px;font:600 14px system-ui;cursor:pointer}
.btn.pri{background:#8f2026;border-color:#c0282d}.btn:disabled{opacity:.4;cursor:default}
.empty-t{color:#7e8b91;text-align:center;padding:36px 8px}
.ol{list-style:none;margin:0;padding:0;display:grid;gap:8px}.ol li{display:flex;gap:10px;align-items:center;padding:12px;background:#151c21;border-radius:8px;border:1px solid rgba(255,255,255,.08)}
.ol li.done{opacity:.55;text-decoration:line-through}.ol .m{width:18px;color:#e0b84a}.ol li.done .m{color:#7fd3a0}
.set{display:grid;gap:18px;max-width:520px}.set label{display:grid;gap:6px;font-weight:600}.set .row{display:flex;align-items:center;justify-content:space-between;gap:12px}
.set input[type=range]{width:100%;accent-color:#c0282d;height:32px}
.set .ro{color:#93a1a8;font-weight:500}
@media (max-width:720px),(max-height:480px){.inv-z{grid-template-columns:1fr}.inv-b{padding:10px}.slot{max-height:76px;min-height:52px;padding:9px}.det{min-height:0}}
@media (max-height:480px){.inv-z{grid-template-columns:minmax(0,1.5fr) minmax(0,1fr);gap:10px}.inv-g{grid-template-columns:repeat(6,1fr);gap:6px}.slot{min-height:44px;max-height:56px;padding:7px}.eq{padding:6px 10px;margin-bottom:6px}.eq b{font-size:16px}.eq .ei{width:28px;height:28px}.det{padding:10px}.inv-t button{padding:6px 12px;min-height:40px}.inv-x{width:40px;height:40px}.inv-h{padding:2px 6px}}
`;

export interface InventoryDeps {
  inventory: Inventory;
  objectives: Objectives;
  settings: Settings;
  qualityLabel: string;
  getAmmo(): { mag: number; reserve: number };
  getHealth(): { hp: number; max: number };
  /** Usa un oggetto; ritorna il messaggio da mostrare (o undefined se non usabile). */
  useItem(id: string): { ok: boolean; message: string };
  onSettings(s: Settings): void;
  onToggle(open: boolean): void;
}

/** Schermata inventario: Zaino (slot + dettagli + azioni), Obiettivi, Diario (vuoto per ora), Impostazioni. */
export class InventoryUI {
  private readonly el = document.createElement("div");
  private tab: "bag" | "obj" | "diary" | "set" = "bag";
  private sel = -1;
  isOpen = false;

  constructor(private readonly d: InventoryDeps) {
    if (!document.getElementById("inv-css")) { const st = document.createElement("style"); st.id = "inv-css"; st.textContent = CSS; document.head.appendChild(st); }
    this.el.className = "inv"; this.el.setAttribute("role", "dialog"); this.el.setAttribute("aria-modal", "true"); this.el.setAttribute("aria-label", "Inventario");
    this.el.addEventListener("pointerdown", (e) => e.stopPropagation());
    this.el.addEventListener("keydown", (e) => { if (e.code === "Escape") { e.preventDefault(); this.close(); } });
    document.body.appendChild(this.el);
  }

  toggle(): void { this.isOpen ? this.close() : this.open(); }
  open(): void { this.isOpen = true; this.el.classList.add("open"); this.render(); this.d.onToggle(true); (this.el.querySelector(".inv-t button[aria-selected=true]") as HTMLElement | null)?.focus(); }
  close(): void { if (!this.isOpen) return; this.isOpen = false; this.el.classList.remove("open"); this.d.onToggle(false); }
  /** Aggiorna il contenuto se aperto (es. dopo una raccolta). */
  refresh(): void { if (this.isOpen) this.render(); }

  private render(): void {
    const tabs: [typeof this.tab, string][] = [["bag", "Zaino"], ["obj", "Obiettivi"], ["diary", "Diario"], ["set", "Impostazioni"]];
    this.el.innerHTML = `<div class="inv-p"><div class="inv-h"><div class="inv-t" role="tablist">${tabs.map(([k, l]) => `<button role="tab" data-tab="${k}" aria-selected="${this.tab === k}">${l}</button>`).join("")}</div><button class="inv-x" aria-label="Chiudi">✕</button></div><div class="inv-b"></div></div>`;
    const body = this.el.querySelector(".inv-b") as HTMLElement;
    if (this.tab === "bag") this.renderBag(body); else if (this.tab === "obj") this.renderObj(body); else if (this.tab === "diary") body.innerHTML = '<div class="empty-t">Nessuna nota trovata.<br>Le note e i documenti raccolti compariranno qui.</div>'; else this.renderSettings(body);
    this.el.querySelectorAll<HTMLElement>("[data-tab]").forEach((b) => b.addEventListener("click", () => { this.tab = b.dataset.tab as typeof this.tab; this.render(); (this.el.querySelector(`[data-tab="${this.tab}"]`) as HTMLElement).focus(); }));
    (this.el.querySelector(".inv-x") as HTMLElement).addEventListener("click", () => this.close());
  }

  private renderBag(body: HTMLElement): void {
    const { inventory: inv } = this.d, a = this.d.getAmmo(), hp = this.d.getHealth();
    const slots = inv.slots.map((s, i) => {
      if (!s) return `<div class="slot empty" aria-label="Slot vuoto"></div>`;
      const def = ITEMS[s.id]; return `<button class="slot" data-i="${i}" aria-pressed="${this.sel === i}" aria-label="${def?.name ?? s.id} x${s.count}">${ic(def?.icon ?? "")}${s.count > 1 ? `<span class="n">${s.count}</span>` : ""}</button>`;
    }).join("");
    const cur = this.sel >= 0 ? inv.slots[this.sel] : undefined, def = cur ? ITEMS[cur.id] : undefined;
    const det = def && cur
      ? `<h3>${def.name}</h3><span class="k">${KIND_LABEL[def.kind] ?? ""} · x${cur.count}</span><p>${def.desc}</p><div class="acts">${def.kind === "heal" ? `<button class="btn pri" data-act="use" ${hp.hp >= hp.max ? "disabled" : ""}>Usa</button>` : ""}${def.kind === "key" ? "" : `<button class="btn" data-act="drop">Getta 1</button>`}</div>`
      : `<div class="empty-t">Seleziona un oggetto per vederne i dettagli.</div>`;
    body.innerHTML = `<div class="inv-z"><div>
      <div class="eq"><span class="ei">${ic("pistol")}</span><div><b>${a.mag} / ${a.reserve}</b><small>Beretta M9 · 9 mm</small></div><span style="margin-left:auto;color:#93a1a8;font-size:12px">Salute ${Math.ceil(hp.hp)}/${hp.max}</span></div>
      <div class="inv-g">${slots}</div><div class="cap">Zaino: ${inv.used} / ${inv.capacity} slot</div></div><div class="det">${det}</div></div>`;
    body.querySelectorAll<HTMLElement>(".slot[data-i]").forEach((b) => b.addEventListener("click", () => { this.sel = Number(b.dataset.i); this.render(); }));
    body.querySelector('[data-act="use"]')?.addEventListener("click", () => {
      if (!cur) return; const r = this.d.useItem(cur.id); if (r.ok) { inv.removeAt(this.sel); if (!inv.slots[this.sel]) this.sel = -1; } this.render();
    });
    body.querySelector('[data-act="drop"]')?.addEventListener("click", () => { inv.removeAt(this.sel); if (!inv.slots[this.sel]) this.sel = -1; this.render(); });
  }

  private renderObj(body: HTMLElement): void {
    body.innerHTML = `<ul class="ol">${this.d.objectives.list.map((o) => `<li class="${o.done ? "done" : ""}"><span class="m">${o.done ? "✔" : "◆"}</span><span>${o.text}</span></li>`).join("")}</ul>`;
  }

  private renderSettings(body: HTMLElement): void {
    const s = this.d.settings;
    body.innerHTML = `<div class="set">
      <label>Sensibilità di mira <span class="ro" id="sv">${s.lookSens.toFixed(1)}×</span><input id="sens" type="range" min="0.4" max="3" step="0.1" value="${s.lookSens}"></label>
      <label>Volume <span class="ro" id="vv">${Math.round(s.volume * 100)}%</span><input id="vol" type="range" min="0" max="1" step="0.05" value="${s.volume}"></label>
      <div class="row"><span style="font-weight:600">Inverti asse verticale</span><button class="btn" id="inv" aria-pressed="${s.invertY}">${s.invertY ? "Sì" : "No"}</button></div>
      <div class="row"><span style="font-weight:600">Qualità grafica</span><span class="ro">${this.d.qualityLabel}</span></div>
      <div class="row"><span style="font-weight:600">Partita</span><button class="btn" id="restart">Ricomincia</button></div></div>`;
    const apply = () => { saveSettings(s); this.d.onSettings(s); };
    (body.querySelector("#sens") as HTMLInputElement).addEventListener("input", (e) => { s.lookSens = Number((e.target as HTMLInputElement).value); (body.querySelector("#sv") as HTMLElement).textContent = `${s.lookSens.toFixed(1)}×`; apply(); });
    (body.querySelector("#vol") as HTMLInputElement).addEventListener("input", (e) => { s.volume = Number((e.target as HTMLInputElement).value); (body.querySelector("#vv") as HTMLElement).textContent = `${Math.round(s.volume * 100)}%`; apply(); });
    (body.querySelector("#inv") as HTMLElement).addEventListener("click", () => { s.invertY = !s.invertY; apply(); this.render(); });
    (body.querySelector("#restart") as HTMLElement).addEventListener("click", () => location.reload());
  }
}
