import Link from "next/link";
import { reportPeriodo } from "@/lib/admin";
import { addGiorni, dataBreve, isDataISO, nomeGiorno, oggiISO } from "@/lib/date";
import { formattaEuro } from "@/lib/disponibilita";
import { INPUT, RIQUADRO } from "@/components/admin/stili";

export const dynamic = "force-dynamic";

const GIORNI_PREDEFINITI = 30;

function Stat({ etichetta, valore, nota }: { etichetta: string; valore: string | number; nota?: string }) {
  return (
    <div className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{etichetta}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{valore}</p>
      {nota && <p className="mt-0.5 text-xs text-slate-500">{nota}</p>}
    </div>
  );
}

export default async function PaginaReport({
  searchParams,
}: {
  searchParams: Promise<{ da?: string; a?: string }>;
}) {
  const sp = await searchParams;
  const oggi = oggiISO();

  const a = sp.a && isDataISO(sp.a) ? sp.a : oggi;
  const daGrezzo = sp.da && isDataISO(sp.da) ? sp.da : addGiorni(a, -GIORNI_PREDEFINITI);
  const da = daGrezzo <= a ? daGrezzo : a;

  const report = await reportPeriodo(da, a);
  const { imp, righe, complessivi, effettive, classificaOspiti, occupazioneMedia } = report;

  return (
    <>
      <h1 className="text-2xl font-bold text-slate-900">Report</h1>
      <p className="mt-1 text-slate-600">
        Affluenza e presenze nel periodo scelto. I dati considerano solo le prenotazioni non
        annullate.
      </p>

      <form method="get" className="mt-5 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Dal</span>
          <input type="date" name="da" defaultValue={da} className={`${INPUT} max-w-44`} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-slate-700">Al</span>
          <input type="date" name="a" defaultValue={a} className={`${INPUT} max-w-44`} />
        </label>
        <button
          type="submit"
          className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-300"
        >
          Aggiorna
        </button>
        <Link
          href={`/admin/report/csv?da=${da}&a=${a}`}
          className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-sky-700 ring-1 ring-sky-200"
        >
          Scarica CSV
        </Link>
      </form>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          etichetta="Prenotazioni"
          valore={complessivi.prenotazioni}
          nota={`su ${report.giornateConDati} giornate`}
        />
        <Stat
          etichetta="Persone"
          valore={complessivi.persone}
          nota={`${complessivi.adulti} adulti, ${complessivi.bambini} bambini`}
        />
        <Stat
          etichetta="Ospiti"
          valore={complessivi.ospiti}
          nota={`tariffe ${formattaEuro(imp.tariffaOspiteAdultoCent)} / ${formattaEuro(imp.tariffaOspiteBambinoCent)}`}
        />
        <Stat
          etichetta="Occupazione media"
          valore={`${occupazioneMedia}%`}
          nota="sulla capienza adulti"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat etichetta="Presenti" valore={complessivi.presenti} />
        <Stat etichetta="Non presentati" valore={complessivi.assenti} />
        <Stat
          etichetta="Tasso di no-show"
          valore={`${report.tassoNoShow}%`}
          nota="sulle giornate concluse"
        />
        <Stat
          etichetta="Entrati davvero"
          valore={effettive.adulti + effettive.bambini + effettive.ospiti}
          nota="da registro presenze"
        />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Giorno per giorno</h2>

        {righe.length === 0 ? (
          <p className={`${RIQUADRO} text-sm text-slate-500`}>
            Nessuna attività nel periodo selezionato.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-xs tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Giorno</th>
                  <th className="px-4 py-3 font-medium">Pren.</th>
                  <th className="px-4 py-3 font-medium">Adulti</th>
                  <th className="px-4 py-3 font-medium">Bambini</th>
                  <th className="px-4 py-3 font-medium">Ospiti</th>
                  <th className="px-4 py-3 font-medium">Occup.</th>
                  <th className="px-4 py-3 font-medium">Presenti</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {righe.map((r) => (
                  <tr key={r.data} className={r.aperta ? "" : "bg-slate-50 text-slate-400"}>
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {dataBreve(r.data)}
                      <span className="ml-1.5 text-xs text-slate-400">
                        {nomeGiorno(r.data).slice(0, 3)}
                      </span>
                      {!r.aperta && (
                        <span className="ml-2 text-xs font-medium text-slate-400">chiusa</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">{r.prenotazioni}</td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {r.adulti}
                      <span className="text-xs text-slate-400">/{r.capienza}</span>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">{r.bambini}</td>
                    <td className="px-4 py-2.5 tabular-nums">{r.ospiti}</td>
                    <td className="px-4 py-2.5 tabular-nums">
                      <span className={r.occupazionePct > 100 ? "font-semibold text-amber-700" : ""}>
                        {r.occupazionePct}%
                      </span>
                    </td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {r.presenti}
                      {r.assenti > 0 && (
                        <span className="ml-1 text-xs text-slate-400">({r.assenti} assenti)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Ospiti portati per socio</h2>

        {classificaOspiti.length === 0 ? (
          <p className={`${RIQUADRO} text-sm text-slate-500`}>
            Nessun ospite registrato nel periodo.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            {classificaOspiti.map((s) => (
              <li key={s.tessera} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-slate-800">{s.nome}</p>
                  <p className="text-xs text-slate-500">
                    tessera {s.tessera} · {s.accessi}{" "}
                    {s.accessi === 1 ? "accesso" : "accessi"}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-900">
                  {s.ospiti} {s.ospiti === 1 ? "ospite" : "ospiti"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
