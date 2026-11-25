# Stato progetto
- Fase corrente: 8 — sviluppo, milestone M0 (fondazioni) in corso
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
