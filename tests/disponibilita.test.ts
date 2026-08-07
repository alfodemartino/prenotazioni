import { describe, expect, it } from "vitest";
import {
  costoOspitiCent,
  formattaEuro,
  giornataTerminata,
  inOverbooking,
  limitePosti,
  postiResidui,
  statoGiornata,
  totalePersone,
  validaGruppo,
  verificaPrenotabilita,
  type ConfigGiornata,
  type ContestoTemporale,
  type Gruppo,
  type StatoSocio,
  type Vincoli,
} from "@/lib/disponibilita";

const OGGI = "2026-08-06";
const DOMANI = "2026-08-07";
const DOPODOMANI = "2026-08-08";

function giornata(over: Partial<ConfigGiornata> = {}): ConfigGiornata {
  return {
    data: DOMANI,
    aperta: true,
    capienzaAdulti: 80,
    overbookingPct: 10,
    oraApertura: "09:00",
    oraChiusura: "19:00",
    ...over,
  };
}

function contesto(over: Partial<ContestoTemporale> = {}): ContestoTemporale {
  return { oggi: OGGI, minutiCorrenti: 10 * 60, giorniFinestra: 2, ...over };
}

function gruppo(over: Partial<Gruppo> = {}): Gruppo {
  return { adulti: 2, bambini: 0, ospitiAdulti: 0, ospitiBambini: 0, ...over };
}

function socio(over: Partial<StatoSocio> = {}): StatoSocio {
  return { stato: "ATTIVO", scadenzaTessera: null, ...over };
}

function vincoli(over: Partial<Vincoli> = {}): Vincoli {
  return {
    maxPersonePerPrenotazione: 20,
    sogliaUltimiPosti: 5,
    ...over,
  };
}

function verifica(over: Partial<Parameters<typeof verificaPrenotabilita>[0]> = {}) {
  return verificaPrenotabilita({
    giornata: giornata(),
    adultiOccupati: 0,
    adultiGiaMiei: 0,
    gruppo: gruppo(),
    socio: socio(),
    ctx: contesto(),
    vincoli: vincoli(),
    ...over,
  });
}

// ---------------------------------------------------------------------------

describe("capienza e overbooking", () => {
  it("applica la tolleranza arrotondando per difetto", () => {
    expect(limitePosti(80, 10)).toBe(88);
    expect(limitePosti(80, 0)).toBe(80);
    expect(limitePosti(5, 10)).toBe(5); // 5,5 → 5: mai un posto in più del dovuto
    expect(limitePosti(75, 10)).toBe(82); // 82,5 → 82
  });

  it("calcola i posti residui sul limite comprensivo di overbooking", () => {
    expect(postiResidui(giornata(), 80)).toBe(8);
    expect(postiResidui(giornata(), 88)).toBe(0);
  });

  it("restituisce un residuo negativo se l'admin taglia la capienza a giornata piena", () => {
    expect(postiResidui(giornata({ capienzaAdulti: 40 }), 80)).toBe(-36);
  });

  it("segnala quando si sta attingendo alla tolleranza", () => {
    expect(inOverbooking(giornata(), 80)).toBe(false);
    expect(inOverbooking(giornata(), 81)).toBe(true);
  });
});

describe("chiusura della giornata odierna", () => {
  it("blocca oggi solo dopo l'orario di chiusura", () => {
    const g = giornata({ data: OGGI, oraChiusura: "19:00" });
    expect(giornataTerminata(g, contesto({ minutiCorrenti: 18 * 60 + 59 }))).toBe(false);
    expect(giornataTerminata(g, contesto({ minutiCorrenti: 19 * 60 }))).toBe(true);
  });

  it("non tocca i giorni futuri, qualunque ora sia adesso", () => {
    const g = giornata({ data: DOMANI, oraChiusura: "19:00" });
    expect(giornataTerminata(g, contesto({ minutiCorrenti: 23 * 60 }))).toBe(false);
  });

  it("in caso di orario malformato non blocca il socio", () => {
    const g = giornata({ data: OGGI, oraChiusura: "diciannove" });
    expect(giornataTerminata(g, contesto({ minutiCorrenti: 23 * 60 }))).toBe(false);
  });
});

