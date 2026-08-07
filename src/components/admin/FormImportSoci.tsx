"use client";

import { useActionState, useRef, useState, startTransition } from "react";
import Link from "next/link";
import { importaSoci, type Credenziale, type StatoImport } from "@/app/admin/azioni";
import { generaCsv } from "@/lib/report";
import { COLONNE, MAX_RIGHE } from "@/lib/importaSoci";
import { AIUTO, BOTTONE_PRIMARIO, BOTTONE_SECONDARIO, RIQUADRO } from "./stili";

/**
 * Il file resta in memoria qui, non nel form.
 *
 * React azzera i campi dopo un'azione, e un `<input type="file">` non è
 * ripopolabile da codice per ragioni di sicurezza del browser: senza tenerne
 * copia, alla conferma non ci sarebbe più niente da inviare e l'utente
 * dovrebbe riselezionare il file.
 */
export default function FormImportSoci() {
  const [stato, esegui, inCorso] = useActionState<StatoImport, FormData>(importaSoci, null);
  const [file, setFile] = useState<File | null>(null);
  const campoFile = useRef<HTMLInputElement>(null);

  /**
   * Nasconde l'esito precedente senza interrogare il server.
   *
   * `useActionState` conserva l'ultimo risultato finché non se ne produce un
   * altro: scegliendo un secondo file si vedrebbe ancora l'anteprima del primo.
   * Un'azione fittizia solo per azzerarlo costerebbe un viaggio di rete e
   * risponderebbe «Scegli un file» proprio mentre un file è appena stato scelto.
   */
  const [azzerato, setAzzerato] = useState(false);
  const risultato = azzerato ? null : stato;

  const invia = (conferma: boolean) => {
    if (!file) return;

    const fd = new FormData();
    fd.set("file", file);
    if (conferma) fd.set("conferma", "1");

    setAzzerato(false);
    startTransition(() => esegui(fd));
  };

  const scegli = (nuovo: File | null) => {
    setFile(nuovo);
    setAzzerato(true);
  };

  const ricomincia = () => {
    setFile(null);
    if (campoFile.current) campoFile.current.value = "";
    setAzzerato(true);
  };

  if (risultato?.credenziali) {
    return <Riepilogo credenziali={risultato.credenziali} onRicomincia={ricomincia} />;
  }

  const anteprima = risultato?.daImportare;

  return (
    <div className="space-y-5">
      <section className={RIQUADRO}>
        <h2 className="text-lg font-semibold text-slate-900">1. Prepara il file</h2>
        <p className={AIUTO}>
          Scarica il modello, compilalo con un foglio di calcolo e salvalo in formato CSV. La riga
          di esempio marcata <code className="rounded bg-slate-100 px-1">ESEMPIO</code> viene
          ignorata: puoi lasciarla o cancellarla.
        </p>

        <Link
          href="/admin/soci/importa/template"
          prefetch={false}
          className={`${BOTTONE_SECONDARIO} mt-3 inline-block`}
        >
          Scarica il template CSV
        </Link>

        <dl className="mt-4 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
          {COLONNE.map((c) => (
            <div key={c.chiave} className="flex justify-between gap-2 border-b border-slate-100 py-1">
              <dt className="font-medium text-slate-700">{c.intestazione}</dt>
              <dd className="text-slate-500">{c.obbligatoria ? "obbligatoria" : "facoltativa"}</dd>
            </div>
          ))}
        </dl>
        <p className={AIUTO}>
          Le date si scrivono come <strong>31/12/2026</strong>. Massimo {MAX_RIGHE} soci per file.
        </p>
      </section>

      <section className={RIQUADRO}>
        <h2 className="text-lg font-semibold text-slate-900">2. Carica e controlla</h2>

        <input
          ref={campoFile}
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => scegli(e.target.files?.[0] ?? null)}
          className="mt-3 block w-full text-sm text-slate-700 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-100 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-slate-700"
        />

        {risultato?.errore && (
          <p className="mt-3 rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
            {risultato.errore}
          </p>
        )}

        <button
          type="button"
          onClick={() => invia(false)}
          disabled={!file || inCorso}
          className={`${BOTTONE_SECONDARIO} mt-3`}
        >
          {inCorso ? "Controllo in corso…" : "Controlla il file"}
        </button>
      </section>

      {anteprima && (
        <section className={RIQUADRO}>
          <h2 className="text-lg font-semibold text-slate-900">3. Conferma</h2>

          <div className="mt-3 flex flex-wrap gap-2 text-sm font-semibold">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">
              {anteprima.length} da creare
            </span>
            {risultato.problemi && risultato.problemi.length > 0 && (
              <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-800">
                {risultato.problemi.length} da correggere
              </span>
            )}
          </div>

          {risultato.problemi && risultato.problemi.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-700">Righe che verranno saltate</h3>
              <ul className="mt-2 space-y-1 text-sm">
                {risultato.problemi.map((p) => (
                  <li key={p.riga} className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
                    <strong>Riga {p.riga}</strong> · {p.riferimento} — {p.descrizione}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {anteprima.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-slate-700">Soci che verranno creati</h3>
              <ul className="mt-2 max-h-72 divide-y divide-slate-100 overflow-y-auto rounded-xl ring-1 ring-slate-200">
                {anteprima.map((r) => (
                  <li key={r.riga} className="flex justify-between gap-3 px-3 py-2 text-sm">
                    <span className="font-medium text-slate-800">
                      {r.cognome} {r.nome}
                    </span>
                    <span className="text-slate-500">
                      {r.numeroTessera} · {r.email}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => invia(true)}
              disabled={inCorso || anteprima.length === 0}
              className={BOTTONE_PRIMARIO}
            >
              {inCorso ? "Creazione in corso…" : `Crea ${anteprima.length} soci`}
            </button>
            <button type="button" onClick={ricomincia} className={BOTTONE_SECONDARIO}>
              Annulla
            </button>
          </div>
          <p className={AIUTO}>
            Finché non premi «Crea», non viene registrato nessun socio.
          </p>
        </section>
      )}
    </div>
  );
}

/** Esito finale: le password esistono solo qui, vanno scaricate ora. */
function Riepilogo({
  credenziali,
  onRicomincia,
}: {
  credenziali: Credenziale[];
  onRicomincia: () => void;
}) {
  const scarica = () => {
    const csv = generaCsv([
      ["Numero tessera", "Nome", "Cognome", "Email", "Password iniziale"],
      ...credenziali.map((c) => [c.numeroTessera, c.nome, c.cognome, c.email, c.password]),
    ]);

    // Il file si costruisce nel browser: le password in chiaro non vengono
    // riscritte sul server né lasciate in un URL che finirebbe nella cronologia.
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "credenziali_soci.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={RIQUADRO}>
      <h2 className="text-lg font-semibold text-slate-900">
        {credenziali.length} soci creati
      </h2>
      <p className="mt-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <strong>Scarica adesso le credenziali.</strong> Le password sono mostrate una sola volta:
        chiudendo questa pagina non sono più recuperabili e andrebbero reimpostate una a una. Ogni
        socio dovrà cambiarla al primo accesso.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" onClick={scarica} className={BOTTONE_PRIMARIO}>
          Scarica le credenziali
        </button>
        <Link href="/admin/soci" className={BOTTONE_SECONDARIO}>
          Vai all'elenco soci
        </Link>
        <button type="button" onClick={onRicomincia} className={BOTTONE_SECONDARIO}>
          Importa un altro file
        </button>
      </div>

      <ul className="mt-4 max-h-96 divide-y divide-slate-100 overflow-y-auto rounded-xl ring-1 ring-slate-200">
        {credenziali.map((c) => (
          <li key={c.email} className="px-3 py-2 text-sm">
            <div className="font-medium text-slate-800">
              {c.cognome} {c.nome} · {c.numeroTessera}
            </div>
            <div className="text-slate-500">{c.email}</div>
            <code className="mt-1 inline-block rounded bg-slate-100 px-2 py-0.5 text-slate-800">
              {c.password}
            </code>
          </li>
        ))}
      </ul>
    </div>
  );
}
