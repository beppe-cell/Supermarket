# Registro asset di terze parti
Regola: ogni asset esterno ha autore, URL, licenza, data di verifica e uso. Licenze ammesse: CC0, CC-BY (attribuzione obbligatoria, anche in-game nei crediti).

| ID | Asset | Autore | URL | Licenza | Verificata | Facce originali | Stato |
|---|---|---|---|---|---|---|---|
| T01 | Supermarket Potato Chips Shelf Asset | Rendevr (https://sketchfab.com/Rendevr) | https://sketchfab.com/3d-models/supermarket-potato-chips-shelf-asset-4e4ccc3074f0474bbfa23611c46a4029 | CC-BY 4.0 | 2026-11-26 (API Sketchfab) | 41.006 | Da scaricare dall'Art Director |
| T02 | Supermarket Drinks Shelf Asset | Rendevr | https://sketchfab.com/Rendevr (uid 4f22309b…) | CC-BY 4.0 | 2026-11-26 (API Sketchfab) | 105.652 | Da scaricare dall'Art Director |
| T03 | Lowpoly Store/Supermarket Props (pack: frigoriferi, arredi, props) | AspectStudios (https://sketchfab.com/AspectStudio) | https://sketchfab.com/3d-models/lowpoly-storesupermarket-props-c0bd4a497dce4e77a62b905743f791fb | CC-BY 4.0 | 2026-11-26 (API Sketchfab) | 5.844 totali | Scaricato (`assets/source/third-party/aspectstudios/lowpoly_storesupermarket_props.glb`, originale intatto). Pulito con `tools/clean_props_pack.py` → `assets/exported/models/environment/props_pack_clean.glb` (18 pezzi, 2.2k tri, 1 materiale/texture 512px). In uso in Z1 come PLACEHOLDER (stile lowpoly a colori piatti ≠ look realistico approvato) |
| T04 | Food pack (prodotti: ~100 materiali, 117 oggetti, 654k tri, 41 MB) | Pasha (https://sketchfab.com/Pasha-) | https://sketchfab.com/3d-models/food-pack-195c0c0d23e14e4693c640b16734714c | CC-BY 4.0 (license.txt nel pacchetto) | 2026-11-26 | 653.994 | `assets/source/third-party/pasha/food_pack.zip`. NON in uso: troppo pesante e con marchi reali (Ruffles, Lay's, Hellmann's, ecc.) sulle etichette. Da ottimizzare e con etichette generiche |
| T05 | New Supermarket Trolley (carrello) | kreems (https://sketchfab.com/kreems) | https://sketchfab.com/3d-models/new-supermarket-trolley-34a2ea422c5f42b4b49081b3a8539e06 | CC-BY 4.0 | 2026-11-26 (metadati nel GLB) | 125.096 | `assets/source/third-party/trolleys/new_supermarket_trolley.glb`. Da semplificare (50k tri in un pezzo) |
| T06 | Supermarket Milk Trolley FREE (carrello a gabbia) | LordSamueliSolo / Lady Lion Studios (https://sketchfab.com/LadyLionStudios) | https://sketchfab.com/3d-models/supermarket-milk-trolley-free-ac3caa2ee7e44c7098304b7a2315070d | CC-BY 4.0 | 2026-11-26 (metadati nel GLB) | 36.992 | `assets/source/third-party/trolleys/supermarket_milk_trolley_free.glb`. Da semplificare |

## Non utilizzabili
Scena "Supermarket" di heng1210 (97e2e393…): non scaricabile, licenza Standard Sketchfab, 2,97M facce. Escluso (eventuale riferimento visivo senza file).
Altri modelli di Rendevr (Spider-Man, Ant-Man, Mech): personaggi di terzi con proprietà intellettuale / senza licenza esplicita, non scaricabili. Esclusi.

## Crediti obbligatori (schermata crediti)
"Supermarket Potato Chips Shelf Asset" e "Supermarket Drinks Shelf Asset" di Rendevr; "Food pack" di Pasha; "New Supermarket Trolley" di kreems; "Supermarket Milk Trolley FREE" di LordSamueliSolo (Lady Lion Studios); "Lowpoly Store/Supermarket Props" di AspectStudios; tutti CC BY 4.0, via Sketchfab. Eventuali modifiche (decimazione, retopo, texture) vanno dichiarate come "adattato".
