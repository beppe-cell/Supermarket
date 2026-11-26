/** Impostazioni utente persistenti (localStorage, con fallback se non disponibile). */
export interface Settings { lookSens: number; volume: number; invertY: boolean }
const KEY = "supermarket.settings.v1";
export const DEFAULTS: Settings = { lookSens: 1, volume: 0.8, invertY: false };

export function clampSettings(s: Partial<Settings>): Settings {
  const num = (v: unknown, d: number, lo: number, hi: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d);
  return { lookSens: num(s.lookSens, DEFAULTS.lookSens, 0.4, 3), volume: num(s.volume, DEFAULTS.volume, 0, 1), invertY: s.invertY === true };
}
export function loadSettings(): Settings {
  try { const raw = localStorage.getItem(KEY); if (raw) return clampSettings(JSON.parse(raw) as Partial<Settings>); } catch { /* ignora */ }
  return { ...DEFAULTS };
}
export function saveSettings(s: Settings): void { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* ignora */ } }
