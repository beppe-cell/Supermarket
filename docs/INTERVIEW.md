# Intervista Art Director — risposte

## A. Identità del gioco (risposto)
- Genere: horror/survival horror + action/FPS + RPG/action-RPG (ibrido)
- Ambientazione: interno di un supermercato
- Atmosfera: cupa e inquietante; realistica e quotidiana; misteriosa/contemplativa
- Pubblico: adulti / core gamer
- Riferimenti: da raccogliere

## B. Gameplay (risposto)
- Prospettiva: prima persona
- Combattimento: armi da fuoco con munizioni scarse; armi improvvisate da supermercato; abilità e potenziamenti RPG (stealth non scelto)
- Struttura: un unico supermercato esplorabile a zone
- Sistemi: inventario a slot; crafting con oggetti del supermercato; salute + sanità mentale; quest/obiettivi e note narrative

## C. Direzione artistica (risposto)
- Stile: realistico cinematografico
- Tono orrore: realistico quotidiano
- Palette: rosso sangue su grigio freddo
- Riferimenti: nessuno preciso (proposte da fare in fase documenti, soggette ad approvazione)

## D. Personaggi e nemici (risposto)
- Nemici: umani infetti (ex clienti e dipendenti) + altri giocatori in PvP (IMPLICA MULTIPLAYER: da chiarire, vedi sotto)
- Varianti prima versione: 3-4 tipi
- Dettaglio: mid-poly con normal map baked da sculpt (~10-20k tri, texture 1K-2K, LOD)
- Braccia/armi in prima persona: molto curate
- PvP (D5): prima single-player, PvP in fase successiva; codice predisposto (stato di gioco serializzabile, input astratto)

## E. Ambientazioni (risposto)
- Dimensione: ipermercato / centro commerciale (RISCHIO mobile: richiede streaming a zone, LOD pesanti, occlusion; da valutare nel TDD)
- Interattività: prodotti raccoglibili; porte/casse/frigoriferi apribili; oggetti fisici (carrelli, cartoni). Distruttibilità: no
- Luci: neon che sfarfallano; torcia giocatore principale; luci d'emergenza rosse; nebbia volumetrica leggera

## F. Grafica e tecnologia (risposto)
- API: WebGL2 base + WebGPU opzionale
- Profili qualità: 3 automatici (Alto PC / Medio / Basso mobile) + scelta manuale
- Post-FX: grana+vignettatura, bloom, aberrazione cromatica/distorsione (sanità mentale), SSAO/SSR (solo profilo alto)
- Target: PC 60 fps, mobile 30 fps

## G. Piattaforme (risposto)
- PC (Chrome/Edge/Firefox), Android (Chrome), iOS (Safari). Tablet non richiesto esplicitamente
- Controlli: tastiera+mouse (pointer lock), touch con joystick virtuali. Gamepad e giroscopio non richiesti

## H. Audio (risposto)
- Colonna sonora ambient/drone dinamica; audio ambientale (frigoriferi, neon, musica da negozio distorta); audio spaziale 3D. Niente doppiaggio
- Fonte: CC0 + sintesi procedurale

## I. Produzione (risposto)
- Portata: vertical slice di 1-2 zone rifinite, poi espansione
- Priorità n.1: atmosfera e qualità visiva
- Risorse: l'Art Director fornirà alcuni asset (formato/licenze da definire) + produzione Blender/CC0

## L. Pubblicazione (risposto)
- Hosting: alternativo gratuito (Cloudflare Pages / Netlify). GitHub Pages non selezionato
- Salvataggi: non selezionato → proposta default: IndexedDB locale (da confermare)
