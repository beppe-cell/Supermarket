# Architettura consigliata
- `src/core/`: Game (bootstrap), Engine factory (WebGPU→WebGL2), SceneManager, InputManager, AssetManager, EventBus, FixedTimestep, Logger.
- `src/game/systems/`: sistemi (movimento, combattimento, inventario) che operano su entità; ognuno con `update(dt)` e `dispose()`.
- `src/game/entities/`: entità = nodo Babylon + componenti dati.
- `src/game/ai/`, `audio/`, `ui/`, `levels/`, `data/` (JSON di bilanciamento).
- Dipendenze unidirezionali: game → core. core non importa game.
- Stati: Boot → Menu → Loading → Playing → Paused → GameOver (SceneManager).
- Salvataggi: localStorage/IndexedDB con versione schema.
