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
