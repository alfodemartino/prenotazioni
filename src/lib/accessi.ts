/**
 * Registro dei tentativi di accesso falliti.
 *
 * La politica sta in `tentativi.ts` ed è pura; qui c'è solo la lettura e la
 * scrittura sul database. Il conteggio è persistito e non tenuto in memoria
 * perché in produzione l'app gira su più istanze: un contatore in memoria
 * verrebbe aggirato semplicemente ritentando finché la richiesta finisce su
 * un'altra istanza.
 */

import { headers } from "next/headers";
import { prisma } from "./db";
import {
  POLITICA_ACCOUNT,
  POLITICA_INDIRIZZO,
  bloccoFinoA,
  bloccoPiuRestrittivo,
  messaggioBlocco,
  minutiDiAttesa,
} from "./tentativi";

const GIORNO = 24 * 60 * 60 * 1000;
const MINUTO = 60 * 1000;

/**
 * Indirizzo di rete del chiamante.
 *
 * Si fida di `x-forwarded-for`, che è attendibile solo dietro un proxy che lo
 * riscrive (Vercel, Render e simili lo fanno). Esponendo l'app direttamente a
 * internet, senza proxy, questa intestazione sarebbe falsificabile e resterebbe
 * valido solo il limite per account.
 */
export async function indirizzoChiamante(): Promise<string> {
  const intestazioni = await headers();

  const inoltrato = intestazioni.get("x-forwarded-for");
  if (inoltrato) {
    const primo = inoltrato.split(",")[0]?.trim();
    if (primo) return primo;
  }

  return intestazioni.get("x-real-ip")?.trim() || "sconosciuto";
}

/** Messaggio da mostrare se l'accesso è temporaneamente bloccato, altrimenti null. */
export async function bloccoAccesso(email: string): Promise<string | null> {
  const adesso = new Date();
  const ip = await indirizzoChiamante();

  const finestraPiuAmpia = Math.max(
    POLITICA_ACCOUNT.finestraMinuti,
    POLITICA_INDIRIZZO.finestraMinuti,
  );

  const tentativi = await prisma.tentativoAccesso.findMany({
    where: {
      quando: { gt: new Date(adesso.getTime() - finestraPiuAmpia * MINUTO) },
      OR: [{ email }, { ip }],
    },
    select: { email: true, ip: true, quando: true },
  });

  const blocco = bloccoPiuRestrittivo(
    bloccoFinoA(
      tentativi.filter((t) => t.email === email).map((t) => t.quando),
      POLITICA_ACCOUNT,
      adesso,
    ),
    bloccoFinoA(
      tentativi.filter((t) => t.ip === ip).map((t) => t.quando),
      POLITICA_INDIRIZZO,
      adesso,
    ),
  );

  return blocco ? messaggioBlocco(minutiDiAttesa(blocco, adesso)) : null;
}

export async function registraFallimento(email: string): Promise<void> {
  const ip = await indirizzoChiamante();

  await prisma.tentativoAccesso.create({ data: { email, ip } });

  // Pulizia opportunistica: oltre la giornata queste righe non servono più.
  await prisma.tentativoAccesso.deleteMany({
    where: { quando: { lt: new Date(Date.now() - GIORNO) } },
  });
}

/** Dopo un accesso riuscito il conto riparte da zero per quell'indirizzo email. */
export async function azzeraFallimenti(email: string): Promise<void> {
  await prisma.tentativoAccesso.deleteMany({ where: { email } });
}
