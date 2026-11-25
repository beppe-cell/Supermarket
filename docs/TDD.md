# Technical Design Document — BOZZA PER APPROVAZIONE

## Stack
TypeScript strict, Babylon.js (WebGL2 + WebGPU opzionale), Vite, Havok, vitest, Playwright. Blender 5.3 headless via `bpy` (PyPI).

## Rischi principali
1. Ipermercato su mobile (iOS): memoria ~1-1.5 GB utile, WebGL2, assenza WebGPU. Mitigazione: vertical slice, streaming a zone con caricamento/scaricamento, occlusion, texture KTX2, luci baked, profili qualità.
2. Nebbia volumetrica e SSR/SSAO: solo profilo alto.
3. Fisica Havok su mobile: limitare i corpi dinamici attivi.
4. Peso download: budget iniziale ≤ 80 MB per zona (compressi), caricamento progressivo.

## Budget (da validare con profilazione)
| Voce | Alto PC | Medio | Basso mobile |
|---|---|---|---|
| Triangoli in vista | 1.5M | 700k | 250k |
| Draw call | 1500 | 700 | 250 |
| Texture max | 4K (key) / 2K | 2K / 1K | 1K / 512 |
| Luci dinamiche | 6 | 3 | 1 (torcia) |
| Ombre | torcia + 2 | torcia | nessuna/blob |
| Nemici attivi | 16 | 10 | 6 |
| Target fps | 60 | 60 | 30 |

## Architettura
core (engine factory, SceneManager, InputManager, AssetManager, Quality, FixedTimestep, SaveManager) · game/systems · ai (behavior tree/utility, navmesh Recast) · audio (Babylon Audio, bus mixer) · ui (DOM overlay + GUI) · levels (zone streaming) · data (JSON). Stato di gioco serializzabile (predisposizione PvP/salvataggi).

## Asset
Pipeline Blender → GLB → gltf-transform (meshopt/Draco, KTX2) → validazione. LOD obbligatori per nemici e props grandi. Texture atlas e istanze per prodotti sugli scaffali (thin instances).

## Test e CI
Unit (vitest), e2e (Playwright Chromium swiftshader), metriche fps/draw call per milestone, emulazione mobile. Deploy: Cloudflare Pages o Netlify (da configurare con il tuo account; nessun costo).

## Hosting e salvataggi
Cloudflare Pages/Netlify. Salvataggi IndexedDB versionati.
