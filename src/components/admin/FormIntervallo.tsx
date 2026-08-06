"use client";

import { useActionState, useState } from "react";
import { chiudiIntervallo } from "@/app/admin/azioni";
import Avviso from "./Avviso";
import { campo } from "./valori";
import { AIUTO, BOTTONE_PRIMARIO, BOTTONE_SECONDARIO, ETICHETTA, INPUT, RIQUADRO } from "./stili";

/** Chiusura o riapertura di più giornate insieme (manutenzioni, stagione, meteo). */
export default function FormIntervallo({ da }: { da: string }) {
  const [aperto, setAperto] = useState(false);
  const [stato, azione, inCorso] = useActionState(chiudiIntervallo, null);

  if (!aperto) {
    return (
      <button type="button" onClick={() => setAperto(true)} className={BOTTONE_SECONDARIO}>
        Chiudi o riapri più giornate
      </button>
    );
  }

  return (
    <form action={azione} className={`${RIQUADRO} space-y-4`}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="da" className={ETICHETTA}>
            Dal giorno
          </label>
          <input
            id="da"
            name="da"
            type="date"
            defaultValue={campo(stato, "da", da)}
            required
            className={INPUT}
          />
        </div>
        <div>
          <label htmlFor="a" className={ETICHETTA}>
            Al giorno (incluso)
          </label>
          <input
            id="a"
            name="a"
            type="date"
            defaultValue={campo(stato, "a", da)}
            required
            className={INPUT}
          />
        </div>
      </div>

      <div>
        <label htmlFor="operazione" className={ETICHETTA}>
          Operazione
        </label>
        <select
          id="operazione"
          name="operazione"
          defaultValue={campo(stato, "operazione", "chiudi")}
          className={INPUT}
        >
          <option value="chiudi">Chiudi le giornate</option>
          <option value="riapri">Riapri le giornate</option>
        </select>
      </div>

      <div>
        <label htmlFor="notaIntervallo" className={ETICHETTA}>
          Nota per i soci (facoltativa)
        </label>
        <input
          id="notaIntervallo"
          name="nota"
          type="text"
          defaultValue={campo(stato, "nota", "")}
          placeholder="Es. Chiusura per manutenzione annuale"
          className={INPUT}
        />
        <p className={AIUTO}>
          Le prenotazioni già accettate non vengono annullate: vanno gestite dal registro.
        </p>
      </div>

      <Avviso stato={stato} />

      <div className="flex gap-2">
        <button type="submit" disabled={inCorso} className={BOTTONE_PRIMARIO}>
          {inCorso ? "Attendi…" : "Applica"}
        </button>
        <button type="button" onClick={() => setAperto(false)} className={BOTTONE_SECONDARIO}>
          Chiudi
        </button>
      </div>
    </form>
  );
}
