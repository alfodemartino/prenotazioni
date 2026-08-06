import { describe, expect, it } from "vitest";
import {
  CLASSI_MINIME,
  LUNGHEZZA_ESENTE_DA_CLASSI,
  LUNGHEZZA_MINIMA,
  LUNGHEZZA_MINIMA_AMMINISTRATORE,
  classiUsate,
  contieneDatiPersonali,
  contieneParolaComune,
  generaPasswordLeggibile,
  haSequenzaPrevedibile,
  lunghezzaMinimaPerRuolo,
  requisiti,
  validaPassword,
} from "@/lib/password";

/** Password che soddisfa tutti i requisiti, usata come base di confronto. */
const BUONA = "Ombrellone7#";

const SOCIO = {
  nome: "Maria",
  cognome: "Rossi",
  email: "maria.rossi@example.it",
  numeroTessera: "0001",
};

function requisito(password: string, id: string, contesto?: typeof SOCIO) {
  return requisiti(password, { contesto })!.find((r) => r.id === id)!;
}

describe("password accettabili", () => {
  it("accetta una password con lunghezza e varietà sufficienti", () => {
    expect(validaPassword(BUONA)).toBeNull();
  });

  it("accetta una passphrase lunga anche senza maiuscole né simboli", () => {
    // Ventisei caratteri: più robusta di «Pwd2024!» e non ha senso rifiutarla.
    const passphrase = "il mio cane si chiama argo";
    expect(passphrase.length).toBeGreaterThanOrEqual(LUNGHEZZA_ESENTE_DA_CLASSI);
    expect(classiUsate(passphrase)).toBeLessThan(CLASSI_MINIME);
    expect(validaPassword(passphrase)).toBeNull();
  });
});

describe("lunghezza", () => {
  it("rifiuta le password più corte del minimo", () => {
    expect(validaPassword("Corta1!")).toMatch(new RegExp(`almeno ${LUNGHEZZA_MINIMA}`));
  });

  it("gli amministratori hanno un minimo più alto", () => {
    expect(lunghezzaMinimaPerRuolo("SOCIO")).toBe(LUNGHEZZA_MINIMA);
    expect(lunghezzaMinimaPerRuolo("ADMIN")).toBe(LUNGHEZZA_MINIMA_AMMINISTRATORE);

    const undiciCaratteri = "Ombrellon7#";
    expect(undiciCaratteri).toHaveLength(11);
    expect(validaPassword(undiciCaratteri)).toBeNull();
    expect(
      validaPassword(undiciCaratteri, { lunghezzaMinima: LUNGHEZZA_MINIMA_AMMINISTRATORE }),
    ).toBeTruthy();
  });
});

describe("varietà di caratteri", () => {
  it("conta i tipi presenti", () => {
    expect(classiUsate("soltantominuscole")).toBe(1);
    expect(classiUsate("ConMaiuscole")).toBe(2);
    expect(classiUsate("ConMaiuscole9")).toBe(3);
    expect(classiUsate("ConMaiuscole9!")).toBe(4);
  });

  it("rifiuta chi usa meno di tre tipi restando sotto la soglia di esenzione", () => {
    const quindici = "solominuscolez";
    expect(quindici.length).toBeLessThan(LUNGHEZZA_ESENTE_DA_CLASSI);
    expect(validaPassword(quindici)).toMatch(/tipi di carattere/);
  });

  it("tre tipi su quattro bastano", () => {
    expect(validaPassword("Ombrellone7")).toBeNull(); // niente simboli
  });
});

describe("sequenze prevedibili", () => {
  it("riconosce i caratteri ripetuti", () => {
    expect(haSequenzaPrevedibile("aaaa")).toBe(true);
    expect(haSequenzaPrevedibile("aaa")).toBe(false); // tre non bastano
  });

  it("riconosce le progressioni crescenti e decrescenti", () => {
    expect(haSequenzaPrevedibile("abcd")).toBe(true);
    expect(haSequenzaPrevedibile("4321")).toBe(true);
    expect(haSequenzaPrevedibile("dcba")).toBe(true);
    expect(haSequenzaPrevedibile("acbd")).toBe(false);
  });

  it("riconosce i tratti di tastiera", () => {
    expect(haSequenzaPrevedibile("Qwer1234!")).toBe(true);
    expect(haSequenzaPrevedibile("xxasdfxx")).toBe(true);
  });

  it("non si insospettisce per una password normale", () => {
    expect(haSequenzaPrevedibile(BUONA)).toBe(false);
    expect(haSequenzaPrevedibile("il mio cane si chiama argo")).toBe(false);
  });

  it("blocca il salvataggio", () => {
    expect(validaPassword("Abcd1234!x")).toMatch(/prevedibile/);
  });
});

describe("password comuni", () => {
  it("respinge le parole più prevedibili anche mascherate", () => {
    expect(contieneParolaComune("password")).toBe(true);
    expect(contieneParolaComune("Password1!")).toBe(true);
    expect(contieneParolaComune("PISCINA2026")).toBe(true);
  });

  it("non respinge una password lunga che contiene la parola per caso", () => {
    // La parola comune occupa meno di metà del totale: non è più il punto debole.
    expect(contieneParolaComune("ilmiocanesichiamapassword")).toBe(false);
  });

  it("blocca il salvataggio", () => {
    expect(validaPassword("Password1!")).toMatch(/comune/);
  });
});

