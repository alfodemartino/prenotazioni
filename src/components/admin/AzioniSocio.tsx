"use client";

import { useActionState } from "react";
import { cambiaStatoSocio, reimpostaPassword } from "@/app/admin/azioni";
import type { ContestoPassword } from "@/lib/password";
import Avviso from "./Avviso";
import CampoPassword from "./CampoPassword";
import {
  AIUTO,
  BOTTONE_PERICOLO,
  BOTTONE_PRIMARIO,
  BOTTONE_SECONDARIO,
  RIQUADRO,
} from "./stili";

export default function AzioniSocio({
  id,
  nomeCompleto,
  sospeso,
  seStesso,
  lunghezzaMinima,
  contesto,
  passwordSuggerita,
}: {
  id: string;
  nomeCompleto: string;
  sospeso: boolean;
  /** L'amministratore collegato non può sospendere sé stesso. */
  seStesso: boolean;
  lunghezzaMinima: number;
  contesto: ContestoPassword;
  /** Proposta già conforme ai requisiti, generata dal server. */
  passwordSuggerita: string;
}) {
  const [stato, azione, inCorso] = useActionState(reimpostaPassword, null);

  return (
    <div className={`${RIQUADRO} space-y-6`}>
      <div>
        <h2 className="font-semibold text-slate-900">Password</h2>

        <form action={azione} className="mt-3 space-y-3">
          <input type="hidden" name="id" value={id} />

          <CampoPassword
            id="nuovaPassword"
            etichetta="Nuova password"
            aiuto={`Già pronta e conforme ai requisiti: dettala a ${nomeCompleto} così com'è. Dovrà cambiarla al primo accesso.`}
            iniziale={passwordSuggerita}
            lunghezzaMinima={lunghezzaMinima}
            contesto={contesto}
          />

          <Avviso stato={stato} />

          <button type="submit" disabled={inCorso} className={BOTTONE_PRIMARIO}>
            {inCorso ? "Attendi…" : "Reimposta la password"}
          </button>
        </form>
      </div>

      <div className="border-t border-slate-100 pt-5">
        <h2 className="font-semibold text-slate-900">Stato del profilo</h2>
        <p className={AIUTO}>
          Un socio sospeso non può accedere né prenotare. Le prenotazioni già registrate
          restano nel sistema.
        </p>

        {seStesso ? (
          <p className="mt-3 text-sm text-slate-500">
            Non puoi sospendere il profilo con cui sei collegato.
          </p>
        ) : (
          <form
            action={cambiaStatoSocio}
            className="mt-3"
            onSubmit={(e) => {
              const messaggio = sospeso
                ? `Riattivare ${nomeCompleto}?`
                : `Sospendere ${nomeCompleto}?`;
              if (!window.confirm(messaggio)) e.preventDefault();
            }}
          >
            <input type="hidden" name="id" value={id} />
            <button
              type="submit"
              className={sospeso ? BOTTONE_SECONDARIO : BOTTONE_PERICOLO}
            >
              {sospeso ? "Riattiva il socio" : "Sospendi il socio"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
