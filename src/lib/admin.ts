/**
 * Letture per il pannello amministrazione.
 * Le scritture stanno in `src/app/admin/azioni.ts`.
 */

import type { Prenotazione, Socio } from "@prisma/client";
import { prisma } from "./db";
import { leggiImpostazioni } from "./impostazioni";
import { addGiorni, oggiISO, type DataISO } from "./date";
import { configGiornata, contestoAttuale, STATO_ATTIVA } from "./prenotazioni";
import { limitePosti, statoGiornata } from "./disponibilita";
import { percentualeOccupazione, presenzeEffettive, tassoNoShow, totali } from "./report";

export type PrenotazioneConSocio = Prenotazione & { socio: Socio };

// ---------------------------------------------------------------------------
// Registro del giorno
// ---------------------------------------------------------------------------

export async function registroGiorno(data: DataISO) {
  const imp = await leggiImpostazioni();
  const ctx = contestoAttuale(imp);

  const [riga, prenotazioni] = await Promise.all([
    prisma.giornata.findUnique({ where: { data } }),
    prisma.prenotazione.findMany({
      where: { data },
      include: { socio: true },
      orderBy: [{ socio: { cognome: "asc" } }, { socio: { nome: "asc" } }],
    }),
  ]);

  const config = configGiornata(data, riga, imp);
  const attive = prenotazioni.filter((p) => p.stato === STATO_ATTIVA);
  const annullate = prenotazioni.filter((p) => p.stato !== STATO_ATTIVA);
  const riepilogo = totali(prenotazioni, ctx.oggi);

  return {
    imp,
    ctx,
    config,
    personalizzata: Boolean(riga),
    nota: riga?.nota ?? null,
    attive,
    annullate,
    totali: riepilogo,
    limite: limitePosti(config.capienzaAdulti, config.overbookingPct),
    occupazionePct: percentualeOccupazione(riepilogo.adulti, config.capienzaAdulti),
    stato: statoGiornata(config, riepilogo.adulti, ctx, imp.sogliaUltimiPosti),
  };
}

// ---------------------------------------------------------------------------
// Calendario
// ---------------------------------------------------------------------------

export interface GiornoCalendario {
  data: DataISO;
  aperta: boolean;
  personalizzata: boolean;
  capienzaAdulti: number;
  overbookingPct: number;
  oraApertura: string;
  oraChiusura: string;
  nota: string | null;
  adultiOccupati: number;
  prenotazioni: number;
  occupazionePct: number;
  nellaFinestra: boolean;
}

export async function calendario(da: DataISO, giorni: number) {
  const imp = await leggiImpostazioni();
  const ctx = contestoAttuale(imp);

  const date: DataISO[] = [];
  for (let i = 0; i < giorni; i++) date.push(addGiorni(da, i));

  const [righe, conteggi] = await Promise.all([
    prisma.giornata.findMany({ where: { data: { in: date } } }),
    prisma.prenotazione.groupBy({
      by: ["data"],
      where: { data: { in: date }, stato: STATO_ATTIVA },
      _sum: { adulti: true },
      _count: { _all: true },
    }),
  ]);

  const perData = new Map(righe.map((r) => [r.data, r]));
  const statistiche = new Map(
    conteggi.map((c) => [c.data, { adulti: c._sum.adulti ?? 0, prenotazioni: c._count._all }]),
  );

  const ultimoPrenotabile = addGiorni(ctx.oggi, imp.giorniFinestra);

  const giorniCalendario: GiornoCalendario[] = date.map((data) => {
    const riga = perData.get(data) ?? null;
    const config = configGiornata(data, riga, imp);
    const s = statistiche.get(data) ?? { adulti: 0, prenotazioni: 0 };

    return {
      data,
      aperta: config.aperta,
      personalizzata: Boolean(riga),
      capienzaAdulti: config.capienzaAdulti,
      overbookingPct: config.overbookingPct,
      oraApertura: config.oraApertura,
      oraChiusura: config.oraChiusura,
      nota: riga?.nota ?? null,
      adultiOccupati: s.adulti,
      prenotazioni: s.prenotazioni,
      occupazionePct: percentualeOccupazione(s.adulti, config.capienzaAdulti),
      nellaFinestra: data >= ctx.oggi && data <= ultimoPrenotabile,
    };
  });

  return { imp, ctx, giorni: giorniCalendario };
}

// ---------------------------------------------------------------------------
// Soci
// ---------------------------------------------------------------------------

/**
 * Elenco completo dei soci per il pannello admin.
 *
 * Non filtra: la ricerca è tutta nel componente client, che così può reagire a
 * ogni tasto senza tornare al server. Filtrare anche qui darebbe risposte
 * sbagliate — il client si ritroverebbe a cercare dentro un elenco già ristretto
 * dalla ricerca precedente, e un socio esistente risulterebbe assente finché non
 * arriva la risposta successiva.
 *
 * I campi vengono scelti uno per uno: l'elenco attraversa il confine
 * server/client, e un `findMany` senza `select` ci spedirebbe anche
 * `passwordHash`.
 */
