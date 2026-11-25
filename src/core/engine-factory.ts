import { Engine } from "@babylonjs/core/Engines/engine";
import { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine";

export interface EngineOptions {
  /** WebGPU solo se richiesto (es. `?gpu=1`) e supportato; la base è WebGL2. */
  preferWebGPU: boolean;
}

export async function createEngine(
  canvas: HTMLCanvasElement,
  opts: EngineOptions = { preferWebGPU: false },
): Promise<Engine | WebGPUEngine> {
  if (opts.preferWebGPU && (await WebGPUEngine.IsSupportedAsync)) {
    const gpu = new WebGPUEngine(canvas, { antialias: true });
    await gpu.initAsync();
    return gpu;
  }
  return new Engine(canvas, true, { adaptToDeviceRatio: false, powerPreference: "high-performance" });
}
