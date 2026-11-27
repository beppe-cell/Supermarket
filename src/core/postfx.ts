import { DefaultRenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/defaultRenderingPipeline";
import { SSAO2RenderingPipeline } from "@babylonjs/core/PostProcesses/RenderPipeline/Pipelines/ssao2RenderingPipeline";
import "@babylonjs/core/PostProcesses/RenderPipeline/postProcessRenderPipelineManagerSceneComponent";
import "@babylonjs/core/Rendering/prePassRendererSceneComponent";
import "@babylonjs/core/Rendering/geometryBufferRendererSceneComponent";
import { Color4 } from "@babylonjs/core/Maths/math.color";
import type { Camera } from "@babylonjs/core/Cameras/camera";
import type { Scene } from "@babylonjs/core/scene";
import type { QualityProfile } from "./quality";

export interface PostFx {
  /** 0..1: sanità mentale bassa → più aberrazione cromatica e vignettatura (hook per il sistema di sanità). */
  setStress(v: number): void;
}

/** Post-processing del look C secondo il profilo: grana, vignettatura, bloom sui neon, aberrazione cromatica, SSAO (solo PC alto). */
export function createPostFx(scene: Scene, camera: Camera, q: QualityProfile, touch: boolean): PostFx {
  const pp = q.postProcess;
  const pipe = new DefaultRenderingPipeline("default", !touch, scene, [camera]);
  pipe.samples = touch || q.id !== "high" ? 1 : 4;
  pipe.fxaaEnabled = pipe.samples === 1;

  // Nitidezza: sul telefono (FXAA e risoluzione ridotta ammorbidiscono) si ripassa un leggero sharpen
  pipe.sharpenEnabled = touch; if (touch) { pipe.sharpen.edgeAmount = 0.4; pipe.sharpen.colorAmount = 1; }

  pipe.bloomEnabled = pp.bloom;
  pipe.bloomThreshold = 0.85; pipe.bloomWeight = 0.45; pipe.bloomKernel = 48; pipe.bloomScale = touch ? 0.35 : 0.5;

  pipe.grainEnabled = pp.grain;
  pipe.grain.intensity = touch ? 6 : 9; pipe.grain.animated = true;

  pipe.chromaticAberrationEnabled = pp.chromatic;
  pipe.chromaticAberration.aberrationAmount = 6; pipe.chromaticAberration.radialIntensity = 0.9;

  pipe.imageProcessingEnabled = true;
  const ip = pipe.imageProcessing;
  ip.vignetteEnabled = true; ip.vignetteWeight = 2.2; ip.vignetteStretch = 0.4; ip.vignetteColor = new Color4(0, 0, 0, 0); ip.vignetteBlendMode = 0;
  ip.toneMappingEnabled = true; ip.toneMappingType = 1; // ACES
  ip.exposure = 1.3; ip.contrast = 1.1;

  if (pp.ssao && !touch) {
    const ssao = new SSAO2RenderingPipeline("ssao", scene, { ssaoRatio: 0.5, blurRatio: 1 }, [camera]);
    ssao.radius = 1.4; ssao.totalStrength = 0.9; ssao.expensiveBlur = false; ssao.samples = 12; ssao.maxZ = 40;
  }

  return {
    setStress(v: number): void {
      const s = Math.min(1, Math.max(0, v));
      if (pp.chromatic) pipe.chromaticAberration.aberrationAmount = 6 + 40 * s;
      ip.vignetteWeight = 2.2 + 3 * s;
    },
  };
}
