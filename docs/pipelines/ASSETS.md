# Pipeline asset (Blender → Babylon.js)
1. Sorgente `.blend` in `assets/source/blender/<categoria>/`.
2. Lavoro con skill `blender-*` via `bpy` headless (`.venv-blender`).
3. QA con `blender-asset-qa`; ottimizzazione con `blender-game-optimization`.
4. Export GLB (`blender-export-pipelines`) in `assets/exported/models/`: scala 1 unità = 1 m, Y-up, materiali PBR (metallic-roughness), nomi clip animazione standard.
5. Post-process (Technical Artist): gltf-transform (Draco/meshopt, KTX2, dedup, prune).
6. Validazione: budget triangoli/texture da TDD. Registro asset in `docs/design/ASSET_REGISTRY.md` con licenza.
Pipeline specializzate (character/environment/animation) estendono questo file in `docs/pipelines/`.
