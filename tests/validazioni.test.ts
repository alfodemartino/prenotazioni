import { describe, expect, it } from "vitest";
import {
  centesimiInEuro,
  emailPlausibile,
  euroInCentesimi,
  normalizzaEmail,
  validaConfigGiornata,
  validaImpostazioni,
  validaIntervallo,
  validaOrari,
  validaSocio,
  type ImpostazioniInput,
  type SocioInput,
} from "@/lib/validazioni";

describe("orari", () => {
  it("accetta un intervallo sensato", () => {
    expect(validaOrari("09:00", "19:00")).toBeNull();
  });

  it("pretende la chiusura dopo l'apertura", () => {
    expect(validaOrari("19:00", "09:00")).toMatch(/successivo/);
    expect(validaOrari("09:00", "09:00")).toMatch(/successivo/);
  });

  it("rifiuta i formati sbagliati", () => {
    expect(validaOrari("9", "19:00")).toMatch(/HH:MM/);
    expect(validaOrari("09:00", "25:00")).toMatch(/HH:MM/);
  });
});

describe("configurazione di una giornata", () => {
  const base = { capienzaAdulti: 80, overbookingPct: 10, oraApertura: "09:00", oraChiusura: "19:00" };

  it("accetta i valori normali", () => {
    expect(validaConfigGiornata(base)).toBeNull();
  });

  it("ammette capienza zero (giornata di fatto chiusa alle prenotazioni)", () => {
    expect(validaConfigGiornata({ ...base, capienzaAdulti: 0 })).toBeNull();
  });

  it("rifiuta capienze impossibili", () => {
    expect(validaConfigGiornata({ ...base, capienzaAdulti: -1 })).toBeTruthy();
    expect(validaConfigGiornata({ ...base, capienzaAdulti: 12.5 })).toBeTruthy();
    expect(validaConfigGiornata({ ...base, capienzaAdulti: 999_999 })).toMatch(/plausibile/);
  });

  it("tiene l'overbooking fra 0 e 100", () => {
    expect(validaConfigGiornata({ ...base, overbookingPct: 0 })).toBeNull();
    expect(validaConfigGiornata({ ...base, overbookingPct: 100 })).toBeNull();
    expect(validaConfigGiornata({ ...base, overbookingPct: -5 })).toBeTruthy();
    expect(validaConfigGiornata({ ...base, overbookingPct: 150 })).toBeTruthy();
  });
});

describe("impostazioni del circolo", () => {
  const base: ImpostazioniInput = {
    nomeCircolo: "Circolo Piscina",
    capienzaAdulti: 80,
    overbookingPct: 10,
    oraApertura: "09:00",
    oraChiusura: "19:00",
    giorniFinestra: 2,
    tariffaOspiteAdultoCent: 1000,
    tariffaOspiteBambinoCent: 500,
    sogliaUltimiPosti: 5,
    maxPersonePerPrenotazione: 20,
  };

  it("accetta la configurazione corrente", () => {
    expect(validaImpostazioni(base)).toBeNull();
  });

  it("pretende un nome per il circolo", () => {
    expect(validaImpostazioni({ ...base, nomeCircolo: "   " })).toMatch(/nome del circolo/);
  });

  it("ammette la finestra ridotta al solo giorno corrente", () => {
    expect(validaImpostazioni({ ...base, giorniFinestra: 0 })).toBeNull();
  });

  it("rifiuta finestre assurde", () => {
    expect(validaImpostazioni({ ...base, giorniFinestra: -1 })).toBeTruthy();
    expect(validaImpostazioni({ ...base, giorniFinestra: 60 })).toBeTruthy();
  });

  it("rifiuta tariffe negative e prenotazioni da zero persone", () => {
    expect(validaImpostazioni({ ...base, tariffaOspiteAdultoCent: -100 })).toBeTruthy();
    expect(validaImpostazioni({ ...base, maxPersonePerPrenotazione: 0 })).toBeTruthy();
  });

  it("le tariffe possono essere azzerate (ospiti gratuiti)", () => {
    expect(
      validaImpostazioni({ ...base, tariffaOspiteAdultoCent: 0, tariffaOspiteBambinoCent: 0 }),
    ).toBeNull();
  });
});

describe("anagrafica socio", () => {
  const base: SocioInput = {
    nome: "Maria",
    cognome: "Rossi",
    email: "maria.rossi@example.it",
    numeroTessera: "0001",
    scadenzaTessera: null,
    scadenzaCertificato: null,
  };

  it("accetta un'anagrafica completa", () => {
    expect(validaSocio(base)).toBeNull();
  });

  it("pretende nome, cognome e tessera", () => {
    expect(validaSocio({ ...base, nome: " " })).toMatch(/nome/i);
    expect(validaSocio({ ...base, cognome: "" })).toMatch(/cognome/i);
    expect(validaSocio({ ...base, numeroTessera: "" })).toMatch(/tessera/i);
  });

  it("intercetta gli indirizzi email sbagliati", () => {
    expect(validaSocio({ ...base, email: "maria.rossi" })).toBeTruthy();
    expect(validaSocio({ ...base, email: "maria@rossi" })).toBeTruthy();
    expect(validaSocio({ ...base, email: "maria rossi@example.it" })).toBeTruthy();
  });

  it("rifiuta scadenze inesistenti ma accetta l'assenza di scadenza", () => {
    expect(validaSocio({ ...base, scadenzaTessera: "2026-02-30" })).toMatch(/tessera/);
    expect(validaSocio({ ...base, scadenzaCertificato: "31/12/2026" })).toMatch(/certificato/);
    expect(validaSocio({ ...base, scadenzaTessera: "2026-12-31" })).toBeNull();
  });

  it("normalizza le email", () => {
    expect(normalizzaEmail("  Maria.Rossi@Example.IT ")).toBe("maria.rossi@example.it");
    expect(emailPlausibile("a@b.it")).toBe(true);
  });
});

describe("importi in euro", () => {
  it("legge le due notazioni decimali", () => {
    expect(euroInCentesimi("10")).toBe(1000);
    expect(euroInCentesimi("10,50")).toBe(1050);
    expect(euroInCentesimi("10.50")).toBe(1050);
    expect(euroInCentesimi(" 7,05 € ")).toBe(705);
    expect(euroInCentesimi("0")).toBe(0);
  });

  it("rifiuta ciò che non è un importo", () => {
    expect(euroInCentesimi("gratis")).toBeNaN();
    expect(euroInCentesimi("-5")).toBeNaN();
    expect(euroInCentesimi("10,555")).toBeNaN();
  });

  it("torna indietro senza perdere centesimi", () => {
    expect(centesimiInEuro(1050)).toBe("10,50");
    expect(centesimiInEuro(705)).toBe("7,05");
    expect(centesimiInEuro(0)).toBe("0,00");
  });
});

describe("intervallo di date", () => {
  it("accetta un intervallo valido, anche di un solo giorno", () => {
    expect(validaIntervallo("2026-08-06", "2026-08-10")).toBeNull();
    expect(validaIntervallo("2026-08-06", "2026-08-06")).toBeNull();
  });

  it("rifiuta l'ordine invertito e le date inesistenti", () => {
    expect(validaIntervallo("2026-08-10", "2026-08-06")).toBeTruthy();
    expect(validaIntervallo("2026-02-30", "2026-08-06")).toBeTruthy();
  });
});