export async function elencoSoci() {
  const soci = await prisma.socio.findMany({
    orderBy: [{ cognome: "asc" }, { nome: "asc" }],
    select: {
      id: true,
      nome: true,
      cognome: true,
      email: true,
      numeroTessera: true,
      ruolo: true,
      stato: true,
      scadenzaTessera: true,
    },
  });

  return {
    oggi: oggiISO(),
    soci,
    totale: soci.length,
  };
}

export async function dettaglioSocio(id: string) {
  const socio = await prisma.socio.findUnique({ where: { id } });
  if (!socio) return null;

  const [imp, prenotazioni] = await Promise.all([
    leggiImpostazioni(),
    prisma.prenotazione.findMany({
      where: { socioId: id },
      orderBy: [{ data: "desc" }],
      take: 20,
    }),
  ]);

  return { socio, imp, prenotazioni, oggi: oggiISO() };
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

export interface RigaReport {
  data: DataISO;
  aperta: boolean;
  capienza: number;
  prenotazioni: number;
  adulti: number;
  bambini: number;
  ospiti: number;
  presenti: number;
  assenti: number;
  occupazionePct: number;
}

export async function reportPeriodo(da: DataISO, a: DataISO) {
  const imp = await leggiImpostazioni();
  const oggi = oggiISO();

  const [prenotazioni, righeGiornata] = await Promise.all([
    prisma.prenotazione.findMany({
      where: { data: { gte: da, lte: a } },
      include: {
        socio: { select: { id: true, nome: true, cognome: true, numeroTessera: true } },
      },
      orderBy: [{ data: "asc" }],
    }),
    prisma.giornata.findMany({ where: { data: { gte: da, lte: a } } }),
  ]);

  const perGiornata = new Map(righeGiornata.map((g) => [g.data, g]));

  // Righe giornaliere: solo i giorni che hanno effettivamente movimento o una
  // configurazione dedicata. Elencare ogni data del periodo riempirebbe il
  // report di zeri inutili.
  const dateCoinvolte = new Set<DataISO>([
    ...prenotazioni.map((p) => p.data),
    ...righeGiornata.map((g) => g.data),
  ]);

  const righe: RigaReport[] = [...dateCoinvolte]
    .sort()
    .map((data) => {
      const delGiorno = prenotazioni.filter((p) => p.data === data);
      const t = totali(delGiorno, oggi);
      const config = configGiornata(data, perGiornata.get(data) ?? null, imp);

      return {
        data,
        aperta: config.aperta,
        capienza: config.capienzaAdulti,
        prenotazioni: t.prenotazioni,
        adulti: t.adulti,
        bambini: t.bambini,
        ospiti: t.ospiti,
        presenti: t.presenti,
        assenti: t.assenti,
        occupazionePct: percentualeOccupazione(t.adulti, config.capienzaAdulti),
      };
    });

  const complessivi = totali(prenotazioni, oggi);

  // Ospiti portati per socio: è il dato che il circolo guarda più spesso.
  const perSocio = new Map<
    string,
    { nome: string; tessera: string; ospiti: number; accessi: number }
  >();

  for (const p of prenotazioni) {
    if (p.stato !== STATO_ATTIVA) continue;

    const chiave = p.socio.id;
    const corrente = perSocio.get(chiave) ?? {
      nome: `${p.socio.cognome} ${p.socio.nome}`,
      tessera: p.socio.numeroTessera,
      ospiti: 0,
      accessi: 0,
    };

    corrente.ospiti += p.ospitiAdulti + p.ospitiBambini;
    corrente.accessi += 1;
    perSocio.set(chiave, corrente);
  }

  const classificaOspiti = [...perSocio.values()]
    .filter((s) => s.ospiti > 0)
    .sort((x, y) => y.ospiti - x.ospiti)
    .slice(0, 15);

  const giornateConDati = righe.filter((r) => r.prenotazioni > 0);
  const occupazioneMedia =
    giornateConDati.length > 0
      ? Math.round(
          giornateConDati.reduce((s, r) => s + r.occupazionePct, 0) / giornateConDati.length,
        )
      : 0;

  // Presenze reali registrate alla reception (con le correzioni della segreteria).
  const effettive = prenotazioni
    .filter((p) => p.stato === STATO_ATTIVA)
    .map(presenzeEffettive)
    .reduce(
      (acc, e) => ({
        adulti: acc.adulti + e.adulti,
        bambini: acc.bambini + e.bambini,
        ospiti: acc.ospiti + e.ospiti,
      }),
      { adulti: 0, bambini: 0, ospiti: 0 },
    );

  return {
    imp,
    da,
    a,
    righe,
    complessivi,
    effettive,
    classificaOspiti,
    occupazioneMedia,
    tassoNoShow: tassoNoShow(complessivi.presenti, complessivi.assenti),
    giornateConDati: giornateConDati.length,
  };
}