describe("dati personali", () => {
  it("riconosce nome, cognome, tessera e parte locale dell'email", () => {
    expect(contieneDatiPersonali("Rossi2026!", SOCIO)).toBe(true);
    expect(contieneDatiPersonali("xxMARIAxx99!", SOCIO)).toBe(true);
    expect(contieneDatiPersonali("maria.rossi-2026!", SOCIO)).toBe(true);
    expect(contieneDatiPersonali(BUONA, SOCIO)).toBe(false);
  });

  it("ignora i frammenti troppo corti per essere indicativi", () => {
    // Una tessera di due caratteri comparirebbe ovunque per caso.
    expect(contieneDatiPersonali("Ombrellone7#", { numeroTessera: "01" })).toBe(false);
  });

  it("blocca il salvataggio", () => {
    expect(validaPassword("Rossi2026!", { contesto: SOCIO })).toMatch(/dati personali/);
  });

  it("il requisito compare solo quando ci sono dati con cui confrontarsi", () => {
    expect(requisiti(BUONA).some((r) => r.id === "personali")).toBe(false);
    expect(requisiti(BUONA, { contesto: SOCIO }).some((r) => r.id === "personali")).toBe(true);
  });
});

describe("elenco dei requisiti", () => {
  it("segna come soddisfatti quelli rispettati", () => {
    const elenco = requisiti(BUONA, { contesto: SOCIO });
    expect(elenco.every((r) => r.soddisfatto)).toBe(true);
  });

  it("isola il singolo requisito non rispettato", () => {
    const elenco = requisiti("Rossi2026!", { contesto: SOCIO });
    const mancanti = elenco.filter((r) => !r.soddisfatto).map((r) => r.id);
    expect(mancanti).toEqual(["personali"]);
  });

  it("su password vuota lunghezza e varietà risultano mancanti", () => {
    // Sequenze e parole comuni sono vacuamente soddisfatte: per questo
    // l'elenco a schermo non accende nulla finché il campo è vuoto.
    expect(requisito("", "lunghezza").soddisfatto).toBe(false);
    expect(requisito("", "classi").soddisfatto).toBe(false);
  });

  it("ogni requisito ha una descrizione e un messaggio d'errore distinti", () => {
    for (const r of requisiti("x", { contesto: SOCIO })) {
      expect(r.descrizione.length).toBeGreaterThan(0);
      expect(r.errore.length).toBeGreaterThan(0);
      expect(r.errore).not.toBe(r.descrizione);
    }
  });
});

describe("password iniziali generate", () => {
  /** Un campione ampio: la generazione è casuale e un solo caso non dice nulla. */
  const campione = Array.from({ length: 200 }, () => generaPasswordLeggibile());

  it("rispetta sempre la politica", () => {
    for (const p of campione) {
      expect(validaPassword(p), `password non conforme: ${p}`).toBeNull();
    }
  });

  it("va bene anche per gli amministratori", () => {
    for (const p of campione) {
      expect(
        validaPassword(p, { lunghezzaMinima: LUNGHEZZA_MINIMA_AMMINISTRATORE }),
        `password non conforme: ${p}`,
      ).toBeNull();
    }
  });

  it("è fatta di parole dettabili separate da trattini", () => {
    for (const p of campione) {
      // Quattro parole di sole lettere minuscole più due cifre finali.
      expect(p, `formato inatteso: ${p}`).toMatch(/^[a-z]+(-[a-z]+){3}-\d{2}$/);
    }
  });

  it("non usa due volte la stessa parola", () => {
    for (const p of campione) {
      const parole = p.split("-").slice(0, 4);
      expect(new Set(parole).size, `parole ripetute in ${p}`).toBe(4);
    }
  });

  it("non si ripete: il campione è quasi tutto diverso", () => {
    // Con questo vocabolario le collisioni sono rarissime; se ne comparissero
    // molte vorrebbe dire che il generatore non sta estraendo davvero a caso.
    expect(new Set(campione).size).toBeGreaterThan(campione.length - 3);
  });

  it("evita le parole che richiamano i dati del socio", () => {
    // «torre» è una delle parole del vocabolario: con questo cognome non deve uscire.
    const contesto = { nome: "Marco", cognome: "Torre", email: "m.torre@example.it" };

    for (let i = 0; i < 200; i++) {
      const p = generaPasswordLeggibile({ contesto });
      expect(p, `contiene i dati del socio: ${p}`).not.toContain("torre");
      expect(validaPassword(p, { contesto })).toBeNull();
    }
  });
});

describe("segnalazione a chi salva", () => {
  it("riporta un problema per volta, nell'ordine dei requisiti", () => {
    // «abc» viola lunghezza, varietà e sequenze: si segnala la lunghezza.
    expect(validaPassword("abc")).toMatch(new RegExp(`almeno ${LUNGHEZZA_MINIMA}`));
  });
});
