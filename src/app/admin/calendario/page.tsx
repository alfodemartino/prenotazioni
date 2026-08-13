import Link from "next/link";
import FormIntervallo from "@/components/admin/FormIntervallo";
import BannerEsito from "@/components/admin/BannerEsito";
import { calendario } from "@/lib/admin";
import { addGiorni, dataBreve, isDataISO, nomeGiorno, oggiISO } from "@/lib/date";

export const dynamic = "force-dynamic";

const GIORNI_MOSTRATI = 21;

function messaggioIntervallo(applicate?: string, operazione?: string): string | null {
  const quante = Number(applicate);
  if (!Number.isInteger(quante) || quante < 1) return null;

  const giornate = `${quante} ${quante === 1 ? "giornata" : "giornate"}`;
  return operazione === "riapri" ? `Riaperte ${giornate}.` : `Chiuse ${giornate}.`;
}

export default async function PaginaCalendario({
  searchParams,
}: {
  searchParams: Promise<{ da?: string; applicate?: string; operazione?: string }>;
}) {
  const sp = await searchParams;
  const oggi = oggiISO();
  const da = sp.da && isDataISO(sp.da) ? sp.da : oggi;

  const { imp, giorni } = await calendario(da, GIORNI_MOSTRATI);

  return (
    <>
      <BannerEsito messaggio={messaggioIntervallo(sp.applicate, sp.operazione)} />

      <h1 className="text-2xl font-bold text-slate-900">Calendario</h1>
      <p className="mt-1 text-slate-600">
        Capienza, orari e chiusure giornata per giornata. Le giornate mai modificate seguono i
        valori delle Configurazioni ({imp.capienzaAdultiDefault} adulti,{" "}
        {imp.oraAperturaDefault}–{imp.oraChiusuraDefault}).
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Link
          href={`/admin/calendario?da=${addGiorni(da, -GIORNI_MOSTRATI)}`}
          className="rounded-xl bg-superficie px-3 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-300"
        >
          ← Precedenti
        </Link>
        <Link
          href={`/admin/calendario?da=${addGiorni(da, GIORNI_MOSTRATI)}`}
          className="rounded-xl bg-superficie px-3 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-300"
        >
          Successivi →
        </Link>
        {da !== oggi && (
          <Link
            href="/admin/calendario"
            className="px-2 text-sm font-medium text-sky-700 underline-offset-2 hover:underline"
          >
            Torna a oggi
          </Link>
        )}
        <div className="ml-auto">
          <FormIntervallo da={da} />
        </div>
      </div>

      <ul className="mt-5 divide-y divide-slate-100 overflow-hidden rounded-2xl bg-superficie shadow-sm ring-1 ring-slate-200">
        {giorni.map((g) => {
          const larghezza = Math.min(100, g.occupazionePct);

          return (
            <li key={g.data}>
              <Link
                href={`/admin/calendario/${g.data}`}
                className="flex items-center gap-4 px-4 py-3 transition hover:bg-slate-50"
              >
                <div className="w-24 shrink-0">
                  <p
                    className={`text-sm font-semibold ${
                      g.data === oggi ? "text-sky-700" : "text-slate-900"
                    }`}
                  >
                    {dataBreve(g.data)}
                  </p>
                  <p className="text-xs text-slate-500">{nomeGiorno(g.data)}</p>
                </div>

                <div className="min-w-0 flex-1">
                  {g.aperta ? (
                    <>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${
                            g.occupazionePct > 100
                              ? "bg-amber-500"
                              : g.occupazionePct >= 90
                                ? "bg-amber-400"
                                : "bg-sky-500"
                          }`}
                          style={{ width: `${larghezza}%` }}
                        />
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-500">
                        {g.adultiOccupati}/{g.capienzaAdulti} adulti · {g.prenotazioni}{" "}
                        {g.prenotazioni === 1 ? "prenotazione" : "prenotazioni"}
                        {g.nota ? ` · ${g.nota}` : ""}
                      </p>
                    </>
                  ) : (
                    <p className="truncate text-sm font-medium text-slate-500">
                      Chiusa{g.nota ? ` · ${g.nota}` : ""}
                    </p>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {g.nellaFinestra && (
                    <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-semibold text-sky-700">
                      Prenotabile
                    </span>
                  )}
                  {!g.aperta && (
                    <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">
                      Chiusa
                    </span>
                  )}
                  {g.personalizzata && g.aperta && (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                      Personalizzata
                    </span>
                  )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
