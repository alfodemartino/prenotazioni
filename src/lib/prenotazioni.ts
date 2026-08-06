/**
 * Servizio prenotazioni: è il solo punto del codice autorizzato a scrivere
 * sulla tabella Prenotazione.
 *
 * Il motore di disponibilità (`disponibilita.ts`) decide *se* si può prenotare;
 * qui ci si occupa di leggere lo stato consistente dal database, applicare quella
 * decisione dentro una transazione e scrivere il risultato.
 *
 * Perché la transazione con lock: fra il momento in cui si contano i posti occupati
 * e quello in cui si inserisce la prenotazione, un altro socio può prenotare. Senza
 * serializzare le due operazioni sulla stessa giornata, due richieste simultanee
 * sull'ultimo posto passerebbero entrambe il controllo di capienza.
 */

import type { Giornata, Impostazioni, Prenotazione, Prisma, Socio } from "@prisma/client";
import { prisma, usaPostgres } from "./db";
import { leggiImpostazioni } from "./impostazioni";
import {
  addGiorni,
  etichettaRelativa,
  finestraPrenotabile,
  isDataISO,
  minutiCorrenti,
  oggiISO,
  type DataISO,
} from "./date";
import {
  costoOspitiCent,
  postiResidui,
  statoGiornata,
  verificaPrenotabilita,
  type CodiceBlocco,
  type ConfigGiornata,
  type ContestoTemporale,
  type Gruppo,
  type StatoGiornata,
} from "./disponibilita";

type Tx = Prisma.TransactionClient;

export const STATO_ATTIVA = "ATTIVA";
export const STATO_ANNULLATA = "ANNULLATA";

// ---------------------------------------------------------------------------
// Lettura
// ---------------------------------------------------------------------------

export function contestoAttuale(imp: Impostazioni, adesso: Date = new Date()): ContestoTemporale {
  return {
    oggi: oggiISO(adesso),
    minutiCorrenti: minutiCorrenti(adesso),
    giorniFinestra: imp.giorniFinestra,
  };
}

/**
 * Configurazione effettiva di una giornata. Se l'admin non l'ha mai personalizzata
 * la riga non esiste e si applicano i default: le giornate vengono create sul
 * database solo quando servono davvero, non a ogni visita della home.
 */
export function configGiornata(
  data: DataISO,
  giornata: Giornata | null,
  imp: Impostazioni,
): ConfigGiornata {
  return {
    data,
    aperta: giornata?.aperta ?? true,
    capienzaAdulti: giornata?.capienzaAdulti ?? imp.capienzaAdultiDefault,
    overbookingPct: giornata?.overbookingPct ?? imp.overbookingPct,
    oraApertura: giornata?.oraApertura ?? imp.oraAperturaDefault,
    oraChiusura: giornata?.oraChiusura ?? imp.oraChiusuraDefault,
  };
}

export interface RiepilogoGiornata {
  data: DataISO;
  etichetta: string;
  config: ConfigGiornata;
  adultiOccupati: number;
  postiResidui: number;
  stato: StatoGiornata;
  nota: string | null;
  /** Prenotazione attiva del socio per quella giornata, se esiste. */
  miaPrenotazione: Prenotazione | null;
}

/** Le giornate della finestra, con disponibilità e prenotazione del socio. */
export async function riepilogoFinestra(socioId: string): Promise<{
  imp: Impostazioni;
  ctx: ContestoTemporale;
  giornate: RiepilogoGiornata[];
}> {
  const imp = await leggiImpostazioni();
  const ctx = contestoAttuale(imp);
  const giorni = finestraPrenotabile(ctx.oggi, imp.giorniFinestra);

  const [configurazioni, conteggi, mie] = await Promise.all([
    prisma.giornata.findMany({ where: { data: { in: giorni } } }),
    prisma.prenotazione.groupBy({
      by: ["data"],
      where: { data: { in: giorni }, stato: STATO_ATTIVA },
      _sum: { adulti: true },
    }),
    prisma.prenotazione.findMany({
      where: { socioId, data: { in: giorni }, stato: STATO_ATTIVA },
    }),
  ]);

  const perData = new Map(configurazioni.map((g) => [g.data, g]));
  const occupatiPerData = new Map(conteggi.map((c) => [c.data, c._sum.adulti ?? 0]));
  const miePerData = new Map(mie.map((p) => [p.data, p]));

  const giornate = giorni.map((data) => {
    const riga = perData.get(data) ?? null;
    const config = configGiornata(data, riga, imp);
    const adultiOccupati = occupatiPerData.get(data) ?? 0;

    return {
      data,
      etichetta: etichettaRelativa(data, ctx.oggi),
      config,
      adultiOccupati,
      postiResidui: Math.max(0, postiResidui(config, adultiOccupati)),
      stato: statoGiornata(config, adultiOccupati, ctx, imp.sogliaUltimiPosti),
      nota: riga?.nota ?? null,
      miaPrenotazione: miePerData.get(data) ?? null,
    } satisfies RiepilogoGiornata;
  });

  return { imp, ctx, giornate };
}

