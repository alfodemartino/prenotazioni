/**
 * Politica sui tentativi di accesso falliti.
 *
 * Funzioni pure: ricevono gli istanti dei fallimenti già letti dal database.
 * Serve a rendere inutile provare password a raffica una volta che l'app è
 * raggiungibile da internet.
 */

export interface Politica {
  /** Quanti fallimenti si tollerano dentro la finestra prima di bloccare. */
  limite: number;
  /** Ampiezza della finestra, in minuti. */
  finestraMinuti: number;
}

/**
 * Limite per singolo account: protegge il socio preso di mira.
 * Cinque errori sono più che sufficienti a chi la password ce l'ha davvero.
 */
export const POLITICA_ACCOUNT: Politica = { limite: 5, finestraMinuti: 15 };

/**
 * Limite per indirizzo di rete: frena chi prova molti account diversi.
 * È più largo perché dietro allo stesso indirizzo può esserci tutto il circolo.
 */
export const POLITICA_INDIRIZZO: Politica = { limite: 20, finestraMinuti: 15 };

const MINUTO = 60_000;

/**
 * Istante fino al quale l'accesso resta bloccato, oppure null se è consentito.
 *
 * La finestra è scorrevole: il blocco si scioglie quando il fallimento che ha
 * fatto raggiungere il limite esce dalla finestra, non a orario fisso.
 */
export function bloccoFinoA(
  fallimenti: Date[],
  politica: Politica,
  adesso: Date,
): Date | null {
  const inizioFinestra = adesso.getTime() - politica.finestraMinuti * MINUTO;

  const recenti = fallimenti
    .map((d) => d.getTime())
    .filter((t) => t > inizioFinestra)
    .sort((a, b) => b - a); // dal più recente

  if (recenti.length < politica.limite) return null;

  const fine = recenti[politica.limite - 1] + politica.finestraMinuti * MINUTO;
  return fine > adesso.getTime() ? new Date(fine) : null;
}

/** Minuti da aspettare, arrotondati per eccesso e mai inferiori a uno. */
export function minutiDiAttesa(fine: Date, adesso: Date): number {
  return Math.max(1, Math.ceil((fine.getTime() - adesso.getTime()) / MINUTO));
}

/**
 * Messaggio mostrato a chi è bloccato. Non distingue fra account inesistente e
 * password sbagliata: non deve diventare un modo per scoprire quali email
 * sono registrate nel circolo.
 */
export function messaggioBlocco(minuti: number): string {
  const attesa = minuti === 1 ? "un minuto" : `${minuti} minuti`;
  return `Troppi tentativi di accesso falliti. Riprova fra ${attesa}.`;
}

/** Il blocco più restrittivo fra quelli applicabili, o null se si può procedere. */
export function bloccoPiuRestrittivo(...blocchi: (Date | null)[]): Date | null {
  const attivi = blocchi.filter((b): b is Date => b !== null);
  if (attivi.length === 0) return null;

  return new Date(Math.max(...attivi.map((b) => b.getTime())));
}
