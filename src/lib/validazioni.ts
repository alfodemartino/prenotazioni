/**
 * Validazioni dei dati inseriti dall'amministrazione.
 *
 * Funzioni pure che restituiscono il messaggio d'errore da mostrare, oppure null
 * se il dato è accettabile. Stanno qui e non nei form perché il controllo deve
 * valere sul server: un campo disabilitato nel browser non protegge il database.
 */

import { isDataISO, minutiDaOrario, type DataISO } from "./date";

export function normalizzaEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Controllo volutamente permissivo: serve a intercettare i refusi, non a certificare l'indirizzo. */
export function emailPlausibile(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function validaOrari(apertura: string, chiusura: string): string | null {
  const a = minutiDaOrario(apertura);
  const c = minutiDaOrario(chiusura);

  if (Number.isNaN(a) || Number.isNaN(c)) return "Gli orari devono essere nel formato HH:MM.";
  if (c <= a) return "L'orario di chiusura deve essere successivo a quello di apertura.";

  return null;
}

export interface ConfigGiornataInput {
  capienzaAdulti: number;
  overbookingPct: number;
  oraApertura: string;
  oraChiusura: string;
}

export function validaConfigGiornata(i: ConfigGiornataInput): string | null {
  if (!Number.isInteger(i.capienzaAdulti) || i.capienzaAdulti < 0) {
    return "La capienza deve essere un numero intero non negativo.";
  }
  if (i.capienzaAdulti > 10_000) {
    return "La capienza indicata non è plausibile.";
  }
  if (!Number.isInteger(i.overbookingPct) || i.overbookingPct < 0 || i.overbookingPct > 100) {
    return "L'overbooking deve essere una percentuale fra 0 e 100.";
  }

  return validaOrari(i.oraApertura, i.oraChiusura);
}

export interface ImpostazioniInput extends ConfigGiornataInput {
  nomeCircolo: string;
  giorniFinestra: number;
  tariffaOspiteAdultoCent: number;
  tariffaOspiteBambinoCent: number;
  sogliaUltimiPosti: number;
  maxPersonePerPrenotazione: number;
}

export function validaImpostazioni(i: ImpostazioniInput): string | null {
  if (!i.nomeCircolo.trim()) return "Il nome del circolo non può essere vuoto.";

  const erroreGiornata = validaConfigGiornata(i);
  if (erroreGiornata) return erroreGiornata;

  if (!Number.isInteger(i.giorniFinestra) || i.giorniFinestra < 0 || i.giorniFinestra > 30) {
    return "I giorni prenotabili oltre oggi devono essere fra 0 e 30.";
  }
  if (
    !Number.isInteger(i.tariffaOspiteAdultoCent) ||
    i.tariffaOspiteAdultoCent < 0 ||
    !Number.isInteger(i.tariffaOspiteBambinoCent) ||
    i.tariffaOspiteBambinoCent < 0
  ) {
    return "Le tariffe ospiti non possono essere negative.";
  }
  if (!Number.isInteger(i.sogliaUltimiPosti) || i.sogliaUltimiPosti < 0) {
    return "La soglia «ultimi posti» non può essere negativa.";
  }
  if (!Number.isInteger(i.maxPersonePerPrenotazione) || i.maxPersonePerPrenotazione < 1) {
    return "Una prenotazione deve poter contenere almeno una persona.";
  }

  return null;
}

export interface SocioInput {
  nome: string;
  cognome: string;
  email: string;
  numeroTessera: string;
  scadenzaTessera: string | null;
  scadenzaCertificato: string | null;
}

export function validaSocio(i: SocioInput): string | null {
  if (!i.nome.trim()) return "Il nome è obbligatorio.";
  if (!i.cognome.trim()) return "Il cognome è obbligatorio.";
  if (!i.numeroTessera.trim()) return "Il numero di tessera è obbligatorio.";
  if (!emailPlausibile(normalizzaEmail(i.email))) return "L'indirizzo email non è valido.";

  for (const [valore, nome] of [
    [i.scadenzaTessera, "della tessera"],
    [i.scadenzaCertificato, "del certificato medico"],
  ] as const) {
    if (valore && !isDataISO(valore)) return `La data di scadenza ${nome} non è valida.`;
  }

  return null;
}

/** Converte "12,50" o "12.50" in centesimi. NaN se il testo non è un importo. */
export function euroInCentesimi(testo: string): number {
  const pulito = testo.trim().replace(/\s|€/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(pulito)) return NaN;
  return Math.round(Number(pulito) * 100);
}

/** Inverso di euroInCentesimi, per riempire i campi del form. */
export function centesimiInEuro(centesimi: number): string {
  return (centesimi / 100).toFixed(2).replace(".", ",");
}

export function validaIntervallo(da: DataISO, a: DataISO): string | null {
  if (!isDataISO(da) || !isDataISO(a)) return "Le date indicate non sono valide.";
  if (a < da) return "La data finale deve essere successiva a quella iniziale.";
  return null;
}
