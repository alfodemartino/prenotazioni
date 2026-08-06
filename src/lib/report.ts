/**
 * Aggregazioni per il registro presenze e i report.
 * Funzioni pure: ricevono le prenotazioni già lette dal database.
 */

import type { DataISO } from "./date";

export const STATO_ATTIVA = "ATTIVA";

export interface PrenotazioneRiepilogo {
  data: DataISO;
  stato: string;
  adulti: number;
  bambini: number;
  ospitiAdulti: number;
  ospitiBambini: number;
  checkInIl: Date | null;
  adultiEffettivi: number | null;
  bambiniEffettivi: number | null;
  ospitiEffettivi: number | null;
}

export interface Totali {
  prenotazioni: number;
  adulti: number;
  bambini: number;
  ospiti: number;
  persone: number;
  presenti: number;
  /** Prenotazioni attive di giornate già concluse senza check-in. */
  assenti: number;
}

/**
 * Totali attesi di una giornata. Conta solo le prenotazioni attive: le annullate
 * non devono comparire né nelle presenze attese né nelle statistiche.
 */
export function totali(prenotazioni: PrenotazioneRiepilogo[], oggi: DataISO): Totali {
  const attive = prenotazioni.filter((p) => p.stato === STATO_ATTIVA);

  const t: Totali = {
    prenotazioni: attive.length,
    adulti: 0,
    bambini: 0,
    ospiti: 0,
    persone: 0,
    presenti: 0,
    assenti: 0,
  };

  for (const p of attive) {
    t.adulti += p.adulti;
    t.bambini += p.bambini;
    t.ospiti += p.ospitiAdulti + p.ospitiBambini;

    if (p.checkInIl) t.presenti += 1;
    else if (p.data < oggi) t.assenti += 1;
  }

  t.persone = t.adulti + t.bambini + t.ospiti;
  return t;
}

/**
 * Il check-in attesta che qualcuno è entrato, quindi non può riguardare una
 * giornata che deve ancora arrivare.
 *
 * Resta consentito per oggi e per i giorni passati: capita di registrare gli
 * ingressi a fine giornata o di recuperarne uno dimenticato il mattino dopo.
 */
export function checkInConsentito(data: DataISO, oggi: DataISO): boolean {
  return data <= oggi;
}

/**
 * Presenze realmente registrate alla reception. Se la segreteria ha corretto i
 * numeri all'ingresso valgono quelli, altrimenti si assume che sia arrivato il
 * gruppo dichiarato.
 */
export function presenzeEffettive(p: PrenotazioneRiepilogo): {
  adulti: number;
  bambini: number;
  ospiti: number;
} {
  if (!p.checkInIl) return { adulti: 0, bambini: 0, ospiti: 0 };

  return {
    adulti: p.adultiEffettivi ?? p.adulti,
    bambini: p.bambiniEffettivi ?? p.bambini,
    ospiti: p.ospitiEffettivi ?? p.ospitiAdulti + p.ospitiBambini,
  };
}

/** Percentuale di riempimento sulla capienza nominale, arrotondata all'intero. */
export function percentualeOccupazione(adulti: number, capienza: number): number {
  if (capienza <= 0) return 0;
  return Math.round((adulti / capienza) * 100);
}

/** Quota di prenotazioni non presentate, in percentuale sulle giornate concluse. */
export function tassoNoShow(presenti: number, assenti: number): number {
  const concluse = presenti + assenti;
  if (concluse <= 0) return 0;
  return Math.round((assenti / concluse) * 100);
}

// ---------------------------------------------------------------------------
// Esportazione CSV
// ---------------------------------------------------------------------------

/** Racchiude fra virgolette solo quando serve, raddoppiando quelle interne. */
export function cellaCsv(valore: string | number): string {
  const s = String(valore ?? "");
  return /[";\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * CSV con separatore `;` e BOM iniziale: è il formato che Excel in italiano apre
 * correttamente al doppio clic, accenti compresi.
 */
export function generaCsv(righe: (string | number)[][]): string {
  return "﻿" + righe.map((r) => r.map(cellaCsv).join(";")).join("\r\n");
}
