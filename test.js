/**
 * Casi di riferimento calcolati manualmente e in modo indipendente da calc.js
 * (per evitare circolarità: i valori attesi NON sono ottenuti chiamando Calc).
 * Vedi il piano/README per il dettaglio del calcolo a mano di ciascun caso.
 */
const casiDiTest = [
  {
    ral: 18000,
    atteso: { nettoAnnuale: 16221.31, nettoMensile: 1247.79 },
    note: "somma non imponibile (comma 4, 4,8%); trattamento integrativo assente (nessuna incapienza)",
  },
  {
    ral: 25000,
    atteso: { nettoAnnuale: 20569.65, nettoMensile: 1582.28 },
    note: "ulteriore detrazione cuneo fiscale piena (1.000€)",
  },
  {
    ral: 35000,
    atteso: { nettoAnnuale: 25967.22, nettoMensile: 1997.48 },
    note: "ulteriore detrazione cuneo fiscale piena (RC appena sotto 32.000)",
  },
  {
    ral: 60000,
    atteso: { nettoAnnuale: 37575.22, nettoMensile: 2890.40 },
    note: "nessuna detrazione aggiuntiva, RC oltre tutte le soglie",
  },
];

function assertClose(actual, expected, msg, epsilon = 0.05) {
  const ok = Math.abs(actual - expected) < epsilon;
  console.assert(ok, `${msg}: atteso ${expected}, ottenuto ${actual}`);
  return ok;
}

// Verifica che il riepilogo contributi/imposte/bonus mostrato in pagina
// (calcolato in app.js a partire dai campi di Calc.calcolaNetto) sia
// internamente coerente con il netto già validato sopra, cioè che
// RAL - nettoAnnuale = totaleTrattenute - totaleBonus.
function assertRiepilogoCoerente(r, ral, msg) {
  const totaleContributi = r.contributiINPS;
  const totaleImposte = r.irpefNetta + r.addizionaleRegionale + r.addizionaleComunale;
  const totaleBonus = r.trattamentoIntegrativo + r.sommaNonImponibile20k;
  const totaleTrattenute = totaleContributi + totaleImposte;
  return assertClose(ral - r.nettoAnnuale, totaleTrattenute - totaleBonus, msg);
}

function eseguiTest() {
  return casiDiTest.map(({ ral, atteso, note }) => {
    const r = Calc.calcolaNetto(ral);
    const okAnnuale = assertClose(r.nettoAnnuale, atteso.nettoAnnuale, `netto annuale RAL ${ral}`);
    const okMensile = assertClose(r.nettoMensile, atteso.nettoMensile, `netto mensile RAL ${ral}`);
    const okRiepilogo = assertRiepilogoCoerente(r, ral, `riepilogo trattenute/bonus RAL ${ral}`);
    return { ral, note, atteso, ottenuto: r, pass: okAnnuale && okMensile && okRiepilogo };
  });
}

function renderTestOutput(risultati) {
  const container = document.getElementById("test-output");
  container.innerHTML = "";

  const ul = document.createElement("ul");
  for (const { ral, note, atteso, ottenuto, pass } of risultati) {
    const li = document.createElement("li");
    li.className = pass ? "pass" : "fail";
    li.textContent =
      `${pass ? "PASS" : "FAIL"} — RAL ${ral.toLocaleString("it-IT")}€: ` +
      `atteso netto annuale ${atteso.nettoAnnuale.toFixed(2)}€ / mensile ${atteso.nettoMensile.toFixed(2)}€, ` +
      `ottenuto ${ottenuto.nettoAnnuale.toFixed(2)}€ / ${ottenuto.nettoMensile.toFixed(2)}€ (${note})`;
    ul.append(li);
  }
  container.append(ul);

  const tutteOk = risultati.every((r) => r.pass);
  const summary = document.getElementById("test-summary");
  summary.textContent = tutteOk
    ? `Tutti i ${risultati.length} casi PASS.`
    : `Attenzione: ${risultati.filter((r) => !r.pass).length} caso/i FAIL su ${risultati.length}.`;
  summary.className = tutteOk ? "pass" : "fail";
}

document.addEventListener("DOMContentLoaded", () => {
  renderTestOutput(eseguiTest());
});
