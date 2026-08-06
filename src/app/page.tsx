import Link from "next/link";
import Intestazione from "@/components/Intestazione";
import BottoneAnnulla from "@/components/BottoneAnnulla";
import { richiediSocio } from "@/lib/auth";
import { riepilogoFinestra } from "@/lib/prenotazioni";
import { dataEstesa } from "@/lib/date";
import {
  costoOspitiCent,
  etichettaStato,
  formattaEuro,
  statoPrenotabile,
  type StatoGiornata,
} from "@/lib/disponibilita";
import { CLASSI_BADGE, descriviGruppo, posti } from "@/lib/ui";

export const dynamic = "force-dynamic";

function spiegazione(stato: StatoGiornata, oraChiusura: string): string {
  switch (stato) {
    case "CHIUSA":
      return "La piscina è chiusa in questa giornata.";
    case "TERMINATA":
      return `La piscina ha chiuso alle ${oraChiusura}: non è più possibile prenotare per oggi.`;
    case "ESAURITA":
      return "Tutti i posti sono già stati prenotati.";
    default:
      return "Questa giornata non è ancora prenotabile.";
  }
}

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ salvata?: string; annullata?: string }>;
}) {
  const socio = await richiediSocio();
  const [{ imp, giornate }, sp] = await Promise.all([
    riepilogoFinestra(socio.id),
    searchParams,
  ]);

  return (
    <>
      <Intestazione
        nomeCircolo={imp.nomeCircolo}
        nomeSocio={`${socio.nome} ${socio.cognome} · tessera ${socio.numeroTessera}`}
      />

      <main className="mx-auto max-w-lg px-4 py-6 pb-16">
        {(sp.salvata || sp.annullata) && (
          <p className="mb-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
            {sp.annullata ? "Prenotazione annullata." : "Prenotazione confermata."}
          </p>
        )}

        <h1 className="text-2xl font-bold text-slate-900">Ciao {socio.nome}</h1>
        <p className="mt-1 mb-6 text-slate-600">
          Puoi prenotare per oggi e per i {imp.giorniFinestra} giorni successivi.
        </p>

        <div className="space-y-4">
          {giornate.map((g) => {
            const mia = g.miaPrenotazione;
            const prenotabile = statoPrenotabile(g.stato);
            const costo = mia ? costoOspitiCent(mia, imp) : 0;

            return (
              <article
                key={g.data}
                className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200"
              >
                <div className="flex items-start justify-between gap-3 p-5 pb-4">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-slate-900">{g.etichetta}</h2>
                    <p className="mt-0.5 text-sm text-slate-500">{dataEstesa(g.data)}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${CLASSI_BADGE[g.stato]}`}
                  >
                    {etichettaStato(g.stato)}
                  </span>
                </div>

                {g.nota && <p className="px-5 pb-3 text-sm text-slate-600">{g.nota}</p>}

                {mia ? (
                  <div className="border-t border-slate-100 bg-sky-50/60 px-5 py-4">
                    <p className="text-sm font-semibold text-sky-900">La tua prenotazione</p>
                    <p className="mt-1 text-slate-800">{descriviGruppo(mia)}</p>
                    {costo > 0 && (
                      <p className="mt-1 text-sm text-slate-600">
                        Da pagare in cassa: {formattaEuro(costo)}
                      </p>
                    )}

                    <div className="mt-4 flex items-stretch gap-2">
                      <Link
                        href={`/prenota/${g.data}`}
                        className="flex-1 rounded-xl bg-white px-4 py-3 text-center text-sm font-semibold text-sky-700 ring-1 ring-sky-200 transition active:bg-sky-50"
                      >
                        Modifica
                      </Link>
                      <div className="flex-1">
                        <BottoneAnnulla
                          prenotazioneId={mia.id}
                          giorno={g.etichetta.toLowerCase()}
                        />
                      </div>
                    </div>
                  </div>
                ) : prenotabile ? (
                  <div className="border-t border-slate-100 px-5 py-4">
                    {g.stato === "ULTIMI_POSTI" && (
                      <p className="mb-3 text-sm font-medium text-amber-700">
                        Restano {posti(g.postiResidui)}.
                      </p>
                    )}
                    <Link
                      href={`/prenota/${g.data}`}
                      className="block rounded-xl bg-sky-600 px-4 py-3 text-center font-semibold text-white shadow-sm transition active:bg-sky-700"
                    >
                      Prenota
                    </Link>
                  </div>
                ) : (
                  <div className="border-t border-slate-100 px-5 py-4">
                    <p className="text-sm text-slate-500">
                      {spiegazione(g.stato, g.config.oraChiusura)}
                    </p>
                  </div>
                )}
              </article>
            );
          })}
        </div>

        <div className="mt-8 flex flex-col gap-3 text-center">
          <Link
            href="/prenotazioni"
            className="text-sm font-medium text-sky-700 underline-offset-2 hover:underline"
          >
            Le mie prenotazioni
          </Link>
          <Link
            href="/cambia-password"
            className="text-sm font-medium text-slate-500 underline-offset-2 hover:underline"
          >
            Cambia password
          </Link>
          <Link
            href="/privacy"
            className="text-sm text-slate-500 underline-offset-2 hover:underline"
          >
            Informativa sulla privacy
          </Link>
          {socio.ruolo === "ADMIN" && (
            <Link
              href="/admin"
              className="text-sm font-semibold text-slate-700 underline-offset-2 hover:underline"
            >
              Pannello amministrazione
            </Link>
          )}
        </div>
      </main>
    </>
  );
}
