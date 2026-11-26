# 0005 — Nemico androide rimosso (Art Director, 2026-11-26)
L'androide fornito (modello, rig, animazioni create dallo studio, IA) è stato cancellato dal progetto e dai file di gioco.
Rimosso: `SM_Android.glb`, sorgente `assets/source/third-party/enemy/`, `tools/prep_android.py`, `src/game/enemies/`, voce T11 del registro asset.
Mantenuto (generico, riusabile): navigazione A* e percezione (`src/game/ai`), `Damageable` (`src/game/combat`), danno/morte del giocatore, effetti di sparo e suoni.
Nota: il file resta nella cronologia git dei commit precedenti (non riscritta).
Prossimo nemico: da decidere (GDD prevede infetti umani).
