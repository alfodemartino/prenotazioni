"use client";

import { useActionState } from "react";
import { salvaGiornata } from "@/app/admin/azioni";
import Avviso from "./Avviso";
import { campo, spunta } from "./valori";
import { AIUTO, BOTTONE_PRIMARIO, ETICHETTA, INPUT, RIQUADRO } from "./stili";

export interface ValoriGiornata {
  data: string;
  aperta: boolean;
  capienzaAdulti: number;
  overbookingPct: number;
  oraApertura: string;
  oraChiusura: string;
  nota: string | null;
}

export default function FormGiornata({
  valori,
  limite,
  adultiOccupati,
}: {
  valori: ValoriGiornata;
  /** Posti vendibili con l'overbooking attuale, mostrato come riscontro. */
  limite: number;
  adultiOccupati: number;
}) {
  const [stato, azione, inCorso] = useActionState(salvaGiornata, null);

  // Dopo un errore React svuota il modulo: si riparte da ciò che era stato inviato.
  const v = (nome: keyof ValoriGiornata) => campo(stato, nome, valori[nome] as string | number);

  return (
    <form action={azione} className={`${RIQUADRO} space-y-5`}>
      <input type="hidden" name="data" value={valori.data} />

      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="aperta"
          defaultChecked={spunta(stato, "aperta", valori.aperta)}
          className="mt-1 h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
        />
        <span>
          <span className="font-medium text-slate-900">Giornata aperta</span>
          <span className={AIUTO}>
            Togliendo la spunta la giornata smette di essere prenotabile. Le prenotazioni già
            accettate restano valide: vanno annullate a mano dal registro.
          </span>
        </span>
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="capienzaAdulti" className={ETICHETTA}>
            Capienza adulti
          </label>
          <input
            id="capienzaAdulti"
            name="capienzaAdulti"
            type="number"
            min={0}
            defaultValue={v("capienzaAdulti")}
            className={INPUT}
          />
          <p className={AIUTO}>
            Attualmente prenotati {adultiOccupati} adulti; il limite con la tolleranza è {limite}.
          </p>
        </div>

        <div>
          <label htmlFor="overbookingPct" className={ETICHETTA}>
            Overbooking (%)
          </label>
          <input
            id="overbookingPct"
            name="overbookingPct"
            type="number"
            min={0}
            max={100}
            defaultValue={v("overbookingPct")}
            className={INPUT}
          />
          <p className={AIUTO}>Percentuale accettata oltre la capienza, contando sui no-show.</p>
        </div>

        <div>
          <label htmlFor="oraApertura" className={ETICHETTA}>
            Apertura
          </label>
          <input
            id="oraApertura"
            name="oraApertura"
            type="time"
            defaultValue={v("oraApertura")}
            className={INPUT}
          />
        </div>

        <div>
          <label htmlFor="oraChiusura" className={ETICHETTA}>
            Chiusura
          </label>
          <input
            id="oraChiusura"
            name="oraChiusura"
            type="time"
            defaultValue={v("oraChiusura")}
            className={INPUT}
          />
          <p className={AIUTO}>Dopo quest'ora la giornata non è più prenotabile.</p>
        </div>
      </div>

      <div>
        <label htmlFor="nota" className={ETICHETTA}>
          Nota per i soci (facoltativa)
        </label>
        <input
          id="nota"
          name="nota"
          type="text"
          defaultValue={campo(stato, "nota", valori.nota)}
          placeholder="Es. Vasca grande chiusa per manutenzione"
          className={INPUT}
        />
        <p className={AIUTO}>Compare sulla scheda della giornata nell'area soci.</p>
      </div>

      <Avviso stato={stato} />

      <button type="submit" disabled={inCorso} className={BOTTONE_PRIMARIO}>
        {inCorso ? "Salvataggio…" : "Salva la giornata"}
      </button>
    </form>
  );
}
