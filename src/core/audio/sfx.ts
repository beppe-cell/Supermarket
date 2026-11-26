/** Effetti sonori sintetizzati con WebAudio (nessun asset, nessuna licenza). Si attiva al primo input dell'utente. */
export class Sfx {
  private ctx: AudioContext | undefined;
  private master: GainNode | undefined;
  private noiseBuf: AudioBuffer | undefined;

  private vol = 0.8;
  setVolume(v: number): void { this.vol = v; if (this.master) this.master.gain.value = 0.9 * v; }

  /** Da chiamare in un gestore di input (i browser richiedono un gesto). */
  resume(): void {
    try {
      if (!this.ctx) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!AC) return;
        this.ctx = new AC();
        this.master = this.ctx.createGain(); this.master.gain.value = 0.9 * this.vol; this.master.connect(this.ctx.destination);
        const n = this.ctx.sampleRate; this.noiseBuf = this.ctx.createBuffer(1, n, n);
        const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      }
      void this.ctx.resume();
    } catch { /* audio non disponibile */ }
  }

  private noise(dur: number, filter: BiquadFilterType, f0: number, f1: number, gain: number, out: AudioNode, pan = 0, delay = 0): void {
    const c = this.ctx; if (!c || !this.noiseBuf) return;
    const t = c.currentTime + delay, src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = filter; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    const p = c.createStereoPanner?.(); src.connect(f).connect(g);
    if (p) { p.pan.value = pan; g.connect(p).connect(out); } else g.connect(out);
    src.start(t, Math.random()); src.stop(t + dur + 0.05);
  }
  private tone(type: OscillatorType, f0: number, f1: number, dur: number, gain: number, out: AudioNode, pan = 0, delay = 0): void {
    const c = this.ctx; if (!c) return;
    const t = c.currentTime + delay, o = c.createOscillator(); o.type = type;
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    const p = c.createStereoPanner?.(); o.connect(g);
    if (p) { p.pan.value = pan; g.connect(p).connect(out); } else g.connect(out);
    o.start(t); o.stop(t + dur + 0.05);
  }
  private out(): AudioNode | undefined { return this.master; }

  /** Sparo: scoppio di rumore filtrato + colpo grave + coda. */
  gunshot(): void {
    const o = this.out(); if (!o) return;
    this.noise(0.22, "lowpass", 5200, 400, 1.0, o); this.noise(0.05, "highpass", 2500, 2500, 0.7, o);
    this.tone("sine", 180, 45, 0.16, 0.9, o); this.noise(0.9, "bandpass", 900, 250, 0.12, o, 0, 0.04);
  }
  dryFire(): void { const o = this.out(); if (o) { this.tone("square", 1800, 900, 0.03, 0.25, o); this.noise(0.03, "highpass", 3000, 3000, 0.2, o); } }
  reload(): void {
    const o = this.out(); if (!o) return;
    this.noise(0.05, "bandpass", 1800, 1500, 0.5, o); this.tone("square", 900, 500, 0.05, 0.2, o);          // caricatore fuori
    this.noise(0.07, "bandpass", 1200, 900, 0.55, o, 0, 0.9); this.tone("square", 600, 300, 0.06, 0.25, o, 0, 0.9); // dentro
    this.noise(0.04, "highpass", 2600, 2600, 0.5, o, 0, 1.35); this.tone("square", 1400, 700, 0.04, 0.3, o, 0, 1.35); // carrello
  }
  /** Colpo andato a segno su un bersaglio metallico: ping. */
  metalHit(pan = 0): void { const o = this.out(); if (!o) return; this.tone("triangle", 1900, 1200, 0.18, 0.35, o, pan); this.noise(0.08, "bandpass", 3500, 2500, 0.4, o, pan); }
  /** Carrello colpito: fracasso metallico di tubi e ruote. */
  rattle(dist: number): void {
    const o = this.out(); if (!o) return; const v = Math.max(0.15, 1 - dist / 25);
    this.noise(0.35, "bandpass", 3200, 1800, 0.5 * v, o); this.tone("triangle", 2300, 900, 0.22, 0.25 * v, o); this.tone("triangle", 1500, 700, 0.3, 0.2 * v, o, 0, 0.05); this.noise(0.5, "bandpass", 900, 500, 0.18 * v, o, 0, 0.08);
  }
  /** Urto di un oggetto mobile contro muro/scaffale; `speed` in m/s. */
  clank(speed: number, dist: number): void {
    const o = this.out(); if (!o) return; const v = Math.min(1, speed / 3) * Math.max(0.1, 1 - dist / 22); if (v < 0.05) return;
    this.tone("square", 220, 90, 0.12, 0.35 * v, o); this.noise(0.14, "bandpass", 1500, 600, 0.45 * v, o);
  }
  impact(): void { const o = this.out(); if (o) this.noise(0.08, "lowpass", 1800, 300, 0.4, o); }
  /** Passo metallico di un nemico con attenuazione per distanza e panning. */
  step(dist: number, pan: number): void {
    const o = this.out(); if (!o) return; const v = Math.max(0, 1 - dist / 22); if (v <= 0.02) return;
    this.tone("square", 140, 60, 0.09, 0.35 * v, o, pan); this.noise(0.06, "lowpass", 1400, 300, 0.4 * v, o, pan);
  }
  growl(dist: number, pan: number): void {
    const o = this.out(); if (!o) return; const v = Math.max(0, 1 - dist / 28); if (v <= 0.02) return;
    this.tone("sawtooth", 95, 55, 0.7, 0.35 * v, o, pan); this.tone("square", 47, 30, 0.7, 0.3 * v, o, pan); this.noise(0.6, "bandpass", 600, 200, 0.15 * v, o, pan);
  }
  swing(dist: number, pan: number): void { const o = this.out(); if (!o) return; const v = Math.max(0, 1 - dist / 14); this.noise(0.2, "bandpass", 500, 1600, 0.4 * v, o, pan); }
  playerHurt(): void { const o = this.out(); if (!o) return; this.tone("sine", 120, 40, 0.25, 0.9, o); this.noise(0.18, "lowpass", 900, 200, 0.6, o); }
  death(dist: number, pan: number): void {
    const o = this.out(); if (!o) return; const v = Math.max(0.15, 1 - dist / 30);
    this.tone("sawtooth", 400, 40, 1.1, 0.4 * v, o, pan); this.noise(0.5, "lowpass", 3000, 200, 0.4 * v, o, pan); this.tone("square", 90, 35, 0.8, 0.3 * v, o, pan, 0.5);
  }
}
