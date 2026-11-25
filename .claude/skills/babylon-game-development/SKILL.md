---
name: babylon-game-development
description: Sviluppo professionale di giochi 3D con Babylon.js + TypeScript + Vite per browser PC/mobile. Usare per scene, caricamento GLB, FPS/third-person controller, fisica e collisioni, luci PBR, shader, ottimizzazione WebGL/WebGPU, animazioni, GUI di gioco, audio, input touch e build.
---

# babylon-game-development

Skill locale (nessuna skill Babylon.js affidabile trovata nei repository verificati). Consulta `references/` per i dettagli. Verifica sempre le API sulla documentazione ufficiale (doc.babylonjs.com) prima di usare funzioni poco comuni: non inventare API.

## Principi
1. Import ES modules da `@babylonjs/core` (tree-shaking). Mai il bundle `babylonjs` monolitico.
2. Un `Engine` (o `WebGPUEngine` con fallback a WebGL2), una `Scene` per stato di gioco, `engine.runRenderLoop`.
3. Logica di gioco a passo fisso (accumulatore) separata dal render; niente allocazioni per frame (riusa `Vector3`).
4. Asset: solo GLB ottimizzati da `assets/exported/`; caricamento con `SceneLoader`/`LoadAssetContainerAsync`, compressione Draco/meshopt + KTX2.
5. Luci/materiali: `PBRMaterial`, IBL (`.env`) invece di molte luci; massimo 4 luci dinamiche; ombre solo da 1 luce (CSM o cascaded se serve).
6. Mobile: `engine.setHardwareScalingLevel`, scaling adattivo guidato da fps, `SceneOptimizer`, istanze/thin instances, freeze di materiali e mesh statiche, texture <= 2048 (1024 su mobile).
7. Fisica: Havok (`@babylonjs/havok`). Collisioni semplici del controller: `checkCollisions` + ellipsoid; geometria di collisione dedicata e semplificata.
8. Input: astrazione `InputManager` (tastiera/mouse/pointer lock, touch con joystick virtuali, gamepad). Mai leggere input sparso nei sistemi.
9. UI: Babylon GUI (`@babylonjs/gui`) per HUD in-world; DOM overlay per menu e accessibilità.
10. Test: logica pura testabile con vitest senza motore; rendering con Playwright + Chromium (swiftshader).

## Checklist per ogni feature
- Tipi strict, nessun `any`.
- `dispose()` di tutto ciò che crea (mesh, materiali, texture, observer).
- Misura prima di ottimizzare: `scene.debugLayer`/Inspector, `EngineInstrumentation`, `SceneInstrumentation`.
- Aggiorna `docs/PROJECT_STATUS.md`.

Riferimenti: `references/architecture.md`, `references/performance-mobile.md`.
