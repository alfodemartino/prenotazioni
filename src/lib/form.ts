/** Stato condiviso dei form gestiti con `useActionState`. */
export type StatoForm = {
  errore?: string;
  successo?: string;
  /**
   * Valori appena inviati, restituiti insieme all'errore.
   *
   * React azzera i campi del form quando l'azione termina: senza questo, dopo un
   * errore di validazione l'utente si ritroverebbe il modulo vuoto e dovrebbe
   * ridigitare tutto. I componenti li usano come `defaultValue`, così il
   * ripristino automatico riporta ciò che era stato scritto.
   */
  valori?: Record<string, string>;
} | null;

/** Campi che non devono tornare indietro al browser dentro lo stato del form. */
const RISERVATI = new Set(["password", "attuale", "nuova", "conferma"]);

function istantanea(fd: FormData): Record<string, string> {
  const valori: Record<string, string> = {};

  for (const [chiave, valore] of fd.entries()) {
    if (typeof valore !== "string" || RISERVATI.has(chiave)) continue;
    valori[chiave] = valore;
  }

  return valori;
}

/** Passa `fd` per far ricomparire nel form ciò che l'utente aveva inserito. */
export function errore(messaggio: string, fd?: FormData): StatoForm {
  return fd ? { errore: messaggio, valori: istantanea(fd) } : { errore: messaggio };
}

export function successo(messaggio: string): StatoForm {
  return { successo: messaggio };
}

/** Legge un intero da un form. Restituisce NaN se il campo non è un numero. */
export function intero(fd: FormData, campo: string): number {
  const grezzo = fd.get(campo);
  if (grezzo === null || String(grezzo).trim() === "") return NaN;

  const n = Number(grezzo);
  return Number.isFinite(n) ? Math.trunc(n) : NaN;
}

/** Come `intero`, ma un campo vuoto vale `predefinito` invece di NaN. */
export function interoOppure(fd: FormData, campo: string, predefinito: number): number {
  const n = intero(fd, campo);
  return Number.isNaN(n) ? predefinito : n;
}

export function testo(fd: FormData, campo: string): string {
  return String(fd.get(campo) ?? "").trim();
}

/** Campo di testo opzionale: vuoto diventa null, non stringa vuota. */
export function testoOpzionale(fd: FormData, campo: string): string | null {
  const v = testo(fd, campo);
  return v === "" ? null : v;
}

export function booleano(fd: FormData, campo: string): boolean {
  return fd.get(campo) !== null;
}
