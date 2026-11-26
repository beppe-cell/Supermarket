export type QualityId = "high" | "medium" | "low";

export interface QualityProfile {
  id: QualityId;
  /** 1 = risoluzione nativa; >1 riduce la risoluzione di render. */
  hardwareScaling: number;
  shadows: boolean;
  postProcess: { grain: boolean; bloom: boolean; chromatic: boolean; ssao: boolean; ssr: boolean };
  volumetricFog: boolean;
  maxDynamicLights: number;
  maxActiveEnemies: number;
  targetFps: number;
  maxTextureSize: number;
  /** Frazione di slot degli scaffali occupata da prodotti (scaffali "saccheggiati": è anche scelta di stile). */
  productDensity: number;
}

export const QUALITY_PROFILES: Record<QualityId, QualityProfile> = {
  high: {
    id: "high", hardwareScaling: 1, shadows: true,
    postProcess: { grain: true, bloom: true, chromatic: true, ssao: true, ssr: true },
    volumetricFog: true, maxDynamicLights: 6, maxActiveEnemies: 16, targetFps: 60, maxTextureSize: 4096, productDensity: 0.3,
  },
  medium: {
    id: "medium", hardwareScaling: 1.25, shadows: true,
    postProcess: { grain: true, bloom: true, chromatic: true, ssao: false, ssr: false },
    volumetricFog: false, maxDynamicLights: 3, maxActiveEnemies: 10, targetFps: 60, maxTextureSize: 2048, productDensity: 0.18,
  },
  low: {
    id: "low", hardwareScaling: 1.75, shadows: false,
    postProcess: { grain: true, bloom: false, chromatic: false, ssao: false, ssr: false },
    volumetricFog: false, maxDynamicLights: 1, maxActiveEnemies: 6, targetFps: 30, maxTextureSize: 1024, productDensity: 0.08,
  },
};

export interface DeviceInfo {
  isTouch: boolean;
  deviceMemoryGb: number | undefined;
  cores: number;
  maxTextureSize: number;
  isIos: boolean;
}

/** Scelta iniziale del profilo (pura, testabile). Il benchmark runtime può correggerla. */
export function detectQuality(d: DeviceInfo): QualityId {
  if (d.isTouch || d.isIos) return d.cores >= 8 && (d.deviceMemoryGb ?? 4) >= 6 ? "medium" : "low";
  if (d.cores >= 8 && d.maxTextureSize >= 8192) return "high";
  return "medium";
}

export function readDeviceInfo(gl?: { maxTextureSize: number }): DeviceInfo {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const ua = nav.userAgent;
  return {
    isTouch: matchMedia("(pointer: coarse)").matches,
    deviceMemoryGb: nav.deviceMemory,
    cores: nav.hardwareConcurrency || 4,
    maxTextureSize: gl?.maxTextureSize ?? 4096,
    isIos: /iPad|iPhone|iPod/.test(ua) || (ua.includes("Mac") && nav.maxTouchPoints > 1),
  };
}

/** Scalatura dinamica: ritorna il nuovo hardwareScaling dato l'fps medio. */
export function adaptScaling(current: number, avgFps: number, targetFps: number, min = 1, max = 3): number {
  if (avgFps < targetFps * 0.85) return Math.min(max, +(current + 0.25).toFixed(2));
  if (avgFps > targetFps * 1.1 && current > min) return Math.max(min, +(current - 0.25).toFixed(2));
  return current;
}
