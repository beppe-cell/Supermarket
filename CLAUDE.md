# CLAUDE.md — AI Game Studio

Utente = ART DIRECTOR (ultima parola creativa). Claude = GAME DIRECTOR (coordinamento tecnico). Stack: Babylon.js + TypeScript + Vite, asset in Blender, deploy browser (PC + smartphone).

## Stato corrente
Vedi `docs/PROJECT_STATUS.md`. Regola assoluta: NON sviluppare il gioco finché intervista (docs/INTERVIEW.md) e documenti non sono approvati dall'Art Director.

## Regole
1. Decisioni artistiche significative → chiedere approvazione. Documentarle in `docs/decisions/`.
2. Solo strumenti gratuiti/open source. Nessun servizio a pagamento senza permesso.
3. Nessuna modifica a configurazioni globali (`~/.claude`) senza permesso. Le skill sono a livello progetto in `.claude/skills/`.
4. Ogni agente modifica solo i propri file (vedi `.claude/agents/*.md`, sezione "File di proprietà").
5. Convenzioni: `docs/CODE_CONVENTIONS.md`; regole: `docs/DEVELOPMENT_RULES.md`; asset: `docs/pipelines/ASSETS.md`.
6. Prima di chiudere task: `npm run typecheck && npm run build && npm test`.

## Agenti (subagent reali, `.claude/agents/`)
game-director, lead-programmer, character-artist, environment-artist, game-designer, ai-programmer, level-designer, animation-specialist, sound-designer, ui-ux-designer, qa-engineer, technical-artist.
Il Game Director (sessione principale) li avvia con il tool Agent. Task paralleli solo su file disgiunti.

## Skill (`.claude/skills/`)
`babylon-game-development` (locale), 28 `blender-*` (EL4CTEO/blender-skills, MIT), skill disciplina da awesome-gamedev-agent-skills (Apache-2.0): game-ai, ai-behavior-trees-utility-ai, audio-design, camera-systems, dialogue-systems, game-feel, game-ui-ux, input-systems, level-design, performance-optimization, physics-tuning, procedural-gen, save-systems, shader-programming, create-game-assets, fps-shooter, game-docs, prototype-fast. Dettagli: `docs/skills/SKILLS.md`.
Le skill engine-specifiche di quel repo (Godot, Unity, three.js…) NON sono installate: il motore è Babylon.js.

## Blender
Headless via `.venv-blender` (pacchetto PyPI `bpy`, non versionato). Script: `.venv-blender/bin/python script.py`. Vedi `docs/pipelines/ASSETS.md`.
