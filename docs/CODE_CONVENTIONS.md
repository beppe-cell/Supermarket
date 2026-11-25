# Convenzioni di codice
- TypeScript `strict`, ES modules, niente `any`, niente default export (tranne config).
- File `kebab-case.ts`; classi `PascalCase`; funzioni/variabili `camelCase`; costanti `UPPER_SNAKE`.
- Una responsabilità per modulo; dipendenze: game → core, mai il contrario.
- Nessuna allocazione nel ciclo di update; `dispose()` per ogni risorsa.
- Commenti solo per il "perché". Test vitest accanto alla logica pura (`*.test.ts`).
- Commit: Conventional Commits (feat, fix, docs, chore, perf, test).
