"use client";

import { useEffect, useState } from "react";
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

export default function SearchableSociList({
  soci,
  totale,
  oggi,
  queryIniziale,
}: {
  soci: Socio[];
  totale: number;
  oggi: string;
  queryIniziale: string | undefined;
}) {
  const router = useRouter();
  const [q, setQ] = useState(queryIniziale ?? "");
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timeoutId) clearTimeout(timeoutId);

    const id = setTimeout(() => {
      const params = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
      router.push(`/admin/soci${params}`);
    }, 300);

    setTimeoutId(id);

    return () => clearTimeout(id);
  }, [q, router]);

  const filtrati = q
    ? soci.filter((s) =>
        [s.nome, s.cognome, s.email, s.numeroTessera]
          .join(" ")
          .toLowerCase()
          .includes(q.toLowerCase()),
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
          {q
            ? `Nessun socio trovato per «${q}».`
            : totale === 0
              ? "Non c'è ancora nessun socio."
              : ""}
        </p>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
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
