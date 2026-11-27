const CSS = `
#loading{position:fixed;inset:0;z-index:50;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;background:#05070a;color:#cfe8dd;
 font:600 13px/1.35 system-ui,sans-serif;padding:max(16px,env(safe-area-inset-top,0px)) 20px;text-align:center;overflow:auto;transition:opacity .7s ease}
#loading.out{opacity:0;pointer-events:none}
#loading .ld-t{font-size:22px;letter-spacing:.34em;color:#e6eef0;text-transform:uppercase}
#loading .ld-sub{font-size:11px;letter-spacing:.3em;color:#c0282d;text-transform:uppercase;margin-top:-8px}
#loading .ld-i{text-transform:none;letter-spacing:normal;max-width:560px;display:grid;gap:10px;font:400 15px/1.5 system-ui,sans-serif;color:#b9c9c2;text-align:left}
#loading .ld-i b{color:#e6eef0}
#loading .ld-bar{width:min(260px,70vw);height:3px;background:rgba(255,255,255,.12);border-radius:2px;overflow:hidden}
#loading .ld-bar i{display:block;height:100%;width:0;background:#c0282d;transition:width .25s ease}
#loading .ld-s{color:#7f948b;font-size:11px;letter-spacing:.14em;text-transform:uppercase;min-height:1.3em}
#loading.ready .ld-s{color:#e6eef0;font-size:13px;animation:ldp 1.1s infinite;cursor:pointer}
@keyframes ldp{50%{opacity:.35}}`;

const INTRO = `
<p>È il giorno dei <b>saldi</b>. Sei entrato di nascosto in un ipermercato <b>poco prima dell'apertura</b>, per portare via merce da rivendere.</p>
<p>Ma i clienti accalcati davanti all'ingresso sono <b>tutti zombie</b>, e tra poco spingeranno le porte.</p>
<p>Hai <b>30 secondi al buio</b>, con la sola torcia: cerca armi, munizioni e oggetti sugli scaffali e a terra (lampeggiano di giallo quando sei a 10 metri). Poi si accendono le luci e arrivano a orde.</p>
<p>Trova la <b>chiave elettronica</b>, apri il magazzino e sopravvivi fino al livello successivo. Non farti vedere, non correre alle spalle di nessuno: se ti nascondi, non ti trovano.</p>`;

/** Schermata di caricamento con introduzione: resta finché la scena è pronta, poi chiede un clic/tocco per iniziare (serve anche per catturare il mouse). */
export class Loader {
  private readonly el: HTMLElement;
  private readonly bar: HTMLElement;
  private readonly label: HTMLElement;

  constructor() {
    if (!document.getElementById("ld-css")) { const st = document.createElement("style"); st.id = "ld-css"; st.textContent = CSS; document.head.appendChild(st); }
    let el = document.getElementById("loading");
    if (!el) { el = document.createElement("div"); el.id = "loading"; document.body.appendChild(el); }
    el.innerHTML = `<div class="ld-t">Supermarket</div><div class="ld-sub">Saldi · Prima dell'apertura</div><div class="ld-i">${INTRO}</div><div class="ld-bar"><i></i></div><div class="ld-s">Avvio…</div>`;
    this.el = el; this.bar = el.querySelector(".ld-bar i") as HTMLElement; this.label = el.querySelector(".ld-s") as HTMLElement;
  }

  set(frac: number, text: string): void { this.bar.style.width = `${Math.round(frac * 100)}%`; this.label.textContent = text; }

  /** Pronto: mostra "clicca per iniziare" e attende il gesto dell'utente (cattura il puntatore sul canvas). */
  ready(canvas: HTMLCanvasElement): Promise<void> {
    this.set(1, "Clicca o tocca per iniziare"); this.el.classList.add("ready");
    return new Promise((resolve) => {
      const go = (): void => { removeEventListener("keydown", onKey); this.el.removeEventListener("pointerdown", go); void canvas.requestPointerLock?.(); this.close(); resolve(); };
      const onKey = (e: KeyboardEvent): void => { if (e.code === "Enter" || e.code === "Space") go(); };
      this.el.addEventListener("pointerdown", go); addEventListener("keydown", onKey);
    });
  }

  /** Chiusura immediata (modalità debug/test). */
  close(): void { this.el.classList.add("out"); setTimeout(() => this.el.remove(), 800); }
}
