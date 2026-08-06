import { describe, expect, it } from "vitest";
import {
  cellaCsv,
  checkInConsentito,
  generaCsv,
  percentualeOccupazione,
  presenzeEffettive,
  tassoNoShow,
  totali,
  type PrenotazioneRiepilogo,
} from "@/lib/report";

const OGGI = "2026-08-06";

function pren(over: Partial<PrenotazioneRiepilogo> = {}): PrenotazioneRiepilogo {
  return {
    data: OGGI,
    stato: "ATTIVA",
    adulti: 2,
    bambini: 1,
    ospitiAdulti: 1,
    ospitiBambini: 0,
    checkInIl: null,
    adultiEffettivi: null,
    bambiniEffettivi: null,
    ospitiEffettivi: null,
    ...over,
  };
}

describe("totali di giornata", () => {
  it("somma le categorie e le persone", () => {
    const t = totali([pren(), pren({ adulti: 1, bambini: 0, ospitiAdulti: 0 })], OGGI);
    expect(t).toMatchObject({ prenotazioni: 2, adulti: 3, bambini: 1, ospiti: 1, persone: 5 });
  });

  it("ignora le prenotazioni annullate", () => {
    const t = totali([pren(), pren({ stato: "ANNULLATA", adulti: 10 })], OGGI);
    expect(t.prenotazioni).toBe(1);
    expect(t.adulti).toBe(2);
  });

  it("conta i presenti in base al check-in", () => {
    const t = totali([pren({ checkInIl: new Date() }), pren()], OGGI);
    expect(t.presenti).toBe(1);
  });

  it("segna assente solo chi non si è presentato in una giornata già conclusa", () => {
    const ieri = "2026-08-05";
    const t = totali(
      [
        pren({ data: ieri }), // conclusa, nessun check-in → assente
        pren({ data: ieri, checkInIl: new Date() }), // conclusa, presente
        pren({ data: OGGI }), // oggi: ancora in tempo per arrivare
      ],
      OGGI,
    );
    expect(t.assenti).toBe(1);
    expect(t.presenti).toBe(1);
  });
});

describe("quando si può registrare un ingresso", () => {
  it("consente il giorno stesso", () => {
    expect(checkInConsentito(OGGI, OGGI)).toBe(true);
  });

  it("consente le giornate passate, per recuperare un ingresso dimenticato", () => {
    expect(checkInConsentito("2026-08-05", OGGI)).toBe(true);
    expect(checkInConsentito("2026-07-01", OGGI)).toBe(true);
  });

  it("vieta le giornate future: nessuno è ancora entrato", () => {
    expect(checkInConsentito("2026-08-07", OGGI)).toBe(false);
    expect(checkInConsentito("2026-12-31", OGGI)).toBe(false);
  });

  it("il confine è la giornata, non l'orario", () => {
    // Domani resta vietato anche a un minuto dalla mezzanotte.
    expect(checkInConsentito("2026-08-07", "2026-08-06")).toBe(false);
    // E diventa consentito appena domani è diventato oggi.
    expect(checkInConsentito("2026-08-07", "2026-08-07")).toBe(true);
  });
});

describe("presenze effettive", () => {
  it("vale zero finché non c'è il check-in", () => {
    expect(presenzeEffettive(pren())).toEqual({ adulti: 0, bambini: 0, ospiti: 0 });
  });

  it("in assenza di correzioni assume il gruppo dichiarato", () => {
    expect(presenzeEffettive(pren({ checkInIl: new Date() }))).toEqual({
      adulti: 2,
      bambini: 1,
      ospiti: 1,
    });
  });

  it("dà la precedenza ai numeri corretti dalla reception", () => {
    const p = pren({
      checkInIl: new Date(),
      adultiEffettivi: 1,
      bambiniEffettivi: 0,
      ospitiEffettivi: 3,
    });
    expect(presenzeEffettive(p)).toEqual({ adulti: 1, bambini: 0, ospiti: 3 });
  });

  it("distingue una correzione a zero dall'assenza di correzione", () => {
    const p = pren({ checkInIl: new Date(), ospitiEffettivi: 0 });
    expect(presenzeEffettive(p).ospiti).toBe(0);
  });
});

describe("indicatori", () => {
  it("calcola la percentuale di occupazione", () => {
    expect(percentualeOccupazione(40, 80)).toBe(50);
    expect(percentualeOccupazione(88, 80)).toBe(110); // overbooking: si supera il 100%
    expect(percentualeOccupazione(10, 0)).toBe(0); // capienza a zero: nessuna divisione per zero
  });

  it("calcola il tasso di no-show sulle sole giornate concluse", () => {
    expect(tassoNoShow(9, 1)).toBe(10);
    expect(tassoNoShow(0, 0)).toBe(0);
    expect(tassoNoShow(0, 5)).toBe(100);
  });
});

describe("esportazione CSV", () => {
  it("protegge le celle che contengono separatori o virgolette", () => {
    expect(cellaCsv("Rossi")).toBe("Rossi");
    expect(cellaCsv("Rossi; Maria")).toBe('"Rossi; Maria"');
    expect(cellaCsv('Detto "il lungo"')).toBe('"Detto ""il lungo"""');
    expect(cellaCsv("prima\nseconda")).toBe('"prima\nseconda"');
  });

  it("usa il punto e virgola e apre correttamente in Excel italiano", () => {
    const csv = generaCsv([
      ["Data", "Socio", "Adulti"],
      ["2026-08-06", "Rossi Maria", 2],
    ]);

    expect(csv.startsWith("﻿")).toBe(true); // BOM: senza, gli accenti si rompono
    expect(csv).toContain("Data;Socio;Adulti");
    expect(csv).toContain("2026-08-06;Rossi Maria;2");
    expect(csv).toContain("\r\n");
  });
});
