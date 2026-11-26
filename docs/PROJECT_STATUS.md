# Stato progetto
- Fase corrente: 8 — M2 in corso: look C approvato (decisione 0002); asset SM_Shelf_Unit in attesa (Blender non connesso)
- Framework: creato (Fase 5)
- Gioco: sviluppo avviato (documenti approvati 2026-11-25)
## Decisioni approvate
(nessuna)
## Problemi aperti
- Blender GUI/binario ufficiale non scaricabile (download.blender.org bloccato dal proxy): si usa `bpy` PyPI.

## M0 — Fondazioni (completata 2026-11-25)
- Fatto: engine factory (WebGL2 base, WebGPU con `?gpu=1`), FixedTimestep, profili qualità (high/medium/low, auto + `?quality=`), scaling dinamico, InputManager (tastiera+mouse pointer lock, touch con joystick virtuale/mira/pulsanti), camera FPS minimale, scena di test con thin instances, HUD fps.
- Test: 11 unit (vitest) verdi; smoke e2e Playwright (`npm run e2e`) OK su desktop e Pixel 7 emulato, 0 errori console. Build OK.
- Limiti noti: fps misurati in software rendering (non significativi); nessuna collisione/stamina (M1); test su dispositivi reali iOS/Android ancora da fare.
- Prossimo: M1 greybox Z1 (level-designer, lead-programmer, game-designer).

