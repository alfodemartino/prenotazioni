"use client";

import { useActionState, useState } from "react";
import { cambiaPassword } from "@/app/azioni";
import RequisitiPassword from "./RequisitiPassword";
import type { ContestoPassword } from "@/lib/password";

const CAMPO =
  "w-full rounded-xl border-0 bg-white px-4 py-3 text-base ring-1 ring-slate-300 outline-none focus:ring-2 focus:ring-sky-500";

const ETICHETTA = "mb-1.5 block text-sm font-medium text-slate-700";

export default function ModuloCambioPassword({
  lunghezzaMinima,
  contesto,
}: {
  lunghezzaMinima: number;
  contesto: ContestoPassword;
}) {
  const [stato, azione, inCorso] = useActionState(cambiaPassword, null);

  // La nuova password è tenuta nello stato per poter aggiornare l'elenco dei
  // requisiti mentre si scrive. Resta nel browser: non viene mai rimandata
  // indietro dal server insieme agli errori.
  const [nuova, setNuova] = useState("");

  return (
    <form action={azione} className="space-y-4">
      <div>
        <label htmlFor="attuale" className={ETICHETTA}>
          Password attuale
        </label>
        <input
          id="attuale"
          name="attuale"
          type="password"
          required
          autoComplete="current-password"
          className={CAMPO}
        />
      </div>

      <div>
        <label htmlFor="nuova" className={ETICHETTA}>
          Nuova password
        </label>
        <input
          id="nuova"
          name="nuova"
          type="password"
          required
          value={nuova}
          onChange={(e) => setNuova(e.target.value)}
          autoComplete="new-password"
          className={CAMPO}
        />
        <RequisitiPassword
          password={nuova}
          lunghezzaMinima={lunghezzaMinima}
          contesto={contesto}
        />
      </div>

      <div>
        <label htmlFor="conferma" className={ETICHETTA}>
          Ripeti la nuova password
        </label>
        <input
          id="conferma"
          name="conferma"
          type="password"
          required
          autoComplete="new-password"
          className={CAMPO}
        />
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
        className="w-full rounded-xl bg-sky-600 px-4 py-3.5 text-base font-semibold text-white shadow-sm transition active:bg-sky-700 disabled:opacity-60"
      >
        {inCorso ? "Attendi…" : "Salva la nuova password"}
      </button>
    </form>
  );
}