/** Dettaglio di una singola giornata, per la schermata di prenotazione. */
export async function dettaglioGiornata(
  socioId: string,
  data: DataISO,
): Promise<{
  imp: Impostazioni;
  ctx: ContestoTemporale;
  riepilogo: RiepilogoGiornata;
} | null> {
  if (!isDataISO(data)) return null;

  const imp = await leggiImpostazioni();
  const ctx = contestoAttuale(imp);

  const [riga, somma, mia] = await Promise.all([
    prisma.giornata.findUnique({ where: { data } }),
    prisma.prenotazione.aggregate({
      where: { data, stato: STATO_ATTIVA },
      _sum: { adulti: true },
    }),
    prisma.prenotazione.findFirst({ where: { socioId, data, stato: STATO_ATTIVA } }),
  ]);

  const config = configGiornata(data, riga, imp);
  const adultiOccupati = somma._sum.adulti ?? 0;

  return {
    imp,
    ctx,
    riepilogo: {
      data,
      etichetta: etichettaRelativa(data, ctx.oggi),
      config,
      adultiOccupati,
      postiResidui: Math.max(0, postiResidui(config, adultiOccupati)),
      stato: statoGiornata(config, adultiOccupati, ctx, imp.sogliaUltimiPosti),
      nota: riga?.nota ?? null,
      miaPrenotazione: mia,
    },
  };
}

// ---------------------------------------------------------------------------
// Scrittura
// ---------------------------------------------------------------------------

/**
 * Crea la riga della giornata se manca, copiando i default dalle impostazioni.
 * Serve perché Prenotazione ha una relazione verso Giornata.
 */
async function assicuraGiornata(tx: Tx, data: DataISO, imp: Impostazioni): Promise<Giornata> {
  return tx.giornata.upsert({
    where: { data },
    update: {},
    create: {
      data,
      aperta: true,
      capienzaAdulti: imp.capienzaAdultiDefault,
      overbookingPct: imp.overbookingPct,
      oraApertura: imp.oraAperturaDefault,
      oraChiusura: imp.oraChiusuraDefault,
    },
  });
}

/**
 * Serializza le prenotazioni concorrenti sulla stessa giornata.
 *
 * Su PostgreSQL con un lock di riga esplicito; su SQLite promuovendo la
 * transazione a scrittura, il che ottiene lo stesso effetto perché il motore
 * ammette un solo scrittore alla volta.
 */
async function bloccaGiornata(tx: Tx, data: DataISO): Promise<void> {
  if (usaPostgres) {
    await tx.$queryRaw`SELECT "data" FROM "Giornata" WHERE "data" = ${data} FOR UPDATE`;
  } else {
    await tx.$executeRaw`UPDATE "Giornata" SET "aggiornataIl" = "aggiornataIl" WHERE "data" = ${data}`;
  }
}

async function contaAdultiAttivi(tx: Tx, data: DataISO): Promise<number> {
  const r = await tx.prenotazione.aggregate({
    where: { data, stato: STATO_ATTIVA },
    _sum: { adulti: true },
  });
  return r._sum.adulti ?? 0;
}

export type EsitoSalvataggio =
  | { ok: true; prenotazione: Prenotazione; creata: boolean; costoOspitiCent: number }
  | { ok: false; codice: CodiceBlocco | "DATA_NON_VALIDA" | "CONFLITTO"; messaggio: string };

