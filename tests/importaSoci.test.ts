import { describe, expect, it } from "vitest";
import { analizzaCsv } from "@/lib/csv";
import {
  MAX_RIGHE,
  interpretaCsvSoci,
  normalizzaData,
  normalizzaIntestazione,
  righeTemplate,
} from "@/lib/importaSoci";

const INTESTAZIONI =
  "Numero tessera;Nome;Cognome;Email;Telefono;Scadenza tessera;Scadenza certificato;Note";

/** Costruisce un CSV con le intestazioni ufficiali più le righe indicate. */
function csv(...righe: string[]) {
  return interpretaCsvSoci(analizzaCsv([INTESTAZIONI, ...righe].join("\n")));
}

describe("normalizzazione delle intestazioni", () => {
  it("ignora maiuscole, spazi e punteggiatura", () => {
    expect(normalizzaIntestazione("Numero tessera")).toBe("numerotessera");
    expect(normalizzaIntestazione("NUMERO_TESSERA")).toBe("numerotessera");
    expect(normalizzaIntestazione("numeroTessera")).toBe("numerotessera");
  });

  it("ignora gli accenti", () => {
    expect(normalizzaIntestazione("È-mail")).toBe("email");
  });
});

describe("date", () => {
  it("accetta il formato italiano e lo converte in ISO", () => {
    expect(normalizzaData("31/12/2026")).toBe("2026-12-31");
    expect(normalizzaData("1/6/2027")).toBe("2027-06-01");
  });

  it("accetta punti e trattini come separatori", () => {
    expect(normalizzaData("31.12.2026")).toBe("2026-12-31");
    expect(normalizzaData("31-12-2026")).toBe("2026-12-31");
  });

  it("lascia passare le date già in ISO", () => {
    expect(normalizzaData("2026-12-31")).toBe("2026-12-31");
  });

  it("rifiuta i giorni che non esistono", () => {
    expect(normalizzaData("31/02/2026")).toBeNull();
  });

  it("rifiuta il testo che non è una data", () => {
    expect(normalizzaData("prossimo anno")).toBeNull();
  });
});

describe("interpretazione del file", () => {
  it("legge una riga completa", () => {
    const esito = csv(
      "0042;Maria;Rossi;Maria.Rossi@Example.IT;333 1234567;31/12/2026;30/06/2027;socia storica",
    );

    expect(esito.erroreFatale).toBeNull();
    expect(esito.problemi).toEqual([]);
    expect(esito.righe[0]).toMatchObject({
      riga: 2,
      numeroTessera: "0042",
      nome: "Maria",
      cognome: "Rossi",
      // L'email va normalizzata, altrimenti lo stesso socio potrebbe entrare due volte.
      email: "maria.rossi@example.it",
      scadenzaTessera: "2026-12-31",
      scadenzaCertificato: "2027-06-30",
      note: "socia storica",
    });
  });

  it("tratta le colonne facoltative vuote come assenti, non come stringhe vuote", () => {
    const esito = csv("0042;Maria;Rossi;maria@example.it;;;;");
    expect(esito.righe[0]).toMatchObject({
      telefono: null,
      scadenzaTessera: null,
      scadenzaCertificato: null,
      note: null,
    });
  });

  it("riconosce le colonne anche se scritte diversamente o in altro ordine", () => {
    const esito = interpretaCsvSoci(
      analizzaCsv("cognome;NOME;e-mail;tessera\nRossi;Maria;maria@example.it;0042"),
    );
    expect(esito.erroreFatale).toBeNull();
    expect(esito.righe[0]).toMatchObject({ nome: "Maria", numeroTessera: "0042" });
  });

  it("salta la riga di esempio del template senza segnalarla come errore", () => {
    const esito = interpretaCsvSoci(righeTemplate());
    expect(esito.righe).toEqual([]);
    expect(esito.problemi).toEqual([]);
  });

  it("numera le righe come le vede l'utente nel foglio", () => {
    const esito = csv("0042;Maria;Rossi;maria@example.it", ";Luca;Bianchi;luca@example.it");
    expect(esito.problemi[0].riga).toBe(3);
  });

  it("scarta la riga a cui manca un dato obbligatorio", () => {
    expect(csv("0042;;Rossi;maria@example.it").problemi[0].descrizione).toMatch(/nome/i);
    expect(csv("0042;Maria;Rossi;").problemi[0].descrizione).toMatch(/email/i);
  });

  it("scarta l'email implausibile", () => {
    expect(csv("0042;Maria;Rossi;maria-chiocciola-example").problemi[0].descrizione).toMatch(
      /non è valida/,
    );
  });

  it("scarta la data illeggibile spiegando il formato atteso", () => {
    const esito = csv("0042;Maria;Rossi;maria@example.it;;domani");
    expect(esito.problemi[0].descrizione).toMatch(/31\/12\/2026/);
  });

  it("segnala il doppione interno al file indicando la riga già usata", () => {
    const esito = csv(
      "0042;Maria;Rossi;maria@example.it",
      "0043;Maria;Rossi;MARIA@example.it",
    );

    expect(esito.righe).toHaveLength(1);
    expect(esito.problemi[0].descrizione).toMatch(/riga 2/);
  });

  it("segnala anche il numero di tessera ripetuto", () => {
    const esito = csv("0042;Maria;Rossi;maria@example.it", "0042;Luca;Bianchi;luca@example.it");
    expect(esito.righe).toHaveLength(1);
    expect(esito.problemi[0].descrizione).toMatch(/tessera/i);
  });

  it("importa le righe buone anche quando altre sono da correggere", () => {
    const esito = csv(
      "0042;Maria;Rossi;maria@example.it",
      "0043;;Bianchi;luca@example.it",
      "0044;Giulia;Verdi;giulia@example.it",
    );

    expect(esito.righe.map((r) => r.numeroTessera)).toEqual(["0042", "0044"]);
    expect(esito.problemi).toHaveLength(1);
  });

  it("rifiuta il file a cui mancano colonne obbligatorie", () => {
    const esito = interpretaCsvSoci(analizzaCsv("Nome;Cognome\nMaria;Rossi"));
    expect(esito.erroreFatale).toMatch(/Numero tessera/);
    expect(esito.erroreFatale).toMatch(/Email/);
  });

  it("rifiuta il file vuoto", () => {
    expect(interpretaCsvSoci([]).erroreFatale).toMatch(/vuoto/);
  });

  it("rifiuta i file troppo lunghi invece di rischiare un import a metà", () => {
    const righe = Array.from(
      { length: MAX_RIGHE + 1 },
      (_, i) => `${i};Nome${i};Cognome${i};socio${i}@example.it`,
    );
    expect(csv(...righe).erroreFatale).toMatch(/più parti/);
  });
});
