/**
 * Calcolo netto da RAL — caso standard: dipendente a tempo indeterminato,
 * Milano, nessuna agevolazione. Anno fiscale 2026.
 *
 * Fonti primarie (vedi anche README.md):
 * - L. 30 dicembre 2024, n. 207 (Legge di Bilancio 2025), art. 1 — normattiva.it
 * - D.L. 5 febbraio 2020, n. 3, art. 1 (trattamento integrativo) — normattiva.it
 * - Regione Lombardia — addizionale regionale IRPEF
 * - Comune di Milano — regolamento addizionale comunale IRPEF
 *
 * Nessun arrotondamento intermedio: si arrotonda solo in fase di rendering (app.js).
 */
const Calc = (() => {
  const RULES_2026 = {
    inpsRate: 0.0919, // quota IVS a carico lavoratore, aliquota piena dal 2025

    irpefBrackets: [
      // L. 207/2024 art. 1 c.2, 2° scaglione ridotto al 33% dalla L.d.B. 2026
      { upTo: 28000, rate: 0.23 },
      { upTo: 50000, rate: 0.33 },
      { upTo: Infinity, rate: 0.43 },
    ],

    addizionaleRegionaleLombardiaBrackets: [
      // regione.lombardia.it, L.R. Lombardia 10/2003 art. 72
      { upTo: 15000, rate: 0.0123 },
      { upTo: 28000, rate: 0.0158 },
      { upTo: 50000, rate: 0.0172 },
      { upTo: Infinity, rate: 0.0173 },
    ],

    addizionaleComunaleMilano: {
      // comune.milano.it — soglia secca, non a scaglioni
      rate: 0.008,
      sogliaEsenzione: 23000,
    },

    sommaNonImponibile20k: {
      // L. 207/2024 art. 1 c.4 — soglia secca sulla percentuale, applicata a RAL
      sogliaReddito: 20000,
      scaglioni: [
        { upTo: 8500, rate: 0.071 },
        { upTo: 15000, rate: 0.053 },
        { upTo: Infinity, rate: 0.048 },
      ],
    },

    ulterioreDetrazioneCuneo: {
      // L. 207/2024 art. 1 c.6
      sogliaMin: 20000,
      pienoFinoA: 32000,
      sogliaMax: 40000,
      importoPieno: 1000,
    },

    trattamentoIntegrativo: {
      // D.L. 3/2020 art. 1, ridotto di 75€ da L. 207/2024 art. 1 c.3
      sogliaMin: 15000,
      sogliaMax: 28000,
      importoBase: 1200,
      riduzione: 75,
    },

    mensilita: 13,
  };

  // Scaglioni marginali/progressivi (IRPEF, addizionale regionale): ogni fascia
  // tassa solo la porzione di base che vi rientra.
  function calcolaImportoAScaglioni(base, scaglioni) {
    let imposta = 0;
    let sogliaPrec = 0;
    for (const s of scaglioni) {
      if (base <= sogliaPrec) break;
      imposta += (Math.min(base, s.upTo) - sogliaPrec) * s.rate;
      sogliaPrec = s.upTo;
    }
    return imposta;
  }

  function calcolaContributiINPS(ral, rules = RULES_2026) {
    return ral * rules.inpsRate;
  }

  function calcolaImponibileIRPEF(ral, contributiINPS) {
    return ral - contributiINPS;
  }

  function calcolaIRPEFLorda(rc, rules = RULES_2026) {
    return calcolaImportoAScaglioni(rc, rules.irpefBrackets);
  }

  // Art. 13 TUIR, come riscritto da L. 207/2024 art. 1 c.2
  function calcolaDetrazioniLavoroDipendente(rc) {
    if (rc <= 15000) return 1955;
    if (rc <= 28000) return 1910 + (1190 * (28000 - rc)) / 13000;
    if (rc <= 50000) return (1910 * (50000 - rc)) / 22000;
    return 0;
  }

  // L. 207/2024 art. 1 c.4 — soglia secca su reddito di lavoro dipendente
  // (approssimato con la RAL), attiva solo se RC <= 20.000.
  // Semplificazione dichiarata: modellata come addizione diretta al netto
  // anziché come riduzione della base imponibile IRPEF/addizionali (vedi README).
  function calcolaSommaNonImponibile20k(ral, rc, rules = RULES_2026) {
    const cfg = rules.sommaNonImponibile20k;
    if (rc > cfg.sogliaReddito) return 0;
    const scaglione = cfg.scaglioni.find((s) => ral <= s.upTo);
    return ral * scaglione.rate;
  }

  // L. 207/2024 art. 1 c.6
  function calcolaUlterioreDetrazioneCuneo(rc, rules = RULES_2026) {
    const cfg = rules.ulterioreDetrazioneCuneo;
    if (rc <= cfg.sogliaMin) return 0;
    if (rc <= cfg.pienoFinoA) return cfg.importoPieno;
    if (rc <= cfg.sogliaMax) {
      return (cfg.importoPieno * (cfg.sogliaMax - rc)) / (cfg.sogliaMax - cfg.pienoFinoA);
    }
    return 0;
  }

  function calcolaIRPEFNetta(irpefLorda, detrazioni, ulterioreDetrazione) {
    return Math.max(0, irpefLorda - detrazioni - ulterioreDetrazione);
  }

  // D.L. 3/2020 art. 1, ridotto di 75€ da L. 207/2024 art. 1 c.3.
  // Periodo di lavoro nell'anno assunto sempre pieno (365/365).
  function calcolaTrattamentoIntegrativo(rc, irpefLorda, detrazioni, rules = RULES_2026) {
    const cfg = rules.trattamentoIntegrativo;
    let base;
    if (rc <= cfg.sogliaMin) {
      base = cfg.importoBase;
    } else if (rc <= cfg.sogliaMax) {
      base = Math.min(cfg.importoBase, Math.max(0, detrazioni - irpefLorda));
    } else {
      base = 0;
    }
    return Math.max(0, base - cfg.riduzione);
  }

  function calcolaAddizionaleRegionale(rc, rules = RULES_2026) {
    return calcolaImportoAScaglioni(rc, rules.addizionaleRegionaleLombardiaBrackets);
  }

  // comune.milano.it — soglia secca sull'intero RC, non a scaglioni
  function calcolaAddizionaleComunale(rc, rules = RULES_2026) {
    const { rate, sogliaEsenzione } = rules.addizionaleComunaleMilano;
    return rc > sogliaEsenzione ? rc * rate : 0;
  }

  function calcolaNetto(ral, rules = RULES_2026) {
    if (!Number.isFinite(ral) || ral <= 0) {
      throw new Error("RAL non valida");
    }

    const contributiINPS = calcolaContributiINPS(ral, rules);
    const imponibileIRPEF = calcolaImponibileIRPEF(ral, contributiINPS);
    const irpefLorda = calcolaIRPEFLorda(imponibileIRPEF, rules);
    const detrazioni = calcolaDetrazioniLavoroDipendente(imponibileIRPEF);
    const ulterioreDetrazioneCuneo = calcolaUlterioreDetrazioneCuneo(imponibileIRPEF, rules);
    const irpefNetta = calcolaIRPEFNetta(irpefLorda, detrazioni, ulterioreDetrazioneCuneo);
    const trattamentoIntegrativo = calcolaTrattamentoIntegrativo(imponibileIRPEF, irpefLorda, detrazioni, rules);
    const sommaNonImponibile20k = calcolaSommaNonImponibile20k(ral, imponibileIRPEF, rules);
    const addizionaleRegionale = calcolaAddizionaleRegionale(imponibileIRPEF, rules);
    const addizionaleComunale = calcolaAddizionaleComunale(imponibileIRPEF, rules);

    const nettoAnnuale =
      ral -
      contributiINPS -
      irpefNetta -
      addizionaleRegionale -
      addizionaleComunale +
      trattamentoIntegrativo +
      sommaNonImponibile20k;

    const nettoMensile = nettoAnnuale / rules.mensilita;

    return {
      ral,
      contributiINPS,
      imponibileIRPEF,
      irpefLorda,
      detrazioni,
      ulterioreDetrazioneCuneo,
      irpefNetta,
      trattamentoIntegrativo,
      sommaNonImponibile20k,
      addizionaleRegionale,
      addizionaleComunale,
      nettoAnnuale,
      nettoMensile,
    };
  }

  return {
    RULES_2026,
    calcolaNetto,
    calcolaContributiINPS,
    calcolaImponibileIRPEF,
    calcolaIRPEFLorda,
    calcolaDetrazioniLavoroDipendente,
    calcolaSommaNonImponibile20k,
    calcolaUlterioreDetrazioneCuneo,
    calcolaIRPEFNetta,
    calcolaTrattamentoIntegrativo,
    calcolaAddizionaleRegionale,
    calcolaAddizionaleComunale,
    calcolaImportoAScaglioni,
  };
})();
