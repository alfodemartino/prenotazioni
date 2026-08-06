import Link from "next/link";
import { elencoSoci } from "@/lib/admin";
import { BOTTONE_PRIMARIO, INPUT, RIQUADRO } from "@/components/admin/stili";

export const dynamic = "force-dynamic";

function Etichetta({ testo, tono }: { testo: string; tono: "rosso" | "ambra" | "grigio" }) {
  const classi = {
    rosso: "bg-rose-100 text-rose-800",
    ambra: "bg-amber-100 text-amber-800",
    grigio: "bg-slate-200 text-slate-600",
  }[tono];

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classi}`}>{testo}</span>
  );
}

export default async function PaginaSoci({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { soci, totale, oggi } = await elencoSoci(q);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Soci</h1>
          <p className="mt-1 text-slate-600">
            {totale} {totale === 1 ? "profilo registrato" : "profili registrati"}
          </p>
        </div>
        <Link href="/admin/soci/nuovo" className={BOTTONE_PRIMARIO}>
          Nuovo socio
        </Link>
      </div>

      <form method="get" className="mb-5 flex gap-2">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Cerca per nome, tessera o email"
          aria-label="Cerca un socio"
          className={INPUT}
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 ring-1 ring-slate-300"
        >
          Cerca
        </button>
      </form>

      {soci.length === 0 ? (
        <p className={`${RIQUADRO} text-sm text-slate-500`}>
          {q ? `Nessun socio trovato per «${q}».` : "Non c'è ancora nessun socio."}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          {soci.map((s) => {
            const tesseraScaduta = Boolean(s.scadenzaTessera && s.scadenzaTessera < oggi);
            const certificatoScaduto = Boolean(
              s.scadenzaCertificato && s.scadenzaCertificato < oggi,
            );

            return (
              <li key={s.id}>
                <Link
                  href={`/admin/soci/${s.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-slate-50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-slate-900">
                      {s.cognome} {s.nome}
                    </p>
                    <p className="truncate text-sm text-slate-500">
                      tessera {s.numeroTessera} · {s.email}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                    {s.ruolo === "ADMIN" && <Etichetta testo="Admin" tono="grigio" />}
                    {s.stato !== "ATTIVO" && <Etichetta testo="Sospeso" tono="rosso" />}
                    {tesseraScaduta && <Etichetta testo="Tessera scaduta" tono="rosso" />}
                    {certificatoScaduto && (
                      <Etichetta testo="Certificato scaduto" tono="ambra" />
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
