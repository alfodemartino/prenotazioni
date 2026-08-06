/**
 * Accesso alle impostazioni del circolo.
 *
 * Esiste una sola riga (id = 1). Tutti i valori sono modificabili dal pannello
 * admin, sezione Configurazioni: nel codice non deve comparire nessuna costante
 * di business, solo i default usati alla prima installazione.
 */

import { prisma } from "./db";
import type { Impostazioni } from "@prisma/client";

/** Valori di partenza. Sono segnaposto: vanno rivisti insieme al circolo. */
export const DEFAULT_IMPOSTAZIONI = {
  nomeCircolo: "Circolo Piscina",
  capienzaAdultiDefault: 80,
  overbookingPct: 10,
  giorniFinestra: 2,
  oraAperturaDefault: "09:00",
  oraChiusuraDefault: "19:00",
  tariffaOspiteAdultoCent: 1000,
  tariffaOspiteBambinoCent: 500,
  sogliaUltimiPosti: 5,
  maxPersonePerPrenotazione: 20,
  controlloCertificato: false,
} as const;

/** Legge le impostazioni, creandole con i valori di default se non esistono ancora. */
export async function leggiImpostazioni(): Promise<Impostazioni> {
  return prisma.impostazioni.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, ...DEFAULT_IMPOSTAZIONI },
  });
}

export async function aggiornaImpostazioni(
  dati: Partial<Omit<Impostazioni, "id" | "aggiornatoIl">>,
): Promise<Impostazioni> {
  return prisma.impostazioni.update({ where: { id: 1 }, data: dati });
}
