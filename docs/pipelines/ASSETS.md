# Pipeline asset (Blender → Babylon.js)
1. Sorgente `.blend` in `assets/source/blender/<categoria>/`.
2. Lavoro con skill `blender-*` via `bpy` headless (`.venv-blender`).
3. QA con `blender-asset-qa`; ottimizzazione con `blender-game-optimization`.
4. Export GLB (`blender-export-pipelines`) in `assets/exported/models/`: scala 1 unità = 1 m, Y-up, materiali PBR (metallic-roughness), nomi clip animazione standard.
5. Post-process (Technical Artist): gltf-transform (Draco/meshopt, KTX2, dedup, prune).
6. Validazione: budget triangoli/texture da TDD. Registro asset in `docs/design/ASSET_REGISTRY.md` con licenza.
Pipeline specializzate (character/environment/animation) estendono questo file in `docs/pipelines/`.

## Script (headless, `.venv-blender/bin/python`)
- `tools/clean_props_pack.py` — pack AspectStudios → pezzi con origine alla base, larghezza su X.
- `tools/make_shelf.py` — scaffale originale con LOD1 e texture baked.
- `tools/make_label_atlas.py` (python di sistema, PIL) + `tools/make_products.py` — prodotti con etichette inventate.
- `tools/prep_trolleys.py` — carrelli: scala, decimazione, texture ridotte.
Convenzione: fronte -Y (Blender) = +Z glTF; le istanze Babylon compensano il nodo radice (vedi `Props.spawn`).
