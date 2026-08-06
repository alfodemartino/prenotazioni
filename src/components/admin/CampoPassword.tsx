"use client";

import { useState } from "react";
import RequisitiPassword from "@/components/RequisitiPassword";
import { generaPasswordLeggibile, type ContestoPassword } from "@/lib/password";
import { AIUTO, BOTTONE_SECONDARIO, ETICHETTA, INPUT } from "./stili";

/**
 * Campo per la password che la segreteria consegna al socio.
 *
 * Il valore è in chiaro di proposito: va letto ad alta voce o trascritto, e
 * nasconderlo costringerebbe a copiarlo alla cieca. Arriva già precompilato con
 * una proposta conforme ai requisiti, così nessuno è tentato di inventarsi
 * «Circolo2026» pur di fare in fretta.
 */
export default function CampoPassword({
  id,
  etichetta,
  aiuto,
  iniziale,
  lunghezzaMinima,
  contesto,
}: {
  id: string;
  etichetta: string;
  aiuto: string;
  iniziale: string;
  lunghezzaMinima: number;
  contesto?: ContestoPassword;
}) {
  const [password, setPassword] = useState(iniziale);
  const [copiata, setCopiata] = useState(false);

  function aggiorna(valore: string) {
    setPassword(valore);
    setCopiata(false);
  }

  function generaAltra() {
    try {
      aggiorna(generaPasswordLeggibile({ lunghezzaMinima, contesto }));
    } catch {
      // Non dovrebbe accadere: se accadesse, si lascia scrivere a mano.
    }
  }

  async function copia() {
    try {
      await navigator.clipboard.writeText(password);
      setCopiata(true);
      setTimeout(() => setCopiata(false), 2500);
    } catch {
      // Copia non disponibile (contesto non sicuro o permesso negato):
      // la password resta comunque leggibile nel campo.
    }
  }

  return (
    <div>
      <label htmlFor={id} className={ETICHETTA}>
        {etichetta}
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <input
          id={id}
          name="password"
          type="text"
          required
          autoComplete="off"
          spellCheck={false}
          value={password}
          onChange={(e) => aggiorna(e.target.value)}
          className={`${INPUT} min-w-56 flex-1 font-mono`}
        />

        <button type="button" onClick={generaAltra} className={BOTTONE_SECONDARIO}>
          Genera un&apos;altra
        </button>

        <button type="button" onClick={copia} className={BOTTONE_SECONDARIO}>
          {copiata ? "Copiata" : "Copia"}
        </button>
      </div>

      <p className={AIUTO}>{aiuto}</p>

      <RequisitiPassword
        password={password}
        lunghezzaMinima={lunghezzaMinima}
        contesto={contesto}
      />
    </div>
  );
}
