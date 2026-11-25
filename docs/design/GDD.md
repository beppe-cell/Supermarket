# Game Design Document — "SUPERMARKET" (titolo di lavoro) — BOZZA PER APPROVAZIONE

## 1. Visione
Survival horror in prima persona con combattimento FPS e progressione RPG, ambientato in un ipermercato dopo un'epidemia. Orrore realistico e quotidiano: il luogo più banale diventa una trappola. Pubblico: adulti/core gamer. Piattaforme: PC, Android, iOS (browser). Fase PvP: successiva.

## 2. Pilastri
1. Atmosfera prima di tutto (luce, suono, spazio).
2. Risorse scarse: ogni proiettile e ogni slot contano.
3. Il supermercato è lo strumento: oggetti quotidiani come armi, crafting e nascondigli.
4. Paura leggibile: il giocatore capisce sempre perché muore.

## 3. Gameplay loop
Esplora zona → raccogli risorse/note → crafting/gestione inventario → affronta o evita infetti → completa obiettivo di zona → sblocca zona successiva → potenzia abilità.

## 4. Meccaniche (priorità P0 = vertical slice)
| ID | Meccanica | P | Criterio di completamento |
|---|---|---|---|
| M1 | Movimento FPS (camminata, corsa con stamina, accovacciata) PC+touch | P0 | 60/30 fps, nessun clip con geometria |
| M2 | Armi da fuoco, munizioni scarse, ricarica, rinculo | P0 | 2 armi giocabili, TTK bilanciato |
| M3 | Armi improvvisate (mazza, estintore, coltello), durabilità | P0 | 3 armi con feedback |
| M4 | Inventario a slot + peso/slot limitati | P0 | UI usabile con mouse e touch |
| M5 | Crafting con oggetti del supermercato | P0 | ≥8 ricette |
| M6 | Salute + Sanità mentale (buio, nemici → effetti visivi/audio) | P0 | effetti legati al profilo qualità |
| M7 | Interazioni (raccogliere, porte, casse, frigoriferi) | P0 | raggio interazione + prompt |
| M8 | Oggetti fisici (carrelli, cartoni) | P1 | Havok, costo CPU misurato su mobile |
| M9 | Quest/obiettivi e note narrative | P0 | diario con ≥6 note |
| M10 | Abilità RPG (albero semplice, 3 rami) | P1 | ≥9 abilità |
| M11 | Salvataggio (IndexedDB, versionato) | P0 | save/load senza perdita |
| M12 | Stealth | — | NON richiesto (scartato) |
| M13 | Distruttibilità | — | NON richiesta |

## 5. Nemici (vertical slice)
3-4 tipi di infetti: Cliente (lento, resistente), Dipendente (medio, attacco), Corridore (veloce, fragile), Gigante/Boss di zona (1). Percezione: vista (cono) + udito (rumore dei passi/spari). Dettagli in AI Systems/TDD.

## 6. Progressione e difficoltà
Zone sbloccate con chiavi/obiettivi. Difficoltà media-alta da core gamer; 3 livelli selezionabili (da approvare). Ricompense: risorse, note, punti abilità.

## 7. Mondo
Ipermercato a zone (vedi Environment List). Vertical slice: Zona 1 "Sala vendita – Alimentari" + Zona 2 "Magazzino/celle frigo".

## 8. Fuori portata iniziale
PvP/multiplayer, gamepad, doppiaggio, distruttibilità, stealth dedicato.

## 9. Punti aperti per l'Art Director
- Titolo definitivo, trama di base, durata sessione, livelli di difficoltà, salvataggio (IndexedDB proposto).
