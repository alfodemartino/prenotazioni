import { describe, expect, it } from "vitest";
import {
  addGiorni,
  dataEstesa,
  differenzaGiorni,
  etichettaRelativa,
  finestraPrenotabile,
  isDataISO,
  minutiCorrenti,
  minutiDaOrario,
  nellaFinestra,
  oggiISO,
} from "@/lib/date";

describe("oggiISO — il giorno è quello del circolo, non quello UTC", () => {
  it("a Roma è già domani quando a Greenwich è ancora oggi (ora legale, UTC+2)", () => {
    // 23:30 UTC del 6 agosto = 01:30 del 7 agosto a Roma.
    expect(oggiISO(new Date("2026-08-06T23:30:00Z"))).toBe("2026-08-07");
  });

  it("stesso comportamento in inverno (UTC+1)", () => {
    expect(oggiISO(new Date("2026-01-01T23:30:00Z"))).toBe("2026-01-02");
  });

  it("prima di mezzanotte romana il giorno non è ancora cambiato", () => {
    // 21:00 UTC = 23:00 a Roma d'estate.
    expect(oggiISO(new Date("2026-08-06T21:00:00Z"))).toBe("2026-08-06");
  });
});

describe("minutiCorrenti", () => {
  it("converte l'ora romana in minuti da mezzanotte", () => {
    // 12:00 UTC = 14:00 a Roma d'estate.
    expect(minutiCorrenti(new Date("2026-08-06T12:00:00Z"))).toBe(14 * 60);
  });

  it("mezzanotte romana vale 0, non 1440", () => {
    expect(minutiCorrenti(new Date("2026-08-06T22:00:00Z"))).toBe(0);
  });
});

describe("minutiDaOrario", () => {
  it("accetta gli orari validi", () => {
    expect(minutiDaOrario("19:00")).toBe(1140);
    expect(minutiDaOrario("09:30")).toBe(570);
    expect(minutiDaOrario("9:30")).toBe(570);
    expect(minutiDaOrario("00:00")).toBe(0);
    expect(minutiDaOrario("23:59")).toBe(1439);
  });

  it("rifiuta gli orari impossibili o malformati", () => {
    expect(minutiDaOrario("25:00")).toBeNaN();
    expect(minutiDaOrario("12:70")).toBeNaN();
    expect(minutiDaOrario("mezzogiorno")).toBeNaN();
    expect(minutiDaOrario("")).toBeNaN();
  });
});

describe("addGiorni", () => {
  it("attraversa il cambio dell'ora legale senza slittare", () => {
    // In Italia nel 2026 l'ora legale scatta il 29 marzo.
    expect(addGiorni("2026-03-28", 1)).toBe("2026-03-29");
    expect(addGiorni("2026-03-28", 2)).toBe("2026-03-30");
    expect(addGiorni("2026-10-24", 2)).toBe("2026-10-26"); // ritorno all'ora solare
  });

  it("attraversa fine mese e fine anno", () => {
    expect(addGiorni("2026-12-31", 1)).toBe("2027-01-01");
    expect(addGiorni("2026-01-31", 1)).toBe("2026-02-01");
    expect(addGiorni("2024-02-28", 1)).toBe("2024-02-29"); // anno bisestile
  });

  it("accetta valori negativi", () => {
    expect(addGiorni("2026-01-01", -1)).toBe("2025-12-31");
  });
});

describe("differenzaGiorni", () => {
  it("conta i giorni fra due date", () => {
    expect(differenzaGiorni("2026-08-06", "2026-08-08")).toBe(2);
    expect(differenzaGiorni("2026-08-08", "2026-08-06")).toBe(-2);
    expect(differenzaGiorni("2026-08-06", "2026-08-06")).toBe(0);
  });

  it("non si lascia sviare dal cambio dell'ora legale", () => {
    expect(differenzaGiorni("2026-03-28", "2026-03-30")).toBe(2);
  });
});

describe("finestra di prenotazione", () => {
  it("con giorniFinestra = 2 espone oggi, domani e dopodomani", () => {
    expect(finestraPrenotabile("2026-08-06", 2)).toEqual([
      "2026-08-06",
      "2026-08-07",
      "2026-08-08",
    ]);
  });

  it("include oggi ed esclude ieri e il quarto giorno", () => {
    const oggi = "2026-08-06";
    expect(nellaFinestra("2026-08-05", oggi, 2)).toBe(false);
    expect(nellaFinestra("2026-08-06", oggi, 2)).toBe(true);
    expect(nellaFinestra("2026-08-08", oggi, 2)).toBe(true);
    expect(nellaFinestra("2026-08-09", oggi, 2)).toBe(false);
  });
});

describe("isDataISO", () => {
  it("accetta date reali", () => {
    expect(isDataISO("2026-08-06")).toBe(true);
    expect(isDataISO("2024-02-29")).toBe(true);
  });

  it("rifiuta date inesistenti e formati sbagliati", () => {
    expect(isDataISO("2026-02-30")).toBe(false);
    expect(isDataISO("2026-13-01")).toBe(false);
    expect(isDataISO("2026-8-6")).toBe(false);
    expect(isDataISO("06/08/2026")).toBe(false);
    expect(isDataISO(null)).toBe(false);
  });
});

describe("etichette in italiano", () => {
  it("nomina i tre giorni della finestra", () => {
    const oggi = "2026-08-06";
    expect(etichettaRelativa("2026-08-06", oggi)).toBe("Oggi");
    expect(etichettaRelativa("2026-08-07", oggi)).toBe("Domani");
    expect(etichettaRelativa("2026-08-08", oggi)).toBe("Dopodomani");
  });

  it("scrive la data per esteso", () => {
    expect(dataEstesa("2026-08-06")).toBe("giovedì 6 agosto 2026");
  });
});
