"use client";

import { useActionState, useState } from "react";
import { salvaPrenotazioneAction } from "@/app/azioni";
import {
  costoOspitiCent,
  formattaEuro,
  totalePersone,
  type Gruppo,
} from "@/lib/disponibilita";
import { persone } from "@/lib/ui";

interface Props {
  data: string;
  iniziale: Gruppo;
  maxPersone: number;
  /** Tetto sugli adulti, già ridotto ai posti realmente disponibili. */
  maxAdulti: number;
  tariffaOspiteAdultoCent: number;
  tariffaOspiteBambinoCent: number;
  modifica: boolean;
}

export default function FormPrenotazione({
  data,
  iniziale,
  maxPersone,
  maxAdulti,
  tariffaOspiteAdultoCent,
  tariffaOspiteBambinoCent,
  modifica,
}: Props) {
  const [gruppo, setGruppo] = useState<Gruppo>(iniziale);
  const [stato, azione, inCorso] = useActionState(salvaPrenotazioneAction, null);

  const tariffe = { tariffaOspiteAdultoCent, tariffaOspiteBambinoCent };
  const totale = totalePersone(gruppo);
  const costo = costoOspitiCent(gruppo, tariffe);

  const righe: { campo: keyof Gruppo; titolo: string; nota: string }[] = [
    {
      campo: "adulti",
      titolo: "Adulti tesserati",
      nota: "Te compreso. Sono i soli che occupano posti.",
    },
    { campo: "bambini", titolo: "Bambini tesserati", nota: "Non occupano posti." },
    {
      campo: "ospitiAdulti",
      titolo: "Ospiti adulti",
      nota: `${formattaEuro(tariffaOspiteAdultoCent)} a testa, da pagare in cassa`,
    },
    {
      campo: "ospitiBambini",
      titolo: "Ospiti bambini",
      nota: `${formattaEuro(tariffaOspiteBambinoCent)} a testa, da pagare in cassa`,
    },
  ];

  function limiteMinimo(campo: keyof Gruppo): number {
    // Senza almeno un adulto non c'è nessun responsabile del gruppo.
    return campo === "adulti" ? 1 : 0;
  }

  function modifica_(campo: keyof Gruppo, delta: number) {
    setGruppo((g) => {
      const valore = Math.max(limiteMinimo(campo), g[campo] + delta);
      if (campo === "adulti" && valore > maxAdulti) return g;

      const nuovo = { ...g, [campo]: valore };
      if (totalePersone(nuovo) > maxPersone) return g;
      return nuovo;
    });
  }

  function puoAumentare(campo: keyof Gruppo): boolean {
    if (totale >= maxPersone) return false;
    if (campo === "adulti" && gruppo.adulti >= maxAdulti) return false;
    return true;
  }

  return (
    <form action={azione} className="space-y-4">
      <input type="hidden" name="data" value={data} />

      <div className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-superficie ring-1 ring-slate-200">
        {righe.map(({ campo, titolo, nota }) => (
          <div key={campo} className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-slate-900">{titolo}</p>
              <p className="mt-0.5 text-sm text-slate-500">{nota}</p>
            </div>

            <input type="hidden" name={campo} value={gruppo[campo]} />

            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => modifica_(campo, -1)}
                disabled={gruppo[campo] <= limiteMinimo(campo)}
                aria-label={`Togli un valore da ${titolo}`}
                className="flex h-11 w-11 items-center justify-center rounded-full text-xl font-medium text-sky-700 ring-1 ring-slate-300 transition active:bg-sky-50 disabled:opacity-30"
              >
                −
              </button>
              <span
                aria-live="polite"
                className="w-9 text-center text-lg font-semibold tabular-nums"
              >
                {gruppo[campo]}
              </span>
              <button
                type="button"
                onClick={() => modifica_(campo, 1)}
                disabled={!puoAumentare(campo)}
                aria-label={`Aggiungi un valore a ${titolo}`}
                className="flex h-11 w-11 items-center justify-center rounded-full text-xl font-medium text-sky-700 ring-1 ring-slate-300 transition active:bg-sky-50 disabled:opacity-30"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl bg-superficie p-4 ring-1 ring-slate-200">
        <div className="flex items-baseline justify-between">
          <span className="text-slate-600">In totale</span>
          <span className="font-semibold">{persone(totale)}</span>
        </div>
        {costo > 0 && (
          <div className="mt-2 flex items-baseline justify-between border-t border-slate-100 pt-2">
            <span className="text-slate-600">Da pagare in cassa</span>
            <span className="font-semibold text-slate-900">{formattaEuro(costo)}</span>
          </div>
        )}
        {totale >= maxPersone && (
          <p className="mt-2 text-sm text-amber-700">
            Hai raggiunto il massimo di {maxPersone} persone per prenotazione.
          </p>
        )}
      </div>

      {stato?.errore && (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200"
        >
          {stato.errore}
        </p>
      )}

      <button
        type="submit"
        disabled={inCorso}
        className="w-full rounded-xl bg-sky-600 px-4 py-3.5 text-base font-semibold text-white shadow-sm transition active:bg-sky-800 disabled:opacity-60"
      >
        {inCorso ? "Attendi…" : modifica ? "Salva le modifiche" : "Conferma la prenotazione"}
      </button>
    </form>
  );
}
