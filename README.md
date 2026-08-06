# Calcolatore RAL → Netto — prototipo (Product Builder exercise, JetHR)

Prototipo che, data una RAL (retribuzione annua lorda), calcola e mostra lo stipendio netto annuale e mensile, con il dettaglio di tutte le trattenute e agevolazioni applicate.

## Caso standard modellato

- Dipendente **a tempo indeterminato**, full-time, per l'intero anno.
- Residenza fiscale a **Milano** (Lombardia).
- **Nessuna agevolazione** fiscale/contributiva particolare, nessun altro reddito, nessun carico di famiglia.
- Anno fiscale **2026**.

Ogni altra semplificazione è dichiarata esplicitamente più sotto e nel pannello "Assunzioni e semplificazioni" della pagina.

## Come eseguirlo

Nessuna build, nessuna dipendenza. Basta aprire `index.html` con un doppio click (funziona anche direttamente da `file://`), oppure servirlo con un qualsiasi hosting statico (GitHub Pages, Netlify, ecc.).

Per i test: apri `test.html` allo stesso modo — mostra a video una lista PASS/FAIL.

## Come si arriva dal netto

Tutta la logica di calcolo vive in [`calc.js`](calc.js), come funzioni pure indipendenti dal DOM (nessun riferimento alla pagina). `app.js` si occupa solo di leggere l'input, validarlo, chiamare `Calc.calcolaNetto(ral)` e mostrare il risultato.

Il calcolo procede così (i nomi tra parentesi sono le funzioni in `calc.js`):

1. **Contributi INPS a carico dipendente** — 9,19% flat sulla RAL (`calcolaContributiINPS`).
2. **Imponibile IRPEF** = RAL − contributi INPS (`calcolaImponibileIRPEF`).
3. **IRPEF lorda** — scaglioni progressivi: 23% fino a 28.000€, 33% da 28.000€ a 50.000€, 43% oltre (`calcolaIRPEFLorda`, `calcolaImportoAScaglioni`).
4. **Detrazioni da lavoro dipendente** (art. 13 TUIR) — funzione decrescente del reddito, azzerata oltre 50.000€ (`calcolaDetrazioniLavoroDipendente`).
5. **Ulteriore detrazione cuneo fiscale** per redditi 20.000-40.000€ — 1.000€ flat fino a 32.000€, poi decrescente fino a 40.000€ (`calcolaUlterioreDetrazioneCuneo`).
6. **IRPEF netta** = max(0, IRPEF lorda − detrazioni − ulteriore detrazione) (`calcolaIRPEFNetta`).
7. **Trattamento integrativo** — si aggiunge al netto (non è una trattenuta); pieno per redditi ≤15.000€, decrescente fino a 28.000€, ridotto di 75€ dal 2025 (`calcolaTrattamentoIntegrativo`).
8. **Somma non imponibile** per redditi ≤20.000€ — percentuale (7,1%/5,3%/4,8%) applicata alla RAL, si aggiunge al netto (`calcolaSommaNonImponibile20k`).
9. **Addizionale regionale Lombardia** — scaglioni da 1,23% a 1,73% (`calcolaAddizionaleRegionale`).
10. **Addizionale comunale Milano** — 0,8% flat sull'intero imponibile, ma solo se questo supera 23.000€ (soglia secca, non a scaglioni) (`calcolaAddizionaleComunale`).
11. **Netto annuale** = RAL − INPS − IRPEF netta − addizionale regionale − addizionale comunale + trattamento integrativo + somma non imponibile.
12. **Netto mensile** = Netto annuale / N, dove N è il numero di mensilità selezionato in pagina (12/13/14, default 13). La RAL si assume già comprensiva di eventuali mensilità aggiuntive: cambiare N cambia solo come viene distribuita nell'anno, non il calcolo annuale.

### Riepilogo contributi/imposte e aliquota effettiva

