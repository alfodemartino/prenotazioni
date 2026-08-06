"use client";

import { useState } from "react";
import {
  annullaCheckIn,
  annullaPrenotazioneAdmin,
  registraCheckIn,
} from "@/app/admin/azioni";
import { descriviGruppo } from "@/lib/ui";
import { BOTTONE_PERICOLO, BOTTONE_PRIMARIO, BOTTONE_SECONDARIO } from "./stili";

interface Prenotazione {
  id: string;
  adulti: number;
  bambini: number;
  ospitiAdulti: number;
  ospitiBambini: number;
  checkInIl: Date | null;
  adultiEffettivi: number | null;
  bambiniEffettivi: number | null;
  ospitiEffettivi: number | null;
}

interface Socio {
  nome: string;
  cognome: string;
  numeroTessera: string;
}

function ora(d: Date): string {
  return new Date(d).toLocaleTimeString("it-IT", {
    timeZone: "Europe/Rome",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function RigaPresenza({
  prenotazione: p,
  socio,
  checkInPossibile,
}: {
  prenotazione: Prenotazione;
  socio: Socio;
  /** Falso sulle giornate future: non si può attestare un ingresso non avvenuto. */
  checkInPossibile: boolean;
}) {
  const [correggi, setCorreggi] = useState(false);

  const ospitiDichiarati = p.ospitiAdulti + p.ospitiBambini;
  const presente = Boolean(p.checkInIl);

  const effettivi = {
    adulti: p.adultiEffettivi ?? p.adulti,
    bambini: p.bambiniEffettivi ?? p.bambini,
    ospiti: p.ospitiEffettivi ?? ospitiDichiarati,
  };

  const diverso =
    presente &&
    (effettivi.adulti !== p.adulti ||
      effettivi.bambini !== p.bambini ||
      effettivi.ospiti !== ospitiDichiarati);

  return (
    <li className={`p-4 ${presente ? "bg-emerald-50/40" : ""}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-slate-900">
            {socio.cognome} {socio.nome}
            <span className="ml-2 text-sm font-normal text-slate-500">
              tessera {socio.numeroTessera}
            </span>
          </p>
          <p className="mt-0.5 text-sm text-slate-600">
            {descriviGruppo({
              adulti: p.adulti,
              bambini: p.bambini,
              ospitiAdulti: p.ospitiAdulti,
              ospitiBambini: p.ospitiBambini,
            })}
          </p>

          {presente && (
            <p className="mt-1 text-sm font-medium text-emerald-700">
              Presente dalle {ora(p.checkInIl!)}
              {diverso && (
                <span className="font-normal text-slate-600">
                  {" "}
                  · entrati: {effettivi.adulti} adulti, {effettivi.bambini} bambini,{" "}
                  {effettivi.ospiti} ospiti
                </span>
              )}
            </p>
          )}

          {presente && !checkInPossibile && (
            <p className="mt-1 text-sm font-medium text-amber-700">
              Presenza registrata su una giornata non ancora arrivata: va annullata.
            </p>
          )}

          {!presente && !checkInPossibile && (
            <p className="mt-1 text-sm text-slate-500">
              Il check-in si registra il giorno stesso.
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {presente ? (
            <>
              {checkInPossibile && (
                <button
                  type="button"
                  onClick={() => setCorreggi((c) => !c)}
                  className={BOTTONE_SECONDARIO}
                >
                  {correggi ? "Chiudi" : "Correggi"}
                </button>
              )}
              <form action={annullaCheckIn}>
                <input type="hidden" name="prenotazioneId" value={p.id} />
                <button type="submit" className={BOTTONE_SECONDARIO}>
                  Annulla ingresso
                </button>
              </form>
            </>
          ) : (
            <>
              {checkInPossibile && (
                <>
                  <button
                    type="button"
                    onClick={() => setCorreggi((c) => !c)}
                    className={BOTTONE_SECONDARIO}
                  >
                    {correggi ? "Chiudi" : "Correggi"}
                  </button>
                  <form action={registraCheckIn}>
                    <input type="hidden" name="prenotazioneId" value={p.id} />
                    <button type="submit" className={BOTTONE_PRIMARIO}>
                      Segna presente
                    </button>
                  </form>
                </>
              )}
              <form
                action={annullaPrenotazioneAdmin}
                onSubmit={(e) => {
                  if (!window.confirm(`Annullare la prenotazione di ${socio.cognome}?`)) {
                    e.preventDefault();
                  }
                }}
              >
                <input type="hidden" name="prenotazioneId" value={p.id} />
                <button type="submit" className={BOTTONE_PERICOLO}>
                  Annulla
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {correggi && checkInPossibile && (
        <form
          action={registraCheckIn}
          className="mt-3 rounded-xl bg-white p-3 ring-1 ring-slate-200"
        >
          <input type="hidden" name="prenotazioneId" value={p.id} />
          <p className="mb-2 text-sm text-slate-600">
            Numeri effettivamente entrati, se diversi da quelli prenotati.
          </p>

          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["adultiEffettivi", "Adulti", effettivi.adulti],
                ["bambiniEffettivi", "Bambini", effettivi.bambini],
                ["ospitiEffettivi", "Ospiti", effettivi.ospiti],
              ] as const
            ).map(([nome, etichetta, valore]) => (
              <label key={nome} className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">
                  {etichetta}
                </span>
                <input
                  type="number"
                  name={nome}
                  min={0}
                  defaultValue={valore}
                  className="w-full rounded-lg border-0 px-3 py-2 text-base ring-1 ring-slate-300 outline-none focus:ring-2 focus:ring-sky-500"
                />
              </label>
            ))}
          </div>

          <button type="submit" className={`${BOTTONE_PRIMARIO} mt-3`}>
            {presente ? "Salva correzione" : "Registra ingresso"}
          </button>
        </form>
      )}
    </li>
  );
}
