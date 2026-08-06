import Link from "next/link";
import RigaPresenza from "@/components/admin/RigaPresenza";
import SelettoreData from "@/components/admin/SelettoreData";
import FormPrenotaPerSocio from "@/components/admin/FormPrenotaPerSocio";
import { RIQUADRO } from "@/components/admin/stili";
import { registroGiorno } from "@/lib/admin";
import { prisma } from "@/lib/db";
import { addGiorni, dataEstesa, etichettaRelativa, isDataISO, oggiISO } from "@/lib/date";
import { checkInConsentito } from "@/lib/report";
import { descriviGruppo } from "@/lib/ui";

export const dynamic = "force-dynamic";

function Stat({
  etichetta,
  valore,
  nota,
  evidenzia,
}: {
  etichetta: string;
  valore: string | number;
  nota?: string;
  evidenzia?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 ring-1 ${
        evidenzia ? "bg-amber-50 ring-amber-200" : "bg-white ring-slate-200"
      }`}
    >
      <p className="text-xs font-medium tracking-wide text-slate-500 uppercase">{etichetta}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">{valore}</p>
      {nota && <p className="mt-0.5 text-xs text-slate-500">{nota}</p>}
    </div>
  );
}

export default async function PaginaRegistro({
  searchParams,
}: {
  searchParams: Promise<{ data?: string }>;
}) {
  const sp = await searchParams;
  const oggi = oggiISO();
  const data = sp.data && isDataISO(sp.data) ? sp.data : oggi;

  const [registro, soci] = await Promise.all([
    registroGiorno(data),
    prisma.socio.findMany({
      where: { stato: "ATTIVO" },
      orderBy: [{ cognome: "asc" }, { nome: "asc" }],
      select: { id: true, nome: true, cognome: true, numeroTessera: true },
    }),
  ]);

  const { config, totali, limite, occupazionePct, attive, annullate, nota } = registro;
  const oltreCapienza = totali.adulti > config.capienzaAdulti;
  const checkInPossibile = checkInConsentito(data, oggi);

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Link
          href={`/admin?data=${addGiorni(data, -1)}`}
          aria-label="Giorno precedente"
          className="rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-300"
        >
          ←
        </Link>
        <SelettoreData data={data} base="/admin" />
        <Link
          href={`/admin?data=${addGiorni(data, 1)}`}
          aria-label="Giorno successivo"
          className="rounded-xl bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-300"
        >
          →
        </Link>
        {data !== oggi && (
          <Link
            href="/admin"
            className="rounded-xl px-3 py-2.5 text-sm font-medium text-sky-700 underline-offset-2 hover:underline"
          >
            Torna a oggi
          </Link>
        )}
      </div>

      <h1 className="text-2xl font-bold text-slate-900">
        {etichettaRelativa(data, oggi) === "Oggi" ? "Registro di oggi" : "Registro"}
      </h1>
      <p className="mt-1 text-slate-600">
        {dataEstesa(data)} · apertura {config.oraApertura}–{config.oraChiusura}
      </p>

      {!config.aperta && (
        <p className="mt-4 rounded-xl bg-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
          Giornata chiusa: non è possibile prenotare.
          {nota ? ` ${nota}` : ""}
        </p>
      )}

      {config.aperta && nota && (
        <p className="mt-4 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{nota}</p>
      )}

      {oltreCapienza && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800 ring-1 ring-amber-200">
          Si sta attingendo alla tolleranza di overbooking: {totali.adulti} adulti prenotati su
          una capienza di {config.capienzaAdulti} (limite {limite}).
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat
          etichetta="Adulti"
          valore={`${totali.adulti}/${config.capienzaAdulti}`}
          nota={`${occupazionePct}% della capienza`}
          evidenzia={oltreCapienza}
        />
        <Stat etichetta="Bambini" valore={totali.bambini} />
        <Stat etichetta="Ospiti" valore={totali.ospiti} />
        <Stat
          etichetta="Persone attese"
          valore={totali.persone}
          nota={`${totali.prenotazioni} prenotazioni`}
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat etichetta="Presenti" valore={totali.presenti} />
        {data < oggi && <Stat etichetta="Non presentati" valore={totali.assenti} />}
      </div>

      <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Prenotazioni ({attive.length})
          </h2>
          <FormPrenotaPerSocio
            data={data}
            soci={soci.map((s) => ({
              id: s.id,
              etichetta: `${s.cognome} ${s.nome} · tessera ${s.numeroTessera}`,
            }))}
          />
        </div>

        {attive.length === 0 ? (
          <p className={`${RIQUADRO} text-sm text-slate-500`}>
            Nessuna prenotazione per questa giornata.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            {attive.map((p) => (
              <RigaPresenza
                key={p.id}
                prenotazione={p}
                socio={p.socio}
                checkInPossibile={checkInPossibile}
              />
            ))}
          </ul>
        )}
      </section>

      {annullate.length > 0 && (
        <details className="mt-6">
          <summary className="cursor-pointer text-sm font-medium text-slate-600">
            Prenotazioni annullate ({annullate.length})
          </summary>
          <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
            {annullate.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <span className="text-sm text-slate-600">
                  {p.socio.cognome} {p.socio.nome}
                </span>
                <span className="text-sm text-slate-400">{descriviGruppo(p)}</span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </>
  );
}
