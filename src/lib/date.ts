/**
 * Gestione delle date "giornata".
 *
 * Regola di fondo: una giornata è una data pura ("2026-08-06"), non un istante.
 * Tutto ciò che riguarda "oggi" e "che ore sono" viene calcolato nel fuso del
 * circolo, mai in UTC: altrimenti, nelle ore intorno alla mezzanotte, la finestra
 * di prenotazione scorrerebbe di un giorno in anticipo o in ritardo.
 */

export const FUSO = "Europe/Rome";

export type DataISO = string; // "YYYY-MM-DD"

const partiData = new Intl.DateTimeFormat("en-US", {
  timeZone: FUSO,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const partiOra = new Intl.DateTimeFormat("en-US", {
  timeZone: FUSO,
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function parti(fmt: Intl.DateTimeFormat, istante: Date): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of fmt.formatToParts(istante)) out[p.type] = p.value;
  return out;
}

const due = (n: number) => String(n).padStart(2, "0");

/** La data di oggi nel fuso del circolo. */
export function oggiISO(adesso: Date = new Date()): DataISO {
  const p = parti(partiData, adesso);
  return `${p.year}-${p.month}-${p.day}`;
}

/** Minuti trascorsi da mezzanotte nel fuso del circolo (es. 14:30 → 870). */
export function minutiCorrenti(adesso: Date = new Date()): number {
  const p = parti(partiOra, adesso);
  return Number(p.hour) * 60 + Number(p.minute);
}

/** Converte "19:00" in minuti da mezzanotte. Restituisce NaN se il formato è errato. */
export function minutiDaOrario(orario: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(orario.trim());
  if (!m) return NaN;
  const ore = Number(m[1]);
  const minuti = Number(m[2]);
  if (ore > 23 || minuti > 59) return NaN;
  return ore * 60 + minuti;
}

export function isDataISO(valore: unknown): valore is DataISO {
  if (typeof valore !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valore)) return false;
  const [a, m, g] = valore.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1, g));
  // Scarta date inesistenti come 2026-02-30, che JS normalizzerebbe silenziosamente.
  return d.getUTCFullYear() === a && d.getUTCMonth() === m - 1 && d.getUTCDate() === g;
}

/**
 * Somma giorni a una data. L'aritmetica è fatta in UTC di proposito: su un valore
 * senza orario non esiste il problema dell'ora legale, e il risultato è esatto.
 */
export function addGiorni(data: DataISO, giorni: number): DataISO {
  const [a, m, g] = data.split("-").map(Number);
  const d = new Date(Date.UTC(a, m - 1, g));
  d.setUTCDate(d.getUTCDate() + giorni);
  return `${d.getUTCFullYear()}-${due(d.getUTCMonth() + 1)}-${due(d.getUTCDate())}`;
}

/** Differenza in giorni fra due date (b − a). */
export function differenzaGiorni(a: DataISO, b: DataISO): number {
  const ms = Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/**
 * Le giornate prenotabili: da oggi fino a oggi + `giorniFinestra`.
 * Con giorniFinestra = 2 → [oggi, domani, dopodomani].
 */
export function finestraPrenotabile(oggi: DataISO, giorniFinestra: number): DataISO[] {
  const giorni: DataISO[] = [];
  for (let i = 0; i <= Math.max(0, giorniFinestra); i++) giorni.push(addGiorni(oggi, i));
  return giorni;
}

export function nellaFinestra(data: DataISO, oggi: DataISO, giorniFinestra: number): boolean {
  const scarto = differenzaGiorni(oggi, data);
  return scarto >= 0 && scarto <= giorniFinestra;
}

const nomiGiorno = [
  "domenica",
  "lunedì",
  "martedì",
  "mercoledì",
  "giovedì",
  "venerdì",
  "sabato",
];

const nomiMese = [
  "gennaio",
  "febbraio",
  "marzo",
  "aprile",
  "maggio",
  "giugno",
  "luglio",
  "agosto",
  "settembre",
  "ottobre",
  "novembre",
  "dicembre",
];

/** "Oggi", "Domani", "Dopodomani" oppure il nome del giorno della settimana. */
export function etichettaRelativa(data: DataISO, oggi: DataISO): string {
  switch (differenzaGiorni(oggi, data)) {
    case 0:
      return "Oggi";
    case 1:
      return "Domani";
    case 2:
      return "Dopodomani";
    default:
      return capitalizza(nomeGiorno(data));
  }
}

export function nomeGiorno(data: DataISO): string {
  const [a, m, g] = data.split("-").map(Number);
  return nomiGiorno[new Date(Date.UTC(a, m - 1, g)).getUTCDay()];
}

/** "giovedì 6 agosto 2026" */
export function dataEstesa(data: DataISO): string {
  const [a, m, g] = data.split("-").map(Number);
  return `${nomeGiorno(data)} ${g} ${nomiMese[m - 1]} ${a}`;
}

/** "6 agosto" */
export function dataBreve(data: DataISO): string {
  const [, m, g] = data.split("-").map(Number);
  return `${g} ${nomiMese[m - 1]}`;
}

function capitalizza(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
