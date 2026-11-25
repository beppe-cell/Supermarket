# AI Game Studio
Framework riutilizzabile per sviluppare giochi 3D da browser con Babylon.js + TypeScript + Vite, con asset prodotti in Blender (headless via `bpy`) e un team di subagent Claude Code.

## Struttura
`.claude/agents` team · `.claude/skills` skill · `docs/` GDD/TDD/pipeline/decisioni · `src/core` motore riusabile · `src/game` gioco specifico · `assets/` sorgenti ed export · `tools/` script · `tests/`.

## Comandi
`npm install` · `npm run dev` · `npm run build` · `npm test` · `npm run typecheck`

## Riuso per nuovi giochi
Copia la repo, svuota `src/game`, `assets/` e `docs/design`, rifai l'intervista.
