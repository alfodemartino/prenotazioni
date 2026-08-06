/**
 * Motore di disponibilità.
 *
 * Tutte le funzioni di questo file sono pure: ricevono lo stato già letto dal
 * database e non fanno né query né chiamate all'orologio di sistema. È una scelta
 * deliberata — sono le regole di business del circolo, e devono poter essere
 * verificate dai test in ogni combinazione, compresi i casi limite (mezzanotte,
 * giornata in overbooking, tessera che scade domani) che sarebbero scomodi da
 * riprodurre con un database vero.
 *
 * Chi consuma capienza: SOLO gli adulti tesserati. Bambini e ospiti vengono
 * registrati per sapere chi è in struttura e per calcolare il dovuto indicativo,
 * ma non sottraggono posti.
 */

import { differenzaGiorni, minutiDaOrario, type DataISO } from "./date";

export interface ConfigGiornata {
  data: DataISO;
  aperta: boolean;
  capienzaAdulti: number;
  overbookingPct: number;
  oraApertura: string;
  oraChiusura: string;
}

export interface ContestoTemporale {
  /** Data di oggi nel fuso del circolo. */
  oggi: DataISO;
  /** Minuti da mezzanotte nel fuso del circolo. */
  minutiCorrenti: number;
  /** Quanti giorni oltre oggi sono prenotabili. */
  giorniFinestra: number;
}

export interface Gruppo {
  adulti: number;
  bambini: number;
  ospitiAdulti: number;
  ospitiBambini: number;
}

export interface StatoSocio {
  stato: string;
  scadenzaTessera: DataISO | null;
  scadenzaCertificato: DataISO | null;
}

export interface Vincoli {
  maxPersonePerPrenotazione: number;
  sogliaUltimiPosti: number;
  controlloCertificato: boolean;
}

export type StatoGiornata =
  | "FUORI_FINESTRA"
  | "CHIUSA"
  | "TERMINATA"
  | "ESAURITA"
  | "ULTIMI_POSTI"
  | "DISPONIBILE";

export type CodiceBlocco =
  | "GRUPPO_NON_VALIDO"
  | "SOCIO_SOSPESO"
  | "TESSERA_SCADUTA"
  | "CERTIFICATO_SCADUTO"
  | "FUORI_FINESTRA"
  | "GIORNATA_CHIUSA"
  | "GIORNATA_TERMINATA"
  | "CAPIENZA_INSUFFICIENTE";

export type Esito =
  | { ok: true; postiResidui: number }
  | { ok: false; codice: CodiceBlocco; messaggio: string };

// ---------------------------------------------------------------------------
// Capienza
// ---------------------------------------------------------------------------

/**
 * Posti realmente vendibili in una giornata, overbooking incluso.
 * Si arrotonda per difetto: con 80 posti e 10% di tolleranza il limite è 88, non 88,5.
 */
export function limitePosti(capienzaAdulti: number, overbookingPct: number): number {
  return Math.floor(capienzaAdulti * (1 + overbookingPct / 100));
}

/** Posti ancora disponibili. Può essere negativo se l'admin ha ridotto la capienza a giornata già piena. */
export function postiResidui(giornata: ConfigGiornata, adultiOccupati: number): number {
  return limitePosti(giornata.capienzaAdulti, giornata.overbookingPct) - adultiOccupati;
}

/** True quando si è oltre la capienza nominale e si sta attingendo alla tolleranza. */
export function inOverbooking(giornata: ConfigGiornata, adultiOccupati: number): boolean {
  return adultiOccupati > giornata.capienzaAdulti;
}

// ---------------------------------------------------------------------------
// Tempo
// ---------------------------------------------------------------------------

export function nellaFinestra(data: DataISO, ctx: ContestoTemporale): boolean {
  const scarto = differenzaGiorni(ctx.oggi, data);
  return scarto >= 0 && scarto <= ctx.giorniFinestra;
}

