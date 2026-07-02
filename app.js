const LESIONI = {
  "Fratture Osteoarticolari": {
    "Femore (Trattamento chirurgico)": { lieve: 12, media: 16, importante: 22, gravissima: 28 },
    "Femore (Trattamento conservativo)": { lieve: 8, media: 14, importante: 18, gravissima: 24 },
    "Bacino": { lieve: 8, media: 14, importante: 20, gravissima: 30 },
    "Tibia/Perone (Chirurgico)": { lieve: 6, media: 10, importante: 15, gravissima: 20 },
    "Tibia/Perone (Conservativo)": { lieve: 4, media: 8, importante: 12, gravissima: 16 },
    "Polso/Mano (Dominante)": { lieve: 4, media: 7, importante: 11, gravissima: 16 },
    "Polso/Mano (Non Dominante)": { lieve: 3, media: 5, importante: 9, gravissima: 13 },
    "Clavicola": { lieve: 2, media: 4, importante: 7, gravissima: 10 },
    "Coste (Multiple destrutturate)": { lieve: 4, media: 8, importante: 14, gravissima: 20 },
    "Vertebre (Somatiche)": { lieve: 6, media: 12, importante: 18, gravissima: 26 }
  },
  "Lacerazioni e Organi Interni": {
    "Trauma Cranico (Sindrome post-concussiva)": { lieve: 3, media: 8, importante: 15, gravissima: 25 },
    "Milza (Asportazione)": { lieve: 10, media: 12, importante: 15, gravissima: 18 },
    "Rene (Asportazione unilaterale)": { lieve: 12, media: 15, importante: 20, gravissima: 25 },
    "Vescica (Lesioni)": { lieve: 6, media: 12, importante: 16, gravissima: 22 },
    "Apparato Genitale (Disfunzione Erettile ecc.)": { lieve: 8, media: 15, importante: 20, gravissima: 30 },
    "Polmone / Torace": { lieve: 5, media: 12, importante: 18, gravissima: 25 },
    "Fegato / Intestino": { lieve: 5, media: 10, importante: 16, gravissima: 22 }
  },
  "Neurologiche e Periferiche": {
    "Deficit Motori (Monoparesi)": { lieve: 5, media: 12, importante: 22, gravissima: 35 },
    "Deficit Motori (Emiparesi)": { lieve: 25, media: 35, importante: 50, gravissima: 65 },
    "Lesione nervosa (Plesso brachiale)": { lieve: 10, media: 18, importante: 26, gravissima: 35 }
  },
  "Esiti Estetici / Cicatrici": {
    "Cicatrici Volto": { lieve: 2, media: 6, importante: 12, gravissima: 25 },
    "Cicatrici Tronco / Arti": { lieve: 1, media: 3, importante: 6, gravissima: 10 },
    "Limitazioni funzionali generiche": { lieve: 2, media: 5, importante: 9, gravissima: 15 }
  }
};

let totalePuntiGrezzi = 0;
let totalePuntiReali = 0;
let lesioniInserite = [];
let polizzaData = { capitale: 0, risarcimento: 0, franchigia: 0 };
let rcaData = { min: 0, medio: 0, max: 0, biologico: 0, temporanea: 0, morale: 0, personalizzazione: 0, perditaTurni: 0 };
let inailData = { tipo: "Nessun indennizzo", importo: 0, isRendita: false };
let myChart = null; 

const ARCHIVIO_FILE_NAME = "sinistri_archivio_v1.json";

let isPro = false; 
let tapCount = 0;

function sbloccaProSegreto() {
  tapCount++;
  if (tapCount >= 5) {
    isPro = !isPro;
    alert(isPro ? "MODALITÀ SVILUPPATORE: ON" : "MODALITÀ SVILUPPATORE: OFF");
    tapCount = 0;
    chiudiProModal();
    aggiornaPunti(); 
  }
}

