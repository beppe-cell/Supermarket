const CSS = `
#loading{position:fixed;inset:0;z-index:50;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;background:#05070a;color:#cfe8dd;
 font:600 13px/1.3 system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;transition:opacity .6s ease;padding:0 16px;text-align:center}
#loading.out{opacity:0;pointer-events:none}
#loading .ld-t{font-size:20px;letter-spacing:.3em;color:#e6eef0}
#loading .ld-bar{width:min(260px,70vw);height:3px;background:rgba(255,255,255,.12);border-radius:2px;overflow:hidden}
#loading .ld-bar i{display:block;height:100%;width:0;background:#c0282d;transition:width .25s ease}
#loading .ld-s{color:#7f948b;font-size:11px;min-height:1.3em}`;

/** Schermata di caricamento: parte dall'HTML (visibile prima che il codice sia pronto) e sparisce quando la scena è compilata. */
export class Loader {
  private readonly el: HTMLElement;
  private readonly bar: HTMLElement;
  private readonly label: HTMLElement;

  constructor() {
    if (!document.getElementById("ld-css")) { const st = document.createElement("style"); st.id = "ld-css"; st.textContent = CSS; document.head.appendChild(st); }
    let el = document.getElementById("loading");
    if (!el) {
      el = document.createElement("div"); el.id = "loading";
      el.innerHTML = '<div class="ld-t">Supermarket</div><div class="ld-bar"><i></i></div><div class="ld-s">Avvio…</div>';
      document.body.appendChild(el);
    }
    this.el = el; this.bar = el.querySelector(".ld-bar i") as HTMLElement; this.label = el.querySelector(".ld-s") as HTMLElement;
  }

  set(frac: number, text: string): void { this.bar.style.width = `${Math.round(frac * 100)}%`; this.label.textContent = text; }

  /** Dissolvenza e rimozione. */
  done(): void { this.set(1, "Pronto"); this.el.classList.add("out"); setTimeout(() => this.el.remove(), 700); }
}
