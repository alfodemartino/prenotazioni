import type { Gruppo, StatoGiornata } from "./disponibilita";

/** Colori del badge di stato, coerenti fra home e schermata di prenotazione. */
export const CLASSI_BADGE: Record<StatoGiornata, string> = {
  DISPONIBILE: "bg-emerald-100 text-emerald-800",
  ULTIMI_POSTI: "bg-amber-100 text-amber-800",
  ESAURITA: "bg-rose-100 text-rose-800",
  CHIUSA: "bg-slate-200 text-slate-600",
  TERMINATA: "bg-slate-200 text-slate-600",
  FUORI_FINESTRA: "bg-slate-200 text-slate-600",
};

/** "3 posti" / "1 posto" — l'italiano non perdona il plurale sbagliato. */
export function posti(n: number): string {
  return `${n} ${n === 1 ? "posto" : "posti"}`;
}

export function persone(n: number): string {
  return `${n} ${n === 1 ? "persona" : "persone"}`;
}

/** "2 adulti · 1 bambino · 3 ospiti", saltando le categorie a zero. */
export function descriviGruppo(gruppo: Gruppo): string {
  const parti: string[] = [];

  if (gruppo.adulti > 0) {
    parti.push(`${gruppo.adulti} ${gruppo.adulti === 1 ? "adulto" : "adulti"}`);
  }
  if (gruppo.bambini > 0) {
    parti.push(`${gruppo.bambini} ${gruppo.bambini === 1 ? "bambino" : "bambini"}`);
  }

  const ospiti = gruppo.ospitiAdulti + gruppo.ospitiBambini;
  if (ospiti > 0) parti.push(`${ospiti} ${ospiti === 1 ? "ospite" : "ospiti"}`);

  return parti.join(" · ");
}
