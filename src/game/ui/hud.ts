/** HUD DOM minimale: mirino, stamina, prompt interazione, messaggi, inventario rapido. */
export class Hud {
  private readonly root = document.createElement("div");
  private readonly prompt = document.createElement("div");
  private readonly msg = document.createElement("div");
  private readonly bar = document.createElement("div");
  private readonly inv = document.createElement("div");
  private msgTimer = 0;

  constructor(parent: HTMLElement = document.body) {
    this.root.style.cssText = "position:fixed;inset:0;pointer-events:none;font:14px system-ui,sans-serif;color:#dfeee6";
    const cross = document.createElement("div");
    cross.style.cssText = "position:absolute;left:50%;top:50%;width:4px;height:4px;margin:-2px;border-radius:50%;background:#ffffffaa";
    this.prompt.style.cssText = "position:absolute;left:0;right:0;top:56%;text-align:center;text-shadow:0 1px 3px #000";
    this.msg.style.cssText = "position:absolute;left:0;right:0;top:12%;text-align:center;text-shadow:0 1px 3px #000;opacity:0;transition:opacity .4s";
    const wrap = document.createElement("div");
    wrap.style.cssText = "position:absolute;left:16px;bottom:20px;width:140px;height:6px;background:#00000066;border-radius:3px;overflow:hidden";
    this.bar.style.cssText = "height:100%;width:100%;background:#9fd2b8";
    wrap.appendChild(this.bar);
    this.inv.style.cssText = "position:absolute;right:16px;top:30px;text-align:right;font-size:12px;text-shadow:0 1px 3px #000;white-space:pre";
    this.root.append(cross, this.prompt, this.msg, wrap, this.inv);
    parent.appendChild(this.root);
  }

  setPrompt(text: string): void { this.prompt.textContent = text; }
  setStamina(ratio: number): void { this.bar.style.width = `${Math.round(ratio * 100)}%`; this.bar.style.background = ratio < 0.25 ? "#c0282d" : "#9fd2b8"; }
  setInventory(items: string[]): void { this.inv.textContent = items.length ? `Zaino\n${items.join("\n")}` : ""; }

  message(text: string): void {
    this.msg.textContent = text;
    this.msg.style.opacity = "1";
    clearTimeout(this.msgTimer);
    this.msgTimer = window.setTimeout(() => { this.msg.style.opacity = "0"; }, 2600);
  }
}
