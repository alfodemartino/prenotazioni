"use client";

import { useActionState, useState } from "react";
import { prenotaPerSocio } from "@/app/admin/azioni";
import Avviso from "./Avviso";
import { campo } from "./valori";
import { BOTTONE_PRIMARIO, BOTTONE_SECONDARIO, ETICHETTA, INPUT, RIQUADRO } from "./stili";

export interface VoceSocio {
  id: string;
  etichetta: string;
}

const CAMPI = [
  ["adulti", "Adulti", 1],
  ["bambini", "Bambini", 0],
  ["ospitiAdulti", "Ospiti adulti", 0],
  ["ospitiBambini", "Ospiti bambini", 0],
] as const;

/** Prenotazione registrata dalla segreteria per conto di un socio. */
export default function FormPrenotaPerSocio({
  data,
  soci,
}: {
  data: string;
  soci: VoceSocio[];
}) {
  const [aperto, setAperto] = useState(false);
  const [stato, azione, inCorso] = useActionState(prenotaPerSocio, null);

  if (!aperto) {
    return (
      <button type="button" onClick={() => setAperto(true)} className={BOTTONE_SECONDARIO}>
        Aggiungi una prenotazione
      </button>
    );
  }

  return (
    <form action={azione} className={`${RIQUADRO} space-y-4`}>
      <input type="hidden" name="data" value={data} />

      <div>
        <label htmlFor="socioId" className={ETICHETTA}>
          Socio
        </label>
        <select
          id="socioId"
          name="socioId"
          required
          defaultValue={stato?.valori?.socioId}
          className={INPUT}
        >
          {soci.map((s) => (
            <option key={s.id} value={s.id}>
              {s.etichetta}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {CAMPI.map(([nome, etichetta, predefinito]) => (
          <label key={nome} className="block">
            <span className={ETICHETTA}>{etichetta}</span>
            <input
              type="number"
              name={nome}
              min={0}
              defaultValue={campo(stato, nome, predefinito)}
              className={INPUT}
            />
          </label>
        ))}
      </div>

      <Avviso stato={stato} />

      <div className="flex gap-2">
        <button type="submit" disabled={inCorso} className={BOTTONE_PRIMARIO}>
          {inCorso ? "Attendi…" : "Registra prenotazione"}
        </button>
        <button type="button" onClick={() => setAperto(false)} className={BOTTONE_SECONDARIO}>
          Chiudi
        </button>
      </div>
    </form>
  );
}
