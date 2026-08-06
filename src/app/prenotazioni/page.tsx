import Link from "next/link";
import Intestazione from "@/components/Intestazione";
import BottoneAnnulla from "@/components/BottoneAnnulla";
import { richiediSocio } from "@/lib/auth";
import { storicoSocio } from "@/lib/prenotazioni";
import { dataEstesa } from "@/lib/date";
import { costoOspitiCent, formattaEuro } from "@/lib/disponibilita";
import { descriviGruppo } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function PaginaStorico() {
  const socio = await richiediSocio();
  const { imp, oggi, prossime, passate } = await storicoSocio(socio.id);

  return (
    <>
      <Intestazione
        nomeCircolo={imp.nomeCircolo}
        nomeSocio={`${socio.nome} ${socio.cognome}`}
      />

      <main className="mx-auto max-w-lg px-4 py-6 pb-16">
        <Link
          href="/"
          className="mb-5 inline-block text-sm font-medium text-sky-700 underline-offset-2 hover:underline"
        >
          ← Torna alle giornate
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-slate-900">Le mie prenotazioni</h1>

        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
            In programma
          </h2>

          {prossime.length === 0 ? (
            <p className="rounded-2xl bg-white p-5 text-sm text-slate-500 ring-1 ring-slate-200">
              Non hai prenotazioni attive.
            </p>
          ) : (
            <div className="space-y-3">
              {prossime.map((p) => {
                const costo = costoOspitiCent(p, imp);
                return (
                  <article
                    key={p.id}
                    className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200"
                  >
                    <p className="font-semibold text-slate-900">{dataEstesa(p.data)}</p>
                    <p className="mt-1 text-slate-700">{descriviGruppo(p)}</p>
                    {costo > 0 && (
                      <p className="mt-1 text-sm text-slate-600">
                        Da pagare in cassa: {formattaEuro(costo)}
                      </p>
                    )}

                    <div className="mt-4 flex items-stretch gap-2">
                      <Link
                        href={`/prenota/${p.data}`}
                        className="flex-1 rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-sky-700 ring-1 ring-sky-200 transition active:bg-sky-50"
                      >
                        Modifica
                      </Link>
                      <div className="flex-1">
                        <BottoneAnnulla prenotazioneId={p.id} giorno={dataEstesa(p.data)} />
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase">
            Storico
          </h2>

          {passate.length === 0 ? (
            <p className="rounded-2xl bg-white p-5 text-sm text-slate-500 ring-1 ring-slate-200">
              Ancora nessuna giornata alle spalle.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
              {passate.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-800">
                      {dataEstesa(p.data)}
                    </p>
                    <p className="truncate text-sm text-slate-500">{descriviGruppo(p)}</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-slate-400">
                    {p.stato === "ANNULLATA"
                      ? "Annullata"
                      : p.checkInIl
                        ? "Presente"
                        : p.data < oggi
                          ? "Non presentato"
                          : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
