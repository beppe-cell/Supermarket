# Task per agente (iniziali, priorità e dipendenze)
- game-director: pianifica milestone, aggiorna PROJECT_STATUS, gate (continuo, P0).
- lead-programmer: M0 core/input/quality/save (P0); integrazione sistemi (P0). Dip.: TDD approvato.
- technical-artist: tools di export/validazione, KTX2/meshopt, profili qualità grafici, catalogazione asset AD (P0, M0-M2).
- environment-artist: A01-A07, A11 (P0, M1-M2). Dip.: blockout level-designer.
- level-designer: blockout Z1 e Z2 (P0, M1/M6). Dip.: GDD.
- character-artist: A08-A10 (P0, M3-M4). Dip.: design approvato.
- animation-specialist: set animazioni player/infetti (P0, M3-M4). Dip.: rig.
- ai-programmer: percezione, behavior tree, navmesh (P0, M4). Dip.: nemici, level.
- game-designer: bilanciamento dati, ricette, abilità, quest (P0/P1, M3-M5).
- sound-designer: audio list (P0, M4-M6).
- ui-ux-designer: HUD, inventario, menu, touch controls (P0, M1/M5).
- qa-engineer: test per milestone, matrice dispositivi, fps (continuo).
Regola: file di proprietà separati (`.claude/agents/*`).