export async function salvaPrenotazione(input: {
  socio: Socio;
  data: DataISO;
  gruppo: Gruppo;
}): Promise<EsitoSalvataggio> {
  const { socio, data, gruppo } = input;

  if (!isDataISO(data)) {
    return { ok: false, codice: "DATA_NON_VALIDA", messaggio: "Data non valida." };
  }

  const imp = await leggiImpostazioni();
  const ctx = contestoAttuale(imp);

  try {
    return await prisma.$transaction(async (tx) => {
      const riga = await assicuraGiornata(tx, data, imp);
      await bloccaGiornata(tx, data);

      // Le letture avvengono dopo il lock: da qui in poi nessun altro può
      // modificare le prenotazioni di questa giornata fino al commit.
      const [esistente, adultiOccupati] = await Promise.all([
        tx.prenotazione.findFirst({ where: { socioId: socio.id, data, stato: STATO_ATTIVA } }),
        contaAdultiAttivi(tx, data),
      ]);

      const esito = verificaPrenotabilita({
        giornata: configGiornata(data, riga, imp),
        adultiOccupati,
        adultiGiaMiei: esistente?.adulti ?? 0,
        gruppo,
        socio: {
          stato: socio.stato,
          scadenzaTessera: socio.scadenzaTessera,
          scadenzaCertificato: socio.scadenzaCertificato,
        },
        ctx,
        vincoli: {
          maxPersonePerPrenotazione: imp.maxPersonePerPrenotazione,
          sogliaUltimiPosti: imp.sogliaUltimiPosti,
          controlloCertificato: imp.controlloCertificato,
        },
      });

      if (!esito.ok) {
        return { ok: false, codice: esito.codice, messaggio: esito.messaggio };
      }

      const campi = {
        adulti: gruppo.adulti,
        bambini: gruppo.bambini,
        ospitiAdulti: gruppo.ospitiAdulti,
        ospitiBambini: gruppo.ospitiBambini,
      };

      const prenotazione = esistente
        ? await tx.prenotazione.update({ where: { id: esistente.id }, data: campi })
        : await tx.prenotazione.create({
            data: {
              socioId: socio.id,
              data,
              stato: STATO_ATTIVA,
              slotAttivo: data, // attiva il vincolo "una sola prenotazione viva per giornata"
              ...campi,
            },
          });

      return {
        ok: true,
        prenotazione,
        creata: !esistente,
        costoOspitiCent: costoOspitiCent(gruppo, imp),
      };
    });
  } catch (e) {
    // Violazione del vincolo di unicità: due richieste dello stesso socio arrivate insieme.
    if (typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002") {
      return {
        ok: false,
        codice: "CONFLITTO",
        messaggio: "Hai già una prenotazione per questa giornata. Ricarica la pagina.",
      };
    }
    throw e;
  }
}

export type EsitoAnnullamento =
  | { ok: true }
  | { ok: false; messaggio: string };

/**
 * Annulla una prenotazione. I posti tornano subito disponibili.
 * È consentito fino al termine della giornata stessa: dopo, la prenotazione
 * appartiene allo storico e non si tocca più.
 */
export async function annullaPrenotazione(input: {
  socioId: string;
  prenotazioneId: string;
  /** Un admin può annullare per conto del socio. */
  comeAdmin?: boolean;
}): Promise<EsitoAnnullamento> {
  const imp = await leggiImpostazioni();
  const ctx = contestoAttuale(imp);

  const prenotazione = await prisma.prenotazione.findUnique({
    where: { id: input.prenotazioneId },
  });

  if (!prenotazione) return { ok: false, messaggio: "Prenotazione non trovata." };

  if (!input.comeAdmin && prenotazione.socioId !== input.socioId) {
    return { ok: false, messaggio: "Prenotazione non trovata." };
  }

  if (prenotazione.stato !== STATO_ATTIVA) return { ok: true }; // già annullata: nulla da fare

  if (!input.comeAdmin && prenotazione.data < ctx.oggi) {
    return { ok: false, messaggio: "Le giornate passate non si possono modificare." };
  }

  await prisma.prenotazione.update({
    where: { id: prenotazione.id },
    data: {
      stato: STATO_ANNULLATA,
      slotAttivo: null, // libera il vincolo: il socio può riprenotare la stessa giornata
      annullataIl: new Date(),
    },
  });

  return { ok: true };
}

/** Storico del socio, dalla più recente. Le giornate future restano modificabili. */
export async function storicoSocio(socioId: string, limite = 50) {
  const imp = await leggiImpostazioni();
  const oggi = oggiISO();

  const prenotazioni = await prisma.prenotazione.findMany({
    where: { socioId },
    orderBy: [{ data: "desc" }, { creataIl: "desc" }],
    take: limite,
  });

  return {
    imp,
    oggi,
    prossime: prenotazioni.filter((p) => p.data >= oggi && p.stato === STATO_ATTIVA),
    passate: prenotazioni.filter((p) => p.data < oggi || p.stato !== STATO_ATTIVA),
  };
}

/** Giorno successivo all'ultimo prenotabile: utile all'admin per il calendario. */
export function primoGiornoNonPrenotabile(oggi: DataISO, giorniFinestra: number): DataISO {
  return addGiorni(oggi, giorniFinestra + 1);
}
