import Link from "next/link";
import { notFound } from "next/navigation";
import FormSocio from "@/components/admin/FormSocio";
import AzioniSocio from "@/components/admin/AzioniSocio";
import BannerEsito from "@/components/admin/BannerEsito";
import { RIQUADRO } from "@/components/admin/stili";
import { dettaglioSocio } from "@/lib/admin";
import { richiediAdmin } from "@/lib/auth";
import { dataEstesa } from "@/lib/date";
import { generaPasswordLeggibile, lunghezzaMinimaPerRuolo } from "@/lib/password";
import { descriviGruppo } from "@/lib/ui";

export const dynamic = "force-dynamic";

export default async function PaginaSocio({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ creato?: string; salvato?: string; password?: string }>;
}) {
  const [{ id }, sp, admin] = await Promise.all([params, searchParams, richiediAdmin()]);

  const dettaglio = await dettaglioSocio(id);
  if (!dettaglio) notFound();

  const { socio, prenotazioni, oggi } = dettaglio;
  const nomeCompleto = `${socio.cognome} ${socio.nome}`;

  const contestoPassword = {
    nome: socio.nome,
    cognome: socio.cognome,
    email: socio.email,
    numeroTessera: socio.numeroTessera,
  };

  const lunghezzaMinima = lunghezzaMinimaPerRuolo(socio.ruolo);

  return (
    <>
      <Link
        href="/admin/soci"
        className="mb-5 inline-block text-sm font-medium text-sky-700 underline-offset-2 hover:underline"
      >
        ← Torna ai soci
      </Link>

      <BannerEsito
        messaggio={
          sp.creato
            ? "Socio creato. Ricordati di consegnargli email e password iniziale."
            : sp.password
              ? "Password reimpostata. Il socio dovrà cambiarla al primo accesso."
              : sp.salvato
                ? "Anagrafica aggiornata."
                : null
        }
      />


      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{nomeCompleto}</h1>
          <p className="mt-1 text-slate-600">
            tessera {socio.numeroTessera} · {socio.email}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {socio.stato !== "ATTIVO" && (
            <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800">
              Sospeso
            </span>
          )}
          {socio.deveCambiarePassword && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
              Deve cambiare password
            </span>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <FormSocio
          modalita="modifica"
          valori={{
            id: socio.id,
            nome: socio.nome,
            cognome: socio.cognome,
            email: socio.email,
            numeroTessera: socio.numeroTessera,
            telefono: socio.telefono,
            note: socio.note,
            scadenzaTessera: socio.scadenzaTessera,
            ruolo: socio.ruolo,
          }}
        />

        <AzioniSocio
          id={socio.id}
          nomeCompleto={nomeCompleto}
          sospeso={socio.stato !== "ATTIVO"}
          seStesso={socio.id === admin.id}
          lunghezzaMinima={lunghezzaMinima}
          contesto={contestoPassword}
          passwordSuggerita={generaPasswordLeggibile({
            lunghezzaMinima,
            contesto: contestoPassword,
          })}
        />

        <section>
          <h2 className="mb-3 font-semibold text-slate-900">Ultime prenotazioni</h2>

          {prenotazioni.length === 0 ? (
            <p className={`${RIQUADRO} text-sm text-slate-500`}>
              Questo socio non ha ancora prenotato.
            </p>
          ) : (
            <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
              {prenotazioni.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
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
                          : "In programma"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
