(() => {
  const ralInput = document.getElementById("ral-input");
  const mensilitaInput = document.getElementById("mensilita-input");
  const calcolaBtn = document.getElementById("calcola-btn");
  const errorEl = document.getElementById("error-message");
  const risultatiEl = document.getElementById("risultati");
  const nettoAnnualeEl = document.getElementById("netto-annuale");
  const nettoMensileEl = document.getElementById("netto-mensile");
  const mensilitaLabelEl = document.getElementById("mensilita-label");
  const breakdownEl = document.getElementById("breakdown");
  const totaleContributiEl = document.getElementById("totale-contributi");
  const totaleImposteEl = document.getElementById("totale-imposte");
  const bonusLabelEl = document.getElementById("bonus-label");
  const totaleBonusEl = document.getElementById("totale-bonus");
  const totaleTrattenuteEl = document.getElementById("totale-trattenute");
  const aliquotaEffettivaEl = document.getElementById("aliquota-effettiva");

  const formatEUR = (n) =>
    new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(n);
  const formatPercent = (n) =>
    new Intl.NumberFormat("it-IT", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n);

  // Blocco solo sui casi che manderebbero il calcolo in errore o darebbero
  // un risultato privo di senso; nessun blocco su valori insoliti ma plausibili.
  function validateRal(raw) {
    const trimmed = raw.trim();
    if (trimmed === "") {
      return { valid: false, message: "Inserisci un valore per la RAL." };
    }
    const n = Number(trimmed);
    if (Number.isNaN(n)) {
      return { valid: false, message: "Inserisci un valore numerico per la RAL." };
    }
    if (n <= 0) {
      return { valid: false, message: "La RAL deve essere un valore positivo." };
    }
    return { valid: true, value: n };
  }

  function showError(message) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }

  function hideError() {
    errorEl.hidden = true;
    errorEl.textContent = "";
  }

  const VOCI_BREAKDOWN = [
    { key: "contributiINPS", label: "Contributi INPS a carico dipendente (9,19%)", segno: "-" },
    { key: "imponibileIRPEF", label: "Imponibile IRPEF (RAL − INPS)", segno: "=" },
    { key: "irpefLorda", label: "IRPEF lorda", segno: "=" },
    { key: "detrazioni", label: "Detrazioni da lavoro dipendente (art. 13 TUIR)", segno: "-" },
    { key: "ulterioreDetrazioneCuneo", label: "Ulteriore detrazione cuneo fiscale (20.000-40.000€)", segno: "-" },
    { key: "irpefNetta", label: "IRPEF netta", segno: "-" },
    { key: "trattamentoIntegrativo", label: "Trattamento integrativo", segno: "+" },
    { key: "sommaNonImponibile20k", label: "Somma non imponibile (redditi ≤ 20.000€)", segno: "+" },
    { key: "addizionaleRegionale", label: "Addizionale regionale Lombardia", segno: "-" },
    { key: "addizionaleComunale", label: "Addizionale comunale Milano", segno: "-" },
  ];

  // Il numero di mensilità cambia solo come la RAL viene distribuita durante
  // l'anno (RAL già comprensiva di eventuali mensilità aggiuntive): non
  // incide sul calcolo annuale di INPS/IRPEF/addizionali, solo sul divisore
  // usato per il netto mensile.
  function getMensilita() {
    return Number(mensilitaInput.value);
  }

  let ultimaRalValida = null;

  // Aggregazioni di presentazione (non nuove regole fiscali: solo somme di
  // campi già calcolati da Calc.calcolaNetto). INPS è un contributo
  // previdenziale, non un'imposta: tenuto separato da IRPEF+addizionali.
  // I bonus (trattamento integrativo + somma non imponibile) sono mostrati
  // a parte anziché sottratti dalle imposte: per RAL basse possono superare
  // le imposte dovute, e un "totale imposte" negativo sarebbe fuorviante.
  function calcolaRiepilogo(r) {
    const totaleContributi = r.contributiINPS;
    const totaleImposte = r.irpefNetta + r.addizionaleRegionale + r.addizionaleComunale;
    const totaleBonus = r.trattamentoIntegrativo + r.sommaNonImponibile20k;
    const totaleTrattenute = totaleContributi + totaleImposte;
    const aliquotaEffettiva = (r.ral - r.nettoAnnuale) / r.ral;
    return { totaleContributi, totaleImposte, totaleBonus, totaleTrattenute, aliquotaEffettiva };
  }

  function renderRisultati(r, mensilita) {
    nettoAnnualeEl.textContent = formatEUR(r.nettoAnnuale);
    nettoMensileEl.textContent = formatEUR(r.nettoMensile);
    mensilitaLabelEl.textContent = `(${mensilita} mensilità)`;

    const rp = calcolaRiepilogo(r);
    totaleContributiEl.textContent = formatEUR(rp.totaleContributi);
    totaleImposteEl.textContent = formatEUR(rp.totaleImposte);
    totaleTrattenuteEl.textContent = formatEUR(rp.totaleTrattenute);
    aliquotaEffettivaEl.textContent = formatPercent(rp.aliquotaEffettiva);

    const mostraBonus = rp.totaleBonus > 0;
    bonusLabelEl.hidden = !mostraBonus;
    totaleBonusEl.hidden = !mostraBonus;
    if (mostraBonus) totaleBonusEl.textContent = `+ ${formatEUR(rp.totaleBonus)}`;

    breakdownEl.innerHTML = "";
    for (const voce of VOCI_BREAKDOWN) {
      const dt = document.createElement("dt");
      dt.textContent = voce.label;

      const dd = document.createElement("dd");
      const valore = r[voce.key];
      dd.textContent = `${voce.segno} ${formatEUR(valore)}`;
      if (voce.segno === "+") dd.classList.add("positivo");

      breakdownEl.append(dt, dd);
    }

    risultatiEl.hidden = false;
  }

  function calcolaEMostra(ral) {
    const mensilita = getMensilita();
    const rules = { ...Calc.RULES_2026, mensilita };
    renderRisultati(Calc.calcolaNetto(ral, rules), mensilita);
  }

  function resetRisultati() {
    nettoAnnualeEl.textContent = "—";
    nettoMensileEl.textContent = "—";
    risultatiEl.hidden = true;
  }

  function onCalcola() {
    const { valid, value, message } = validateRal(ralInput.value);
    if (!valid) {
      showError(message);
      resetRisultati();
      ultimaRalValida = null;
      return;
    }
    hideError();
    ultimaRalValida = value;
    calcolaEMostra(value);
  }

  calcolaBtn.addEventListener("click", onCalcola);
  ralInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") onCalcola();
  });
  // Se un risultato è già a video, cambiare mensilità lo ricalcola subito
  // senza dover ricliccare "Calcola".
  mensilitaInput.addEventListener("change", () => {
    if (ultimaRalValida !== null) calcolaEMostra(ultimaRalValida);
  });
})();