function showProModal(featureName) {
  const modal = document.getElementById('proModal');
  const msg = document.getElementById('proMessage');
  if (modal && msg) {
    msg.textContent = `${featureName} è una funzione PRO. Passa a Premium!`;
    modal.classList.add('active');
  }
}

function chiudiProModal() {
  const modal = document.getElementById('proModal');
  if (modal) modal.classList.remove('active');
}

function mostraDisclaimer() {
  const modal = document.getElementById('legalModal');
  if (modal) modal.classList.add('active');
}

function accettaDisclaimer() {
  localStorage.setItem('sinistriPro_legalAccepted', 'true');
  const modal = document.getElementById('legalModal');
  if (modal) modal.classList.remove('active');
}

function euro(v) {
  return "€ " + Math.round(Math.max(0, v || 0)).toLocaleString("it-IT");
}

function v(id) {
  const el = document.getElementById(id);
  if (!el) return 0;
  let val = parseFloat(el.value) || 0;
  if (id === "etaRca") val = Math.min(110, Math.max(0, val));
  else val = Math.max(0, val);
  return val;
}

function nuovaPratica() {
  if (!confirm("Iniziare una nuova pratica?")) return;
  lesioniInserite = [];
  const inputs = document.querySelectorAll("input, select");
  inputs.forEach(i => { if(i.type === "number") i.value = ""; else if(i.tagName === "SELECT" && i.id !== "categoria") i.selectedIndex = 0; });
  aggiornaPunti();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function aggiornaVoci() {
  const categoriaEl = document.getElementById("categoria");
  const voceEl = document.getElementById("voce");
  if (!categoriaEl || !voceEl) return;
  const categoria = categoriaEl.value;
  const voci = Object.keys(LESIONI[categoria] || {});
  voceEl.innerHTML = voci.map(v => `<option value="${v}">${v}</option>`).join("");
  aggiornaGravita();
}

function aggiornaGravita() {
  const categoria = document.getElementById("categoria").value;
  const voce = document.getElementById("voce").value;
  const gravitaEl = document.getElementById("gravita");
  if (!gravitaEl) return;
  const livelli = Object.keys((LESIONI[categoria] || {})[voce] || {});
  gravitaEl.innerHTML = livelli.map(g => `<option value="${g}">${g}</option>`).join("");
}

function aggiornaPunti() {
  if (lesioniInserite.length === 0) {
    totalePuntiGrezzi = 0;
    totalePuntiReali = 0;
  } else {
    totalePuntiGrezzi = lesioniInserite.reduce((acc, l) => acc + l.punti, 0);
    const sorted = [...lesioniInserite].sort((a,b) => b.punti - a.punti);
    let p_tot = sorted[0].punti;
    for (let i = 1; i < sorted.length; i++) {
      p_tot = p_tot + (sorted[i].punti * (1 - p_tot / 100));
    }
    totalePuntiReali = Math.round(p_tot);
  }
  document.getElementById("puntiInvalidita").textContent = totalePuntiReali;
  document.getElementById("headerPunti").textContent = totalePuntiReali + "%";
  renderLesioni();
}

function aggiungiLesione() {
  const cat = document.getElementById("categoria").value;
  const voce = document.getElementById("voce").value;
  const gravita = document.getElementById("gravita").value;
  if (!voce || !gravita) return;
  const punti = LESIONI[cat][voce][gravita];
  lesioniInserite.push({ categoria: cat, voce, gravita, punti });
  aggiornaPunti();
}

function rimuoviLesione(index) {
  lesioniInserite.splice(index, 1);
  aggiornaPunti();
}

function azzeraLesioni() {
  lesioniInserite = [];
  aggiornaPunti();
}

function renderLesioni() {
  const box = document.getElementById("listaLesioni");
  if (!box) return;
  if (!lesioniInserite.length) {
    box.className = "lesioni-list empty"; box.innerHTML = "Nessuna lesione inserita."; 
  } else {
    box.className = "lesioni-list";
    box.innerHTML = lesioniInserite.map((item, i) => `
      <div class="lesione-item">
        <div><strong>${item.voce}</strong> · ${item.gravita} (${item.punti} pt)</div>
        <button class="ghost" onclick="rimuoviLesione(${i})">Rimuovi</button>
      </div>
    `).join("");
  }
  aggiornaInail(); calcolaPolizza(); calcolaRCA(); generaRiepilogo();
}

function aggiornaInail() {
  let tipo = "Nessun indennizzo";
  let importo = 0;
  const ralInail = v("ralInail");
  if (totalePuntiReali >= 6 && totalePuntiReali <= 15) {
    tipo = "Indennizzo in capitale";
    importo = totalePuntiReali * 1300;
  } else if (totalePuntiReali >= 16) {
    if (!isPro) {
      tipo = "Bloccato (Solo PRO)";
      importo = 0;
    } else {
      tipo = "Rendita mensile (Stima)";
      const eta = v("etaRca") || 35;
      const decurtazioneEta = Math.max(0.5, 1 - ((eta - 30) * 0.004));
      let biologicoAnnuo = (totalePuntiReali * 100) * decurtazioneEta; 
      let coeffReddito = 0.4;
      if (totalePuntiReali >= 21) coeffReddito = 0.5;
      if (totalePuntiReali >= 40) coeffReddito = 0.6;
      let ralUtile = Math.min(ralInail, 37000);
      let patrimonialeAnnuo = ralUtile * (totalePuntiReali / 100) * coeffReddito;
      importo = Math.round((biologicoAnnuo + patrimonialeAnnuo) / 12);
    }
  }
  inailData = { tipo, importo, isRendita: totalePuntiReali >= 16 && isPro };
  const card = document.getElementById("risultatoInailCard");
  if (card) {
    card.innerHTML = `<div class="mini-label">Stima INAIL</div><div class="result-value">${euro(importo)}${inailData.isRendita ? '/mese' : ''}</div><div class="result-sub">${tipo}</div>`;
  }
  const statusInail = document.getElementById("outputInail");
  if (statusInail) statusInail.textContent = tipo;
}

function calcolaPolizza() {
  const box = document.getElementById("risultatoPolizza");
  if (!isPro) { box.innerHTML = "Sblocca PRO per calcolo polizza."; return; }
  const indennizzo = v("ral") * v("moltiplicatore") * (Math.max(0, totalePuntiReali - v("franchigiaPolizza")) / 100);
  polizzaData = { risarcimento: indennizzo };
  box.innerHTML = `Indennizzo stimato: ${euro(indennizzo)}`;
}

function calcolaRCA() {
  const base = totalePuntiReali * 1500 * Math.max(0.7, 1 - (v("etaRca") * 0.004));
  const temp = (v("itt")*55) + (v("itp75")*41) + (v("itp50")*27) + (v("itp25")*13);
  const turni = v("indennitaTurni") * Math.min(60, v("mesiTurni"));
  
  const morale = base * Math.min(30, v("dannoMorale")) / 100;
  const pers = base * Math.min(30, v("personalizzazioneRca")) / 100;
  
  const medio = base + temp + morale + pers + v("speseMediche") + v("perditaPatrimoniale") + turni;
  
  rcaData = { 
    min: medio * 0.85, medio, max: medio * 1.15, 
    biologico: base, temporanea: temp, morale, personalizzazione: pers, perditaTurni: turni, medio
  };
  
  const resRca = document.getElementById("risultatoRca");
  if (resRca) resRca.innerHTML = `Range RCA: ${euro(rcaData.min)} - ${euro(rcaData.max)}`;
}

function generaRiepilogo() {
  document.getElementById("reportData").textContent = new Date().toLocaleDateString("it-IT");
  document.getElementById("reportPunti").textContent = totalePuntiReali + "%";
  document.getElementById("reportEta").textContent = v("etaRca") + " anni";
  document.getElementById("reportItt").textContent = v("itt") + " gg";
  document.getElementById("reportInail").textContent = euro(inailData.importo) + (inailData.isRendita ? " / mese" : "");
  document.getElementById("reportPolizza").textContent = euro(polizzaData.risarcimento);
  document.getElementById("reportBiologico").textContent = euro(rcaData.biologico);
  document.getElementById("reportTemporanea").textContent = euro(rcaData.temporanea);
  document.getElementById("reportMorale").textContent = euro(rcaData.morale);
  document.getElementById("reportPersonalizzazione").textContent = euro(rcaData.personalizzazione);
  document.getElementById("reportSpeseMediche").textContent = euro(v("speseMediche"));
  document.getElementById("reportPerditaPatrimoniale").textContent = euro(v("perditaPatrimoniale"));
  document.getElementById("reportPerditaTurni").textContent = euro(rcaData.perditaTurni);
  document.getElementById("reportRangeRca").textContent = `${euro(rcaData.min)} / ${euro(rcaData.max)}`;
  document.getElementById("reportTotale").textContent = euro(rcaData.medio + polizzaData.risarcimento + (inailData.isRendita ? 0 : inailData.importo));
  
  const reportLesioni = document.getElementById("reportLesioni");
  if (reportLesioni) {
    reportLesioni.innerHTML = lesioniInserite.map(l => `<div style="border-bottom: 1px solid #f1f5f9; padding: 4px 0;"><strong>${l.voce}</strong> (${l.gravita}) - ${l.punti} pt</div>`).join("");
  }
  aggiornaGrafico();
}

async function condividiReport() {
  if (!isPro) { showProModal("Condivisione"); return; }
  generaRiepilogo();
  await generaPdf('Report_Sinistri_Pro.pdf', 'Report Sinistri Pro', true, false);
}

async function salvaPdf() {
  if (!isPro) { showProModal("PDF"); return; }
  generaRiepilogo();
  await generaPdf('Report_Sinistri_Pro.pdf', 'Report Sinistri Pro', false, true);
}

async function generaPdf(filename, shareTitle, share = false, saveOnly = false) {
  const element = document.getElementById('reportExport');
  if (!element) return;

  const opt = {
    margin: 10,
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollY: 0 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
  };

  try {
    const worker = html2pdf().set(opt).from(element);
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
      const { Filesystem, Share } = Capacitor.Plugins;
      const pdfDataUri = await worker.output('datauristring');
      let savedFile;
      try {
        savedFile = await Filesystem.writeFile({
          path: filename,
          data: pdfDataUri.split('base64,')[1],
          directory: 'DOCUMENTS'
        });
      } catch (writeError) {
        console.warn('Documento non disponibile, uso CACHE.', writeError);
        savedFile = await Filesystem.writeFile({
          path: filename,
          data: pdfDataUri.split('base64,')[1],
          directory: 'CACHE'
        });
      }
      if (share) {
        await Share.share({ title: shareTitle, url: savedFile.uri });
      } else if (saveOnly) {
        alert(`PDF salvato localmente: ${savedFile.uri || savedFile.path}`);
      }
    } else {
      await worker.save();
    }
  } catch (err) {
    console.error(err);
    alert(`Errore generazione PDF${share ? ' o condivisione' : ''}. Riprova.`);
  }
}

