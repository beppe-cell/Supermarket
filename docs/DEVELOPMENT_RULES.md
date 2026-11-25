# Regole di sviluppo
1. Branch di lavoro `claude/*`; commit piccoli e descrittivi; mai force-push.
2. Una milestone alla volta; non si passa avanti con bug critici aperti.
3. Dati di bilanciamento in JSON (`src/game/data`), mai hardcoded.
4. Nessuna dipendenza nuova senza motivazione, licenza OSS verificata e voce in `docs/decisions/`.
5. Asset: sorgenti in `assets/source`, export in `assets/exported`; ogni asset ha licenza/provenienza.
6. Prestazioni: budget in TDD; ogni milestone riporta fps/draw call/memoria su PC e profilo mobile emulato.
7. Documentazione aggiornata a ogni milestone: PROJECT_STATUS, decisioni, asset completati, problemi aperti.
8. Sicurezza: nessun segreto nel repo; script esterni esaminati prima di essere eseguiti.
