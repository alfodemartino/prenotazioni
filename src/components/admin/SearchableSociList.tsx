"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { INPUT, RIQUADRO } from "./stili";

interface Socio {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  numeroTessera: string;
  ruolo: string;
  stato: string;
  scadenzaTessera: string | null;
}

function Etichetta({ testo, tono }: { testo: string; tono: "rosso" | "grigio" }) {
  const classi = {
    rosso: "bg-rose-100 text-rose-800",
    grigio: "bg-slate-200 text-slate-600",
  }[tono];

  return (
    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${classi}`}>{testo}</span>
  );
}

/**
 * Elenco dei soci con ricerca dal vivo.
 *
 * `soci` è sempre l'elenco completo: il filtro sta qui, così ogni tasto ha
 * effetto immediato e nessuna risposta del server può arrivare in ritardo con
 * un elenco già ristretto.
 *
 * L'URL segue la ricerca con un po' di calma (300 ms) solo per renderla
 * condivisibile e ricaricabile; non serve a produrre i risultati.
 */
export default function SearchableSociList({
  soci,
  oggi,
  queryIniziale,
}: {
  soci: Socio[];
  oggi: string;
  queryIniziale: string | undefined;
}) {
  const router = useRouter();
  const [q, setQ] = useState(queryIniziale ?? "");

  // Al primo render l'URL rispecchia già `queryIniziale`: riscriverlo
  // significherebbe solo una navigazione in più a ogni visita della pagina.
  const primoRender = useRef(true);

  useEffect(() => {
    if (primoRender.current) {
      primoRender.current = false;
      return;
    }

    const id = setTimeout(() => {
      const ricerca = q.trim();
      // `replace` e non `push`: ogni pausa nella digitazione lascerebbe una voce
      // di cronologia, e il tasto Indietro ripercorrerebbe le ricerche invece di
      // riportare il socio alla pagina precedente.
      router.replace(ricerca ? `/admin/soci?q=${encodeURIComponent(ricerca)}` : "/admin/soci", {
        scroll: false,
      });
    }, 300);

    return () => clearTimeout(id);
  }, [q, router]);

  const ricerca = q.trim().toLowerCase();

  const filtrati = ricerca
    ? soci.filter((s) =>
        [s.nome, s.cognome, s.email, s.numeroTessera]
          .join(" ")
          .toLowerCase()
          .includes(ricerca),
      )
    : soci;

  return (
    <>
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.currentTarget.value)}
        placeholder="Cerca per nome, tessera o email"
        aria-label="Cerca un socio"
        className={INPUT}
      />

      {filtrati.length === 0 ? (
        <p className={`${RIQUADRO} text-sm text-slate-500`}>
          {ricerca ? `Nessun socio trovato per «${q.trim()}».` : "Non c'è ancora nessun socio."}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-superficie shadow-sm ring-1 ring-slate-200">
          {filtrati.map((s) => {
            const tesseraScaduta = Boolean(s.scadenzaTessera && s.scadenzaTessera < oggi);

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