/**
 * Una giornata è "terminata" solo se è oggi e la piscina ha già chiuso.
 * Per i giorni futuri l'orario corrente è irrilevante.
 */
export function giornataTerminata(giornata: ConfigGiornata, ctx: ContestoTemporale): boolean {
  if (giornata.data !== ctx.oggi) return false;
  const chiusura = minutiDaOrario(giornata.oraChiusura);
  if (Number.isNaN(chiusura)) return false; // orario malformato: non blocchiamo il socio
  return ctx.minutiCorrenti >= chiusura;
}

// ---------------------------------------------------------------------------
// Stato sintetico mostrato sulla scheda della giornata
// ---------------------------------------------------------------------------

export function statoGiornata(
  giornata: ConfigGiornata,
  adultiOccupati: number,
  ctx: ContestoTemporale,
  sogliaUltimiPosti: number,
): StatoGiornata {
  if (!nellaFinestra(giornata.data, ctx)) return "FUORI_FINESTRA";
  if (!giornata.aperta) return "CHIUSA";
  if (giornataTerminata(giornata, ctx)) return "TERMINATA";

  const residui = postiResidui(giornata, adultiOccupati);
  if (residui <= 0) return "ESAURITA";
  if (residui <= sogliaUltimiPosti) return "ULTIMI_POSTI";
  return "DISPONIBILE";
}

const ETICHETTE: Record<StatoGiornata, string> = {
  FUORI_FINESTRA: "Non ancora prenotabile",
  CHIUSA: "Chiusa",
  TERMINATA: "Non più prenotabile",
  ESAURITA: "Esaurita",
  ULTIMI_POSTI: "Ultimi posti",
  DISPONIBILE: "Disponibile",
};

export function etichettaStato(stato: StatoGiornata): string {
  return ETICHETTE[stato];
}

export function statoPrenotabile(stato: StatoGiornata): boolean {
  return stato === "DISPONIBILE" || stato === "ULTIMI_POSTI";
}

// ---------------------------------------------------------------------------
// Validazione del gruppo
// ---------------------------------------------------------------------------

export function totalePersone(gruppo: Gruppo): number {
  return gruppo.adulti + gruppo.bambini + gruppo.ospitiAdulti + gruppo.ospitiBambini;
}

export function totaleOspiti(gruppo: Gruppo): number {
  return gruppo.ospitiAdulti + gruppo.ospitiBambini;
}

/** Restituisce il messaggio d'errore, oppure null se il gruppo è valido. */
export function validaGruppo(gruppo: Gruppo, maxPersone: number): string | null {
  const campi: [keyof Gruppo, string][] = [
    ["adulti", "adulti"],
    ["bambini", "bambini"],
    ["ospitiAdulti", "ospiti adulti"],
    ["ospitiBambini", "ospiti bambini"],
  ];

  for (const [campo, nome] of campi) {
    const v = gruppo[campo];
    if (!Number.isInteger(v) || v < 0) return `Il numero di ${nome} non è valido.`;
  }

  // Il socio che prenota è sempre incluso nel conteggio degli adulti:
  // senza almeno un adulto non ci sarebbe nessun responsabile del gruppo.
  if (gruppo.adulti < 1) return "Serve almeno un adulto tesserato nel gruppo.";

  const totale = totalePersone(gruppo);
  if (totale > maxPersone) {
    return `Una prenotazione può includere al massimo ${maxPersone} persone (ne hai indicate ${totale}).`;
  }

  return null;
}

// ---------------------------------------------------------------------------
// Verifica completa
// ---------------------------------------------------------------------------

export interface RichiestaPrenotazione {
  giornata: ConfigGiornata;
  /** Somma degli adulti di TUTTE le prenotazioni attive della giornata. */
  adultiOccupati: number;
  /**
   * Adulti già occupati dalla prenotazione che il socio sta modificando.
   * Vanno scomputati, altrimenti modificare la propria prenotazione da 4 a 5 adulti
   * verrebbe confrontato con la capienza come se se ne chiedessero 5 nuovi.
   * Vale 0 quando si crea una prenotazione nuova.
   */
  adultiGiaMiei: number;
  gruppo: Gruppo;
  socio: StatoSocio;
  ctx: ContestoTemporale;
  vincoli: Vincoli;
}

