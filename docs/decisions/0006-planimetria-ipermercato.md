# 0006 — Planimetria dell'ipermercato (richiesta dell'Art Director, 2026-11-27)

**Richiesta:** planimetria complessa, area promo all'ingresso, tutte le corsie, molte casse con cassa centrale.

**Decisione:** Z1 passa da 40×30 m a 64×48 m (dati in `src/game/levels/zone1.ts`, un solo punto di verità).
- **Sud:** ingresso centrale (6 m, bloccato) con bussola; **area promo** con 11 isole di cartoni/pallet (`ZONE1.promo`) e striscione "PROMOZIONI".
- **Casse:** due file da 9 corsie (18 casse, pitch 2.5 m) ai lati della **cassa centrale** (banco 8×3.6 m con cabina a vetri e striscione), passaggi da 2.5 m.
- **Sala vendita:** 13 corsie (x multipli di 4.4 m, 3.3 m libere) in tre fasce: sud (6 m), nord (10 m), retro (4 m), divise da corsie trasversali; 12+12+11 blocchi di scaffali, pilastri sulle corsie trasversali.
- **Perimetro:** ortofrutta a ovest (7 banchi di casse), banco frigo a nord (13 frigoriferi a vetri), corridoio e **porta del magazzino** a est (serve la chiave elettronica).
- **Spawn** in area promo, davanti al corridoio tra casse e cassa centrale; 5 s di tregua iniziale.
- **Nemici:** 3 (PC alta), 2 (media/touch), 1 (bassa), con pattuglie sulle corsie.

**Costi:** ~380 unità di scaffale (da 208). Mitigazioni: istanze congelate, LOD scaffali a 14 m, prodotti a thin instance, decoro unito per materiale, isole con una sola collisione.

**Da verificare dall'AD:** proporzioni delle corsie, posizione della cassa centrale, fps su telefono.