describe("stato mostrato sulla scheda della giornata", () => {
  const v = vincoli();

  it("distingue disponibile, ultimi posti ed esaurita", () => {
    expect(statoGiornata(giornata(), 0, contesto(), v.sogliaUltimiPosti)).toBe("DISPONIBILE");
    expect(statoGiornata(giornata(), 82, contesto(), v.sogliaUltimiPosti)).toBe("DISPONIBILE");
    expect(statoGiornata(giornata(), 83, contesto(), v.sogliaUltimiPosti)).toBe("ULTIMI_POSTI");
    expect(statoGiornata(giornata(), 88, contesto(), v.sogliaUltimiPosti)).toBe("ESAURITA");
    expect(statoGiornata(giornata(), 200, contesto(), v.sogliaUltimiPosti)).toBe("ESAURITA");
  });

  it("la chiusura amministrativa vince sulla disponibilità", () => {
    expect(statoGiornata(giornata({ aperta: false }), 0, contesto(), 5)).toBe("CHIUSA");
  });

  it("fuori finestra ha la precedenza su tutto", () => {
    const fuori = giornata({ data: "2026-08-09", aperta: false });
    expect(statoGiornata(fuori, 0, contesto(), 5)).toBe("FUORI_FINESTRA");
  });

  it("oggi dopo la chiusura non è più prenotabile", () => {
    const g = giornata({ data: OGGI });
    expect(statoGiornata(g, 0, contesto({ minutiCorrenti: 20 * 60 }), 5)).toBe("TERMINATA");
  });
});

describe("validazione del gruppo", () => {
  it("accetta un gruppo normale", () => {
    expect(validaGruppo(gruppo({ adulti: 2, bambini: 3, ospitiAdulti: 1 }), 20)).toBeNull();
  });

  it("pretende almeno un adulto tesserato", () => {
    expect(validaGruppo(gruppo({ adulti: 0, bambini: 2 }), 20)).toMatch(/almeno un adulto/i);
  });

  it("rifiuta numeri negativi e non interi", () => {
    expect(validaGruppo(gruppo({ bambini: -1 }), 20)).toBeTruthy();
    expect(validaGruppo(gruppo({ ospitiAdulti: 1.5 }), 20)).toBeTruthy();
  });

  it("applica il tetto complessivo di persone", () => {
    expect(validaGruppo(gruppo({ adulti: 10, bambini: 11 }), 20)).toMatch(/al massimo 20/);
    expect(validaGruppo(gruppo({ adulti: 10, bambini: 10 }), 20)).toBeNull();
  });

  it("conta tutti nel totale, anche chi non occupa posti", () => {
    expect(totalePersone(gruppo({ adulti: 2, bambini: 1, ospitiAdulti: 2, ospitiBambini: 1 }))).toBe(6);
  });
});

describe("verifica di prenotabilità", () => {
  it("consente il caso normale e riporta i posti che restano", () => {
    const esito = verifica({ adultiOccupati: 10, gruppo: gruppo({ adulti: 2 }) });
    expect(esito).toEqual({ ok: true, postiResidui: 76 }); // 88 − 10 − 2
  });

  it("permette di riempire l'ultimo posto disponibile", () => {
    expect(verifica({ adultiOccupati: 87, gruppo: gruppo({ adulti: 1 }) }).ok).toBe(true);
  });

  it("blocca la richiesta che sfonderebbe il limite di un solo posto", () => {
    const esito = verifica({ adultiOccupati: 87, gruppo: gruppo({ adulti: 2 }) });
    expect(esito.ok).toBe(false);
    expect(esito).toMatchObject({ codice: "CAPIENZA_INSUFFICIENTE" });
    expect((esito as { messaggio: string }).messaggio).toMatch(/solo 1 posto/);
  });

  it("dice 'al completo' quando non resta nulla", () => {
    const esito = verifica({ adultiOccupati: 88 });
    expect(esito).toMatchObject({ ok: false, codice: "CAPIENZA_INSUFFICIENTE" });
    expect((esito as { messaggio: string }).messaggio).toMatch(/al completo/);
  });

  it("bambini e ospiti non consumano capienza", () => {
    const affollato = gruppo({ adulti: 1, bambini: 8, ospitiAdulti: 5, ospitiBambini: 4 });
    expect(verifica({ adultiOccupati: 87, gruppo: affollato }).ok).toBe(true);
  });
});

