/** Varianti di look (PROPOSTE per l'Art Director, selezionabili con ?look=a|b|c). Nessuna è definitiva. */
export interface LookPreset {
  id: "a" | "b" | "c";
  name: string;
  ambient: number;
  ambientDiffuse: [number, number, number];
  fogDensity: number;
  fogColor: [number, number, number];
  clear: [number, number, number];
  neonColor: string;
  neonLightColor: [number, number, number];
  neonIntensity: number;
  emergencyIntensity: number;
  torchIntensity: number;
  floor: string;
  wall: string;
  shelf: string;
  ceiling: string;
}

export const LOOKS: Record<LookPreset["id"], LookPreset> = {
  a: {
    id: "a", name: "A — Clinico freddo (neon verde-bianco, rosso raro)",
    ambient: 0.32, ambientDiffuse: [0.6, 0.78, 0.72], fogDensity: 0.02, fogColor: [0.05, 0.07, 0.065], clear: [0.02, 0.03, 0.03],
    neonColor: "#e2fff0", neonLightColor: [0.75, 1, 0.9], neonIntensity: 0.6, emergencyIntensity: 0.35, torchIntensity: 1.4,
    floor: "#444b4a", wall: "#6b7573", shelf: "#7a8583", ceiling: "#2f3534",
  },
  b: {
    id: "b", name: "B — Quasi blackout (torcia protagonista, emergenza rossa)",
    ambient: 0.08, ambientDiffuse: [0.45, 0.5, 0.58], fogDensity: 0.04, fogColor: [0.02, 0.02, 0.03], clear: [0.01, 0.01, 0.015],
    neonColor: "#8a2a2a", neonLightColor: [1, 0.2, 0.18], neonIntensity: 0.25, emergencyIntensity: 1.0, torchIntensity: 2.2,
    floor: "#2c3035", wall: "#454b52", shelf: "#555c64", ceiling: "#1c1f23",
  },
  c: {
    id: "c", name: "C — Grigio freddo e sangue (neon bianco gelido, accenti rossi diffusi)",
    ambient: 0.09, ambientDiffuse: [0.55, 0.6, 0.72], fogDensity: 0.04, fogColor: [0.03, 0.03, 0.045], clear: [0.012, 0.012, 0.02],
    neonColor: "#b8c2d8", neonLightColor: [0.82, 0.88, 1], neonIntensity: 0.26, emergencyIntensity: 0, torchIntensity: 3.4,
    floor: "#3b3e45", wall: "#5b6068", shelf: "#6b7079", ceiling: "#25282d",
  },
};

export function pickLook(id: string | null): LookPreset {
  return LOOKS[(id === "a" || id === "b" ? id : "c") as LookPreset["id"]];
}
