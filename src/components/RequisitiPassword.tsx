"use client";

import { requisiti, type ContestoPassword } from "@/lib/password";

/**
 * Elenco dei requisiti che si spunta mentre si digita.
 *
 * È solo un aiuto visivo: la verifica che conta avviene sul server, dove
 * arrivano anche i dati anagrafici definitivi.
 */
export default function RequisitiPassword({
  password,
  lunghezzaMinima,
  contesto,
}: {
  password: string;
  lunghezzaMinima?: number;
  contesto?: ContestoPassword;
}) {
  const elenco = requisiti(password, { lunghezzaMinima, contesto });
  const vuota = password.length === 0;

  return (
    <ul aria-live="polite" className="mt-2 space-y-1">
      {elenco.map((r) => {
        const acceso = !vuota && r.soddisfatto;

        return (
          <li
            key={r.id}
            className={`flex items-start gap-2 text-sm ${
              acceso ? "text-emerald-700" : "text-slate-500"
            }`}
          >
            <span aria-hidden className="mt-px w-3.5 shrink-0 text-center">
              {acceso ? "✓" : "○"}
            </span>
            <span>
              {r.descrizione}
              <span className="sr-only">{acceso ? " — soddisfatto" : " — da soddisfare"}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