## M1 — Greybox Z1 "Sala vendita" (completata 2026-11-25)
- Fatto: dati livello in `src/game/levels/zone1.ts` (muri, 8 corsie scaffali, casse, frigoriferi, pilastri, 2 porte, 5 pickup, neon), builder con geometria unita per materiale e collisioni; player con corpo collidente, gravità, corsa con stamina, accovacciata, torcia (F); interazione a raggio ([E]) con porte e oggetti; chiave → porta magazzino; HUD (mirino, stamina, prompt, messaggi, zaino); neon con sfarfallio entro il budget luci del profilo.
- Test: 20 unit (stamina, dati livello, fixed timestep, qualità) + e2e smoke (desktop/mobile) + e2e gameplay (movimento, collisione muro, pickup) tutti OK.
- Da fare/limiti: greybox senza arte né materiali PBR; nessun combattimento/nemici; zona 2 non costruita; test su dispositivi reali (iOS/Android) e fps reali non misurati; porte scorrono in verticale (placeholder); inventario solo elenco.
- Prossimo: M2 pipeline asset + kit ambiente + look (richiede Blender via sessione locale e revisione artistica dell'Art Director).

## M2 — avanzamento (2026-11-26)
- Look C approvato (decisione 0002).
- Asset T03 (AspectStudios, CC-BY) importato e ripulito via bpy headless (`tools/clean_props_pack.py`); caricato in Z1 con istanze (scaffali 144, frigoriferi, banconi+casse, scatoloni); i box grigi restano come collisioni invisibili.
- ATTENZIONE: lo stile del pack (lowpoly, colori piatti arancio/rosso) non corrisponde al look realistico approvato → placeholder; serve ri-texturing PBR in Blender o sostituzione. Decisione dell'Art Director.
- Scaffali: sostituiti con SM_Shelf_Unit originale (tools/make_shelf.py: 3.5k tri + LOD1 1k tri, PBR, texture baked sporco), schiena contro schiena, blocchi da 1.1 m a passo 4.4 m (corsie libere 3.3 m). Scritte di scelta look rimosse dal gioco.
- Aperti: SM_Shelf_Unit da zero (in coda alla sessione locale, Blender non connesso); scaffali senza prodotti; post-processing look C; bordo cono torcia.
- Prodotti (2026-11-26): 16 tipi propri con etichette INVENTATE (atlas `assets/source/labels_atlas.png`), thin instances, densità per profilo (0.3/0.18/0.08), ripiani in parte vuoti ("saccheggiati"). Carrelli T05/T06 (CC-BY) decimati a 7k/9k tri (`tools/prep_trolleys.py`) e piazzati con collisione semplice. Food pack T04 non usato.
- Materiali (2026-11-26): PBR ripetibili generati con `tools/make_textures.py` (pavimento a piastrelle 0.5 m, intonaco sporco, soffitto a pannelli 0.6 m; albedo+normale+ORM) in `assets/exported/textures/`; UV in coordinate mondo (scala reale). Palette dei props AspectStudios desaturata al look C. Da fare: materiali per frigoriferi/banconi/casse (ancora lowpoly), decal sporco/sangue, riflessi (environment).
- Pavimento (2026-11-26): texture dell'Art Director (zellige smaltate, set 1K) convertita (`tools/convert_floor_texture.py`), tile 3 m = piastrelle ~30 cm. LICENZA/FONTE DA CONFERMARE prima di pubblicare (T07 nel registro).
- Pareti e metallo scaffali (2026-11-26): texture dell'Art Director (RammedEarth018, MetalGalvanizedSteelWorn001), convertite (`tools/convert_wall_metal_textures.py`); SM_Shelf_Unit rigenerato con acciaio zincato a scala reale (UV cube 0.8 m); metallic attenuato a 0.35 finché mancano i riflessi (mappa ambiente). Licenze T07-T09 da confermare prima di pubblicare.
- Qualità su telefono (2026-11-26): default "high" su touch/iOS con obiettivo 30 fps e risoluzione dinamica (parte a 1.0x = pixel CSS, può salire fino a 1.5x DPR se c'è margine, scende fino a 3x). Sharpen leggero su telefono. Override: `#low|#medium|#high` o `?quality=`. Da validare su dispositivi reali.
- Scaffali a due metalli (2026-11-26): base = acciaio zincato consumato (texture AD, T09) su montanti, ripiani, labbri, staffe, pannello; accenti = acciaio verniciato grigio sporco procedurale (`shelfpaint_*`, ex materiale "vecchio") su insegna, cappello, zoccolo, base e guide; etichette prezzo bianche.
- Riflessi e post-processing (2026-11-26): mappa ambiente procedurale (`src/core/environment.ts`, nessun asset, prefiltro HDR a runtime, 32 px PC / 16 px mobile) per riflessi PBR; pipeline post (`src/core/postfx.ts`): bloom sui neon, grana, vignettatura, tone mapping ACES, aberrazione cromatica (PC), SSAO2 (solo PC alto), MSAA 4x (solo PC alto) / FXAA; su telefono: bloom+grana+vignettatura, niente SSAO/SSR/aberrazione. Hook `setStress()` per la sanità mentale. SSR non ancora implementato. Disattivabili con `?env=0` / `?fx=0` per debug.

## M3/M4 anticipati — combattimento, nemico, UI (2026-11-26)
- Pistola: viewmodel (sway, bob, rinculo, ricarica, abbassamento in corsa), hitscan con dispersione, 15 colpi + riserva, effetti procedurali (lampo + luce, fumo, bossolo, scintille, traccianti, fori) e suoni sintetizzati WebAudio (nessun asset).
- Androide: ~20k tri, 67 ossa, 4 animazioni create in Blender (Idle/Walk/Attack/Death); IA: pattuglia, vista con cono e linea di vista, udito degli spari, inseguimento con A* su griglia 0.5 m, attacco corpo a corpo, morte; 3 hitbox (testa 60, torso 34, gambe 22 danni su 100 HP).
- Giocatore: vita 100, danno con indicatore direzionale, schermata di morte.
- Inventario a 12 slot (chiave, garze +25 HP, cibo +10 HP, batterie, alcol), munizioni raccoglibili, obiettivi (chiave → porta magazzino), schermata Zaino/Obiettivi/Diario/Impostazioni (sensibilità, volume, asse Y), pausa a inventario aperto.
- HUD rifatto: vitali, arma/munizioni con avvisi, mirino dinamico, hit marker, prompt, toast, obiettivo, vignetta a vita bassa. Comandi touch: joystick flottante con corsa spingendo al massimo, pulsanti con icone (fuoco, usa, ricarica, abbassa, torcia, zaino), vibrazione, anti-zoom.
- Test: 37 unit (A*, percezione, inventario, obiettivi, impostazioni, qualità…), e2e smoke/gameplay OK.
- Limiti: nessun test su dispositivi reali; il nemico non attraversa le porte; effetti di sparo non verificati visivamente a fps reali; orientamento del modello androide non calibrato (FACING_OFFSET); nessun salvataggio.
