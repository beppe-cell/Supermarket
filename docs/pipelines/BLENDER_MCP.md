# Blender via MCP — protocollo

## Setup (PC dell'Art Director, Windows)
- Add-on: `uvx mcp-for-blender install-addon` (audit 2026-11-25: MIT, nessun codice offuscato; telemetria dei contenuti off di default).
- Claude Code locale: `claude mcp add blender -- uvx mcp-for-blender`, lanciato dentro la cartella `supermarket`.
- Blender 5.3: Preferences → Add-ons → "Interface: MCP for Blender" attivo; pannello `N` → BlenderMCP → Start MCP Server (porta 9876).
- Non attivare integrazioni a pagamento/con chiave (Meshy, Tripo, Hyper3D, Sketchfab) senza approvazione.

## Collegamento tra sessioni
- Le sessioni cloud non raggiungono `localhost` del PC. Il lavoro in Blender lo esegue la **sessione locale** (desktop app, cartella `supermarket`), che ha il tool `blender`.
- La sessione cloud (Game Director) le invia i compiti con `send_message` e legge l'esito con `list_events`. Trovare l'ID con `list_sessions` (origin `desktop_app`, titolo tipo "Cilindro en Blender"); gli ID cambiano se la sessione locale viene ricreata.
- Condizioni: PC acceso, app Claude aperta, Blender aperto con server MCP avviato.

## Regole per i compiti Blender
1. Un passaggio piccolo per messaggio; salvare un `.blend` (copia) tra un passaggio e l'altro in `assets/source/blender/<categoria>/`.
2. Mai cancellare contenuto della scena senza richiesta esplicita.
3. Ogni asset: skill `blender-*`, QA con `blender-asset-qa`, export GLB in `assets/exported/models/`.
4. La sessione locale risponde con: cosa ha fatto, file prodotti, esito dei controlli, screenshot/render se richiesto.
5. Commit/push: li fa una sola sessione alla volta (di norma la cloud), dopo `git pull`.
