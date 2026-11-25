import { Engine } from "@babylonjs/core/Engines/engine";
import { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine";

/** Crea WebGPU se supportato, altrimenti WebGL2/WebGL. */
export async function createEngine(canvas: HTMLCanvasElement): Promise<Engine | WebGPUEngine> {
  if (await WebGPUEngine.IsSupportedAsync) {
    const gpu = new WebGPUEngine(canvas, { antialias: true });
    await gpu.initAsync();
    return gpu;
  }
  return new Engine(canvas, true, { adaptToDeviceRatio: true });
}