describe("modifica di una prenotazione esistente", () => {
  it("non conta due volte i posti che il socio già occupa", () => {
    // Giornata piena a 88, di cui 4 posti sono della prenotazione del socio stesso.
    // Passare da 4 a 5 adulti deve essere rifiutato...
    expect(
      verifica({ adultiOccupati: 88, adultiGiaMiei: 4, gruppo: gruppo({ adulti: 5 }) }),
    ).toMatchObject({ ok: false, codice: "CAPIENZA_INSUFFICIENTE" });

    // ...ma riconfermare gli stessi 4 deve passare, anche a giornata esaurita.
    expect(
      verifica({ adultiOccupati: 88, adultiGiaMiei: 4, gruppo: gruppo({ adulti: 4 }) }).ok,
    ).toBe(true);

    // E ridurre il gruppo deve sempre essere possibile.
    expect(
      verifica({ adultiOccupati: 88, adultiGiaMiei: 4, gruppo: gruppo({ adulti: 2 }) }).ok,
    ).toBe(true);
  });
});

describe("requisiti del socio", () => {
  it("blocca il socio sospeso", () => {
    expect(verifica({ socio: socio({ stato: "SOSPESO" }) })).toMatchObject({
      ok: false,
      codice: "SOCIO_SOSPESO",
    });
  });

  it("confronta la scadenza della tessera con il giorno di accesso, non con oggi", () => {
    // Tessera valida fino a oggi: prenotare per domani non deve passare.
    const scaduta = socio({ scadenzaTessera: OGGI });
    expect(verifica({ socio: scaduta, giornata: giornata({ data: DOMANI }) })).toMatchObject({
      ok: false,
      codice: "TESSERA_SCADUTA",
    });

    // Ma per oggi stesso sì.
    expect(verifica({ socio: scaduta, giornata: giornata({ data: OGGI }) }).ok).toBe(true);
  });

});

describe("finestra temporale", () => {
  it("rifiuta ieri e il quarto giorno", () => {
    expect(verifica({ giornata: giornata({ data: "2026-08-05" }) })).toMatchObject({
      ok: false,
      codice: "FUORI_FINESTRA",
    });
    expect(verifica({ giornata: giornata({ data: "2026-08-09" }) })).toMatchObject({
      ok: false,
      codice: "FUORI_FINESTRA",
    });
  });

  it("accetta tutti e tre i giorni della finestra", () => {
    for (const data of [OGGI, DOMANI, DOPODOMANI]) {
      expect(verifica({ giornata: giornata({ data }) }).ok).toBe(true);
    }
  });

  it("per oggi accetta fino alla chiusura e non oltre", () => {
    const oggi = giornata({ data: OGGI, oraChiusura: "19:00" });
    expect(verifica({ giornata: oggi, ctx: contesto({ minutiCorrenti: 18 * 60 + 55 }) }).ok).toBe(true);
    expect(
      verifica({ giornata: oggi, ctx: contesto({ minutiCorrenti: 19 * 60 + 1 }) }),
    ).toMatchObject({ ok: false, codice: "GIORNATA_TERMINATA" });
  });

  it("rifiuta la giornata chiusa dall'amministrazione", () => {
    expect(verifica({ giornata: giornata({ aperta: false }) })).toMatchObject({
      ok: false,
      codice: "GIORNATA_CHIUSA",
    });
  });
});

describe("ordine dei controlli", () => {
  it("un gruppo non valido viene segnalato prima di ogni altra cosa", () => {
    const esito = verifica({
      gruppo: gruppo({ adulti: 0 }),
      giornata: giornata({ aperta: false, data: "2026-01-01" }),
      socio: socio({ stato: "SOSPESO" }),
    });
    expect(esito).toMatchObject({ ok: false, codice: "GRUPPO_NON_VALIDO" });
  });

  it("lo stato del socio precede quello della giornata", () => {
    expect(
      verifica({ socio: socio({ stato: "SOSPESO" }), giornata: giornata({ aperta: false }) }),
    ).toMatchObject({ codice: "SOCIO_SOSPESO" });
  });
});

describe("costo indicativo degli ospiti", () => {
  const tariffe = { tariffaOspiteAdultoCent: 1000, tariffaOspiteBambinoCent: 500 };

  it("somma le tariffe per categoria", () => {
    expect(costoOspitiCent(gruppo({ ospitiAdulti: 2, ospitiBambini: 3 }), tariffe)).toBe(3500);
  });

  it("non fa pagare adulti e bambini tesserati", () => {
    expect(costoOspitiCent(gruppo({ adulti: 4, bambini: 5 }), tariffe)).toBe(0);
  });

  it("formatta in euro all'italiana", () => {
    expect(formattaEuro(3500).replace(/ /g, " ")).toBe("35,00 €");
  });
});
