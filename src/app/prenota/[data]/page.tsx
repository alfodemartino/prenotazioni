import Link from "next/link";
import { notFound } from "next/navigation";
import Intestazione from "@/components/Intestazione";
import FormPrenotazione from "@/components/FormPrenotazione";
import BottoneAnnulla from "@/components/BottoneAnnulla";
import { richiediSocio } from "@/lib/auth";
import { dettaglioGiornata } from "@/lib/prenotazioni";
import { dataEstesa } from "@/lib/date";
import { etichettaStato, statoPrenotabile, type Gruppo } from "@/lib/disponibilita";
import { CLASSI_BADGE } from "@/lib/ui";

export const dynamic = "force-dynamic";

const GRUPPO_INIZIALE: Gruppo = {
  adulti: 1, // il socio che prenota
  bambini: 0,
  ospitiAdulti: 0,
  ospitiBambini: 0,
};

export default async function PaginaPrenota({
  params,
}: {
  params: Promise<{ data: string }>;
}) {
  const { data } = await params;
  const socio = await richiediSocio();

  const dettaglio = await dettaglioGiornata(socio.id, data);
  if (!dettaglio) notFound();

  const { imp, riepilogo } = dettaglio;
  const mia = riepilogo.miaPrenotazione;

  // I posti già occupati dalla mia prenotazione tornano disponibili per me stesso:
  // altrimenti, a giornata esaurita, non potrei nemmeno ridurre il mio gruppo.
  const maxAdulti = Math.min(
    imp.maxPersonePerPrenotazione,
    riepilogo.postiResidui + (mia?.adulti ?? 0),
  );

  const iniziale: Gruppo = mia
    ? {
        adulti: mia.adulti,
        bambini: mia.bambini,
        ospitiAdulti: mia.ospitiAdulti,
        ospitiBambini: mia.ospitiBambini,
      }
    : GRUPPO_INIZIALE;

  const modificabile = statoPrenotabile(riepilogo.stato) || Boolean(mia);

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

        <div className="mb-6 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-slate-900">{riepilogo.etichetta}</h1>
            <p className="mt-0.5 text-slate-600">{dataEstesa(riepilogo.data)}</p>
            <p className="mt-1 text-sm text-slate-500">
              Apertura {riepilogo.config.oraApertura} – {riepilogo.config.oraChiusura}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${CLASSI_BADGE[riepilogo.stato]}`}
          >
            {etichettaStato(riepilogo.stato)}
          </span>
        </div>

        {riepilogo.nota && (
          <p className="mb-5 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">
            {riepilogo.nota}
          </p>
        )}

        {modificabile ? (
          <>
            <p className="mb-4 text-sm text-slate-600">
              Indica chi accederà alla piscina. Solo gli adulti tesserati occupano posti;
              bambini e ospiti servono a sapere quante persone saranno in struttura.
            </p>

            <FormPrenotazione
              data={riepilogo.data}
              iniziale={iniziale}
              maxPersone={imp.maxPersonePerPrenotazione}
              maxAdulti={Math.max(1, maxAdulti)}
              tariffaOspiteAdultoCent={imp.tariffaOspiteAdultoCent}
              tariffaOspiteBambinoCent={imp.tariffaOspiteBambinoCent}
              modifica={Boolean(mia)}
            />

            {mia && (
              <div className="mt-4">
                <BottoneAnnulla
                  prenotazioneId={mia.id}
                  giorno={riepilogo.etichetta.toLowerCase()}
                />
              </div>
            )}
          </>
        ) : (
          <div className="rounded-2xl bg-superficie p-5 text-center ring-1 ring-slate-200">
            <p className="text-slate-700">
              {riepilogo.stato === "ESAURITA"
                ? "Tutti i posti di questa giornata sono già stati prenotati."
                : riepilogo.stato === "CHIUSA"
                  ? "La piscina è chiusa in questa giornata."
                  : riepilogo.stato === "TERMINATA"
                    ? `La piscina ha chiuso alle ${riepilogo.config.oraChiusura}.`
                    : "Questa giornata non è prenotabile."}
            </p>
            <Link
              href="/"
              className="mt-4 inline-block rounded-xl bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Vedi le altre giornate
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