Oltre al dettaglio riga per riga, la pagina mostra un riepilogo (calcolato in `app.js`, non una nuova regola fiscale — solo un'aggregazione dei campi sopra):

- **Contributi previdenziali** = contributi INPS (punto 1). Non sono tecnicamente una tassa: sono trattenuti ma finanziano la futura pensione del lavoratore.
- **Imposte** = IRPEF netta + addizionale regionale + addizionale comunale (punti 6, 9, 10) — questa è la risposta a "quanto sono le tasse che deve pagare".
- **Totale trattenute** = contributi + imposte.
- **Bonus e agevolazioni in busta paga** = trattamento integrativo + somma non imponibile (punti 7, 8), mostrati separatamente e non sottratti dalle imposte: per redditi bassi possono superare le imposte dovute, e un "totale imposte" negativo sarebbe fuorviante da leggere.
- **Aliquota effettiva** = (RAL − netto annuale) / RAL, cioè la quota di RAL che non arriva in tasca. Coincide per costruzione con (totale trattenute − bonus) / RAL.

## Fonti primarie

Le regole fiscali sono state verificate solo su fonti ufficiali (non su siti divulgativi generici):

- **IRPEF (scaglioni e detrazioni art. 13 TUIR)** — Legge 30 dicembre 2024, n. 207 (Legge di Bilancio 2025), art. 1, comma 2. [normattiva.it](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2024-12-30;207). Riduzione del secondo scaglione dal 35% al 33% confermata dalla Legge di Bilancio 2026 (L. 199/2025) — [mef.gov.it](https://www.mef.gov.it/focus/Principali-misure-della-legge-di-bilancio-2026/).
- **Somma non imponibile per redditi ≤20.000€** — L. 207/2024, art. 1, comma 4 (testo esatto citato nei commenti di `calc.js`). [normattiva.it](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:legge:2024-12-30;207).
- **Ulteriore detrazione cuneo fiscale (20.000-40.000€)** — L. 207/2024, art. 1, comma 6; continuità 2026 confermata da [mef.gov.it](https://www.mef.gov.it/focus/Principali-misure-della-legge-di-bilancio-2026/).
- **Trattamento integrativo** — D.L. 5 febbraio 2020, n. 3, art. 1 ([normattiva.it](https://www.normattiva.it/uri-res/N2Ls?urn:nir:stato:decreto-legge:2020-02-05;3)), ridotto di 75€ da L. 207/2024, art. 1, comma 3.
- **Addizionale regionale Lombardia** — pagina ufficiale [regione.lombardia.it](https://www.regione.lombardia.it/bollo-auto-e-tributi-regionali/red-addizionale-regionale-irpef) (L.R. Lombardia 10/2003, art. 72).
- **Addizionale comunale Milano** — [comune.milano.it](https://servizicrm.comune.milano.it/centro-supporto/KA-01934/Aliquota-addizionale-comunale-IRPEF) e relativo [regolamento comunale](https://www.comune.milano.it/documents/20126/200621592/Regolamento+per+l%27applicazione+dell%27Addizionale+Comunale+all%27Imposta+sul+Reddito+delle+Persone+Fisiche.pdf).
- **Contributi INPS (9,19%)** — confermato indirettamente dal Ministero del Lavoro: la riduzione contributiva temporanea 2022-2024 non è stata rinnovata dalla Legge di Bilancio 2025, quindi dal 2025 si torna all'aliquota piena. [lavoro.gov.it](https://www.lavoro.gov.it/notizie/pagine/legge-di-bilancio-2025-le-misure-lavoratori-imprese-e-famiglie). Non è stato possibile estrarre come testo i PDF ufficiali INPS (tabelle aliquote contributive) con gli strumenti a disposizione: confidenza alta ma non da testo primario diretto.

## Assunzioni e semplificazioni

**Applicate ma con una scelta di modellazione esplicita:**
- La "somma non imponibile" per redditi ≤20.000€ (punto 8) è per legge una riduzione della base imponibile IRPEF ("non concorre alla formazione del reddito"), con potenziali effetti a cascata sulle addizionali. Nel prototipo è invece modellata come addizione diretta al netto (come il trattamento integrativo): la ricostruzione esatta dell'ordine di calcolo base-per-base non era verificabile con sicurezza dalle fonti disponibili, e l'effetto economico differisce dalla modellazione "corretta" solo in casi limite (a cavallo di una soglia). **Punto volutamente segnalato per discussione.**
- "Reddito di lavoro dipendente" (base della somma non imponibile) è approssimato con la RAL, coerente con l'assunzione di nessun altro reddito/beneficio.
- Periodo di lavoro nell'anno assunto sempre pieno (365/365).

**Escluse (fuori scope):**
- Nessun massimale contributivo INPS né aliquota aggiuntiva IVS dell'1% (rilevanti solo per RAL molto alte o per lavoratori con anzianità contributiva ante 1996 — non lo standard per un dipendente assunto oggi).
- Nessuna detrazione per carichi di famiglia o altri oneri deducibili/detraibili (spese mediche, mutuo, ecc.).
- Nessuna variazione per part-time, altri CCNL, altre regioni o comuni.
- TFR escluso dal netto (è retribuzione differita, non liquidità periodica).
- Mensilità distribuite in modo uniforme (indipendentemente dal numero selezionato); non modellata la reale tempistica di erogazione/conguaglio in busta paga (es. tredicesima erogata a dicembre, conguaglio di fine anno).

## Test

`test.js` confronta l'output di `calc.js` con 4 casi di riferimento (RAL 18.000 / 25.000 / 35.000 / 60.000€) calcolati **a mano, in modo indipendente** dal codice — per evitare che il test validi solo se stesso. I casi sono scelti per coprire le diverse combinazioni di regole attive (soglia dei 20.000€, soglia dei 32.000€, nessuna agevolazione). Apri `test.html` per vedere l'esito.

## Struttura dei file

```
index.html   pagina principale: form input + risultati + pannello assunzioni
style.css    stile
calc.js      logica di calcolo pura (nessun riferimento al DOM)
app.js       wiring: input → validazione → Calc.calcolaNetto → rendering DOM
test.html    pagina di test
test.js      casi di test e asserzioni
```

## Limiti noti

Questo è un prototipo per un caso standard, non un motore di calcolo certificato per buste paga reali. Non copre part-time, altre regioni/comuni, altri CCNL, agevolazioni (under 30, donne, rientro dei cervelli, ecc.), carichi di famiglia, o altre voci fuori dallo scope dichiarato sopra.
