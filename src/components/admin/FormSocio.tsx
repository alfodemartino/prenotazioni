"use client";

import { useActionState, useState } from "react";
import { aggiornaSocio, creaSocio } from "@/app/admin/azioni";
import { lunghezzaMinimaPerRuolo, type ContestoPassword } from "@/lib/password";
import Avviso from "./Avviso";
import CampoPassword from "./CampoPassword";
import { campo } from "./valori";
import { AIUTO, BOTTONE_PRIMARIO, ETICHETTA, INPUT, RIQUADRO } from "./stili";

/** Legge un campo del modulo senza doverlo rendere controllato. */
function valoreCampo(modulo: HTMLFormElement, nome: string): string {
  const elemento = modulo.elements.namedItem(nome);

  if (elemento instanceof HTMLInputElement || elemento instanceof HTMLSelectElement) {
    return elemento.value;
  }

  return "";
}

export interface ValoriSocio {
  id?: string;
  nome: string;
  cognome: string;
  email: string;
  numeroTessera: string;
  telefono: string | null;
  note: string | null;
  scadenzaTessera: string | null;
  ruolo: string;
}

export const SOCIO_VUOTO: ValoriSocio = {
  nome: "",
  cognome: "",
  email: "",
  numeroTessera: "",
  telefono: null,
  note: null,
  scadenzaTessera: null,
  ruolo: "SOCIO",
};

export default function FormSocio({
  modalita,
  valori,
  passwordSuggerita = "",
}: {
  modalita: "nuovo" | "modifica";
  valori: ValoriSocio;
  /** Proposta già conforme ai requisiti, generata dal server. */
  passwordSuggerita?: string;
}) {
  const nuovo = modalita === "nuovo";
  const [stato, azione, inCorso] = useActionState(nuovo ? creaSocio : aggiornaSocio, null);

  // Anagrafica e ruolo correnti servono all'elenco dei requisiti della password:
  // si rileggono dal modulo a ogni modifica, così la regola «non usare il tuo
  // cognome» reagisce anche a un cognome appena digitato.
  const [datiPassword, setDatiPassword] = useState<{
    contesto: ContestoPassword;
    ruolo: string;
  }>({ contesto: {}, ruolo: valori.ruolo });

  function rileggiDati(modulo: HTMLFormElement) {
    setDatiPassword({
      ruolo: valoreCampo(modulo, "ruolo") || valori.ruolo,
      contesto: {
        nome: valoreCampo(modulo, "nome"),
        cognome: valoreCampo(modulo, "cognome"),
        email: valoreCampo(modulo, "email"),
        numeroTessera: valoreCampo(modulo, "numeroTessera"),
      },
    });
  }

  // Dopo un errore React svuota il modulo: si riparte da ciò che era stato inviato.
  const v = (nome: keyof ValoriSocio) => campo(stato, nome, valori[nome] ?? null);

  return (
    <form
      action={azione}
      onChange={(e) => rileggiDati(e.currentTarget)}
      className={`${RIQUADRO} space-y-5`}
    >
      {valori.id && <input type="hidden" name="id" value={valori.id} />}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="nome" className={ETICHETTA}>
            Nome
          </label>
          <input
            id="nome"
            name="nome"
            required
            defaultValue={v("nome")}
            autoComplete="off"
            className={INPUT}
          />
        </div>

        <div>
          <label htmlFor="cognome" className={ETICHETTA}>
            Cognome
          </label>
          <input
            id="cognome"
            name="cognome"
            required
            defaultValue={v("cognome")}
            autoComplete="off"
            className={INPUT}
          />
        </div>

        <div>
          <label htmlFor="email" className={ETICHETTA}>
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            defaultValue={v("email")}
            autoComplete="off"
            className={INPUT}
          />
          <p className={AIUTO}>Serve al socio per accedere.</p>
        </div>

        <div>
          <label htmlFor="numeroTessera" className={ETICHETTA}>
            Numero di tessera
          </label>
          <input
            id="numeroTessera"
            name="numeroTessera"
            required
            defaultValue={v("numeroTessera")}
            autoComplete="off"
            className={INPUT}
          />
        </div>

        <div>
          <label htmlFor="telefono" className={ETICHETTA}>
            Telefono (facoltativo)
          </label>
          <input
            id="telefono"
            name="telefono"
            defaultValue={v("telefono")}
            autoComplete="off"
            className={INPUT}
          />
        </div>

        <div>
          <label htmlFor="ruolo" className={ETICHETTA}>
            Ruolo
          </label>
          <select id="ruolo" name="ruolo" defaultValue={v("ruolo")} className={INPUT}>
            <option value="SOCIO">Socio</option>
            <option value="ADMIN">Amministratore</option>
          </select>
          <p className={AIUTO}>Gli amministratori vedono questo pannello.</p>
        </div>

        <div>
          <label htmlFor="scadenzaTessera" className={ETICHETTA}>
            Scadenza tessera (facoltativa)
          </label>
          <input
            id="scadenzaTessera"
            name="scadenzaTessera"
            type="date"
            defaultValue={v("scadenzaTessera")}
            className={INPUT}
          />
          <p className={AIUTO}>Oltre questa data non potrà prenotare.</p>
        </div>
      </div>

      <div>
        <label htmlFor="note" className={ETICHETTA}>
          Note interne (facoltative)
        </label>
        <input id="note" name="note" defaultValue={v("note")} className={INPUT} />
      </div>

      {nuovo && (
        <CampoPassword
          id="password"
          etichetta="Password iniziale"
          aiuto="Già pronta e conforme ai requisiti: dettala al socio così com'è. Dovrà cambiarla al primo accesso."
          iniziale={passwordSuggerita}
          lunghezzaMinima={lunghezzaMinimaPerRuolo(datiPassword.ruolo)}
          contesto={datiPassword.contesto}
        />
      )}

      <Avviso stato={stato} />

      <button type="submit" disabled={inCorso} className={BOTTONE_PRIMARIO}>
        {inCorso ? "Salvataggio…" : nuovo ? "Crea il socio" : "Salva le modifiche"}
      </button>
    </form>
  );
}
