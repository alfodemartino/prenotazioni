import type { NextRequest } from "next/server";
import { socioCorrente } from "@/lib/auth";
import { reportPeriodo } from "@/lib/admin";
import { generaCsv } from "@/lib/report";
import { addGiorni, isDataISO, oggiISO } from "@/lib/date";

export const dynamic = "force-dynamic";

export async function GET(richiesta: NextRequest) {
  const socio = await socioCorrente();
  if (!socio || socio.ruolo !== "ADMIN") {
    return new Response("Accesso riservato all'amministrazione.", { status: 403 });
  }

  const parametri = richiesta.nextUrl.searchParams;
  const oggi = oggiISO();

  const a = leggiData(parametri.get("a"), oggi);
  const daRichiesto = leggiData(parametri.get("da"), addGiorni(a, -30));
  const da = daRichiesto <= a ? daRichiesto : a;

  const { righe } = await reportPeriodo(da, a);

  const csv = generaCsv([
    [
      "Data",
      "Stato",
      "Prenotazioni",
      "Adulti",
      "Capienza",
      "Bambini",
      "Ospiti",
      "Occupazione %",
      "Presenti",
      "Non presentati",
    ],
    ...righe.map((r) => [
      r.data,
      r.aperta ? "aperta" : "chiusa",
      r.prenotazioni,
      r.adulti,
      r.capienza,
      r.bambini,
      r.ospiti,
      r.occupazionePct,
      r.presenti,
      r.assenti,
    ]),
  ]);

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="presenze_${da}_${a}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

function leggiData(valore: string | null, predefinito: string): string {
  return valore && isDataISO(valore) ? valore : predefinito;
}
