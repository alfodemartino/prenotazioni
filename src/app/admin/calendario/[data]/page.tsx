import Link from "next/link";
import { notFound } from "next/navigation";
import FormGiornata from "@/components/admin/FormGiornata";
import BannerEsito from "@/components/admin/BannerEsito";
import { registroGiorno } from "@/lib/admin";
import { dataEstesa, isDataISO } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function PaginaGiornata({
  params,
  searchParams,
}: {
  params: Promise<{ data: string }>;
  searchParams: Promise<{ salvato?: string }>;
}) {
  const [{ data }, sp] = await Promise.all([params, searchParams]);
  if (!isDataISO(data)) notFound();

  const registro = await registroGiorno(data);
  const { config, totali, limite, personalizzata, nota } = registro;

  return (
    <>
      <BannerEsito
        messaggio={
          sp.salvato === "chiusa"
            ? "Giornata chiusa: non è più prenotabile. Le prenotazioni già accettate restano nel registro."
            : sp.salvato === "aperta"
              ? "Giornata aggiornata."
              : null
        }
      />

      <Link
        href="/admin/calendario"
        className="mb-5 inline-block text-sm font-medium text-sky-700 underline-offset-2 hover:underline"
      >
        ← Torna al calendario
      </Link>

      <h1 className="text-2xl font-bold text-slate-900">{dataEstesa(data)}</h1>
      <p className="mt-1 text-slate-600">
        {personalizzata
          ? "Questa giornata ha una configurazione dedicata."
          : "Questa giornata segue i valori generali delle Configurazioni; salvando, la personalizzi."}
      </p>

      <div className="mt-5 mb-6 flex flex-wrap gap-3 text-sm">
        <span className="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
          {totali.prenotazioni} prenotazioni
        </span>
        <span className="rounded-lg bg-white px-3 py-2 ring-1 ring-slate-200">
          {totali.adulti} adulti · {totali.bambini} bambini · {totali.ospiti} ospiti
        </span>
        <Link
          href={`/admin?data=${data}`}
          className="rounded-lg bg-white px-3 py-2 font-medium text-sky-700 ring-1 ring-slate-200"
        >
          Apri il registro del giorno
        </Link>
      </div>

      <FormGiornata
        valori={{
          data,
          aperta: config.aperta,
          capienzaAdulti: config.capienzaAdulti,
          overbookingPct: config.overbookingPct,
          oraApertura: config.oraApertura,
          oraChiusura: config.oraChiusura,
          nota,
        }}
        limite={limite}
        adultiOccupati={totali.adulti}
      />
    </>
  );
}