export function verificaPrenotabilita(r: RichiestaPrenotazione): Esito {
  const { giornata, gruppo, socio, ctx, vincoli } = r;

  const erroreGruppo = validaGruppo(gruppo, r.vincoli.maxPersonePerPrenotazione);
  if (erroreGruppo) {
    return { ok: false, codice: "GRUPPO_NON_VALIDO", messaggio: erroreGruppo };
  }

  if (socio.stato !== "ATTIVO") {
    return {
      ok: false,
      codice: "SOCIO_SOSPESO",
      messaggio: "Il tuo profilo è sospeso. Rivolgiti alla segreteria.",
    };
  }

  // Le scadenze si confrontano con il giorno di accesso, non con oggi: una tessera
  // che scade domani non deve consentire di prenotare per dopodomani.
  if (socio.scadenzaTessera && socio.scadenzaTessera < giornata.data) {
    return {
      ok: false,
      codice: "TESSERA_SCADUTA",
      messaggio: `La tua tessera scade il ${formattaData(socio.scadenzaTessera)} e non copre questa giornata.`,
    };
  }

  if (
    vincoli.controlloCertificato &&
    socio.scadenzaCertificato &&
    socio.scadenzaCertificato < giornata.data
  ) {
    return {
      ok: false,
      codice: "CERTIFICATO_SCADUTO",
      messaggio: `Il tuo certificato medico scade il ${formattaData(socio.scadenzaCertificato)} e non copre questa giornata.`,
    };
  }

  if (!nellaFinestra(giornata.data, ctx)) {
    return {
      ok: false,
      codice: "FUORI_FINESTRA",
      messaggio: `Si può prenotare solo per oggi e per i ${ctx.giorniFinestra} giorni successivi.`,
    };
  }

  if (!giornata.aperta) {
    return {
      ok: false,
      codice: "GIORNATA_CHIUSA",
      messaggio: "La piscina è chiusa in questa giornata.",
    };
  }

  if (giornataTerminata(giornata, ctx)) {
    return {
      ok: false,
      codice: "GIORNATA_TERMINATA",
      messaggio: `La piscina ha chiuso alle ${giornata.oraChiusura}: non è più possibile prenotare per oggi.`,
    };
  }

  const occupatiSenzaDiMe = r.adultiOccupati - r.adultiGiaMiei;
  const residui = postiResidui(giornata, occupatiSenzaDiMe);

  if (gruppo.adulti > residui) {
    return {
      ok: false,
      codice: "CAPIENZA_INSUFFICIENTE",
      messaggio:
        residui <= 0
          ? "La giornata è al completo."
          : `Restano solo ${residui} ${residui === 1 ? "posto" : "posti"} per adulti tesserati.`,
    };
  }

  return { ok: true, postiResidui: residui - gruppo.adulti };
}

// ---------------------------------------------------------------------------
// Costo indicativo degli ospiti (si paga in contanti alla reception)
// ---------------------------------------------------------------------------

export interface Tariffe {
  tariffaOspiteAdultoCent: number;
  tariffaOspiteBambinoCent: number;
}

export function costoOspitiCent(gruppo: Gruppo, tariffe: Tariffe): number {
  return (
    gruppo.ospitiAdulti * tariffe.tariffaOspiteAdultoCent +
    gruppo.ospitiBambini * tariffe.tariffaOspiteBambinoCent
  );
}

export function formattaEuro(centesimi: number): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency: "EUR" }).format(
    centesimi / 100,
  );
}

function formattaData(data: DataISO): string {
  const [a, m, g] = data.split("-");
  return `${g}/${m}/${a}`;
}
