# Performance PC e mobile
- Target iniziale: PC 60 fps, mobile 30-60 fps (da fissare nel TDD con l'Art Director).
- Draw call: unire/istanziare; materiali condivisi; atlas texture.
- Triangoli: LOD (`mesh.addLODLevel`), occlusion/frustum culling, `freezeWorldMatrix`.
- Texture: KTX2 (Basis) su GPU, mipmap, risoluzione per profilo qualità.
- Post-processing: usare `DefaultRenderingPipeline` con profili (alto/medio/basso); FXAA su mobile, MSAA su PC.
- Ombre: risoluzione 1024-2048, `useBlurExponentialShadowMap` o CSM solo su qualità alta.
- Profili qualità auto-selezionati da benchmark di 3 secondi + scaling dinamico.
- Memoria: limita texture totali (<~256 MB mobile), `dispose` al cambio livello.
- iOS Safari: WebGPU non garantito; WebGL2 come fallback obbligatorio; gestire perdita contesto.