function aggiornaGrafico() {
  const cnvs = document.getElementById('reportChart');
  if (!cnvs) return;
  const ctx = cnvs.getContext('2d');
  if (myChart) myChart.destroy();
  myChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['INAIL', 'Polizza', 'RCA'],
      datasets: [{ data: [inailData.importo, polizzaData.risarcimento, rcaData.medio], backgroundColor: ['#f59e0b', '#10b981', '#3b82f6'] }]
    },
    options: {
      animation: false,
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function apriMenuSalvataggio() { document.getElementById('saveActionSheet').classList.add('active'); }
function chiudiMenuSalvataggio(event) {
  if (event && event.target && event.target.id !== 'saveActionSheet') return;
  document.getElementById('saveActionSheet').classList.remove('active');
}

async function getStorico() {
  try {
    return JSON.parse(localStorage.getItem('sinistriStorico') || '[]');
  } catch (err) {
    console.warn('Archivio corrotto, ripristino storico.', err);
    localStorage.setItem('sinistriStorico', '[]');
    return [];
  }
}
async function saveStorico(s) { localStorage.setItem('sinistriStorico', JSON.stringify(s)); }

async function salvaPratica() {
  if (!isPro) { showProModal("Archivio"); return; }
  const nome = prompt("Nome pratica:"); if (!nome) return;
  const s = await getStorico();
  s.unshift({ id: Date.now(), nome, data: new Date().toLocaleDateString("it-IT"), totalePuntiReali, inputs: { ralInail: v("ralInail"), ralPolizza: v("ral"), moltiplicatore: v("moltiplicatore"), franchigiaPolizza: v("franchigiaPolizza"), etaRca: v("etaRca"), itt: v("itt"), itp75: v("itp75"), itp50: v("itp50"), itp25: v("itp25"), dannoMorale: v("dannoMorale"), personalizzazioneRca: v("personalizzazioneRca"), speseMediche: v("speseMediche"), perditaPatrimoniale: v("perditaPatrimoniale"), indennitaTurni: v("indennitaTurni"), mesiTurni: v("mesiTurni") }, lesioniList: [...lesioniInserite] });
  await saveStorico(s); alert("Salvata!"); aggiornaArchivioLista();
}

async function aggiornaArchivioLista() {
  const list = await getStorico();
  const container = document.getElementById("contenitoreArchivio");
  if (!container) return;
  container.innerHTML = list.map(p => `
    <div class="archivio-card">
      <div><h4>${p.nome}</h4><small>${p.data} - ${p.totalePuntiReali}%</small></div>
      <div class="card-actions"><button onclick="caricaPratica('${p.id}')">📂</button><button onclick="eliminaPratica('${p.id}')">🗑️</button></div>
    </div>
  `).join("");
}

async function filtraArchivio(query) {
  const container = document.getElementById("contenitoreArchivio");
  if (!container) return;
  const list = await getStorico();
  if (!query || !query.trim()) { return aggiornaArchivioLista(); }
  const normalized = query.trim().toLowerCase();
  const filtered = list.filter(p =>
    p.nome.toLowerCase().includes(normalized) ||
    (p.data && p.data.toLowerCase().includes(normalized)) ||
    String(p.totalePuntiReali).includes(normalized)
  );

  container.innerHTML = filtered.length
    ? filtered.map(p => `
      <div class="archivio-card">
        <div><h4>${p.nome}</h4><small>${p.data} - ${p.totalePuntiReali}%</small></div>
        <div class="card-actions"><button onclick="caricaPratica('${p.id}')">📂</button><button onclick="eliminaPratica('${p.id}')">🗑️</button></div>
      </div>
    `).join("")
    : `<div class="placeholder">Nessuna pratica trovata.</div>`;
}

async function caricaPratica(id) { 
  const list = await getStorico();
  const p = list.find(x => x.id == id);
  if (!p) return;
  lesioniInserite = p.lesioniList || [];
  const mapArr = [["ralInail", p.inputs.ralInail], ["ral", p.inputs.ralPolizza], ["moltiplicatore", p.inputs.moltiplicatore], ["franchigiaPolizza", p.inputs.franchigiaPolizza], ["etaRca", p.inputs.etaRca], ["itt", p.inputs.itt], ["itp75", p.inputs.itp75], ["itp50", p.inputs.itp50], ["itp25", p.inputs.itp25], ["dannoMorale", p.inputs.dannoMorale], ["personalizzazioneRca", p.inputs.personalizzazioneRca], ["speseMediche", p.inputs.speseMediche], ["perditaPatrimoniale", p.inputs.perditaPatrimoniale], ["indennitaTurni", p.inputs.indennitaTurni], ["mesiTurni", p.inputs.mesiTurni]];
  mapArr.forEach(m => { const el = document.getElementById(m[0]); if(el) el.value = m[1] || ""; });
  aggiornaPunti(); window.scrollTo({ top: 0, behavior: 'smooth' });
}

async function eliminaPratica(id) {
  let s = await getStorico(); s = s.filter(x => x.id != id); await saveStorico(s); aggiornaArchivioLista();
}

function checkRicercaPro() { if (!isPro) showProModal("Ricerca"); }

function eseguiRicerca(query) {
  if (!isPro) return;
  const box = document.getElementById("ricercaSuggerimenti");
  if (!query || query.length < 2) { box.style.display = "none"; return; }
  query = query.toLowerCase();
  let res = [];
  for (const cat in LESIONI) { 
    for (const voce in LESIONI[cat]) { 
      if (voce.toLowerCase().includes(query)) res.push({ cat, voce }); 
    } 
  }
  box.innerHTML = res.slice(0, 10).map(r => `
    <div class="suggestion-item" onclick="applicaRicerca('${r.cat}', '${r.voce.replace(/'/g, "\\'")}')">
      <strong>${r.voce}</strong><br><small>${r.cat}</small>
    </div>
  `).join("");
  box.style.display = "block";
}

function applicaRicerca(cat, voce) {
  document.getElementById("categoria").value = cat;
  aggiornaVoci();
  document.getElementById("voce").value = voce;
  aggiornaGravita();
  document.getElementById("ricercaSuggerimenti").style.display = "none";
}

async function inizializzaBilling() {
  try {
    if (!window.Capacitor || !window.Capacitor.isNativePlatform()) {
      console.warn('Non su piattaforma nativa, fatturazione disabilitata.');
      return;
    }
    const { Billing } = Capacitor.Plugins;
    if (!Billing) {
      console.warn('Plugin Billing non trovato.');
      return;
    }
    // Eseguiamo le chiamate in modo protetto
    const products = await Billing.getProducts({ productIds: ['sinistri_pro'] }).catch(e => {
        console.warn("Errore recupero prodotti:", e);
        return null;
    });
    
    if (products && products.products && products.products.length > 0) {
      const p = products.products[0];
      const btn = document.getElementById('buyProBtn');
      if (btn && p.price) {
        btn.textContent = `Sblocca Versione PRO - ${p.price}`;
      }
    }

    const history = await Billing.getPurchaseHistory({ productId: 'sinistri_pro' }).catch(e => {
        console.warn("Errore cronologia acquisti:", e);
        return null;
    });

    if (history && history.purchases && history.purchases.length > 0) {
      isPro = true;
      console.log('PRO già acquistato ripristinato.');
    }
  } catch (err) {
    console.error('Errore generico inizializzazione fatturazione:', err);
  }
}

async function acquistaProReal() {
  try {
    if (!window.Capacitor || !window.Capacitor.isNativePlatform()) {
      alert('Acquisti in-app non disponibili in questa versione.');
      return;
    }
    const { Billing } = Capacitor.Plugins;
    const result = await Billing.purchase({ productId: 'sinistri_pro' });
    if (result && result.success) {
      isPro = true;
      localStorage.setItem('sinistriPro_purchased', 'true');
      alert('Acquisto completato! Versione PRO sbloccata.');
      chiudiProModal();
      aggiornaPunti();
    }
  } catch (err) {
    console.error('Errore acquisto:', err);
    alert(`Errore durante l'acquisto: ${err.message || 'Riprova più tardi'}`);
  }
}

window.onload = async function () {
  const catEl = document.getElementById("categoria");
  if (catEl) catEl.innerHTML = Object.keys(LESIONI).map(cat => `<option value="${cat}">${cat}</option>`).join("");
  aggiornaVoci(); aggiornaPunti(); await inizializzaBilling(); aggiornaArchivioLista();
  if (!localStorage.getItem('sinistriPro_legalAccepted')) mostraDisclaimer();
};
