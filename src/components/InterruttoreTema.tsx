"use client";

import { useEffect, useState } from "react";

export const CHIAVE_TEMA = "tema";

/**
 * Interruttore chiaro/scuro.
 *
 * La classe sull'`<html>` è già stata messa dallo script in `layout.tsx` prima
 * che la pagina venga disegnata; qui la si legge per sapere da che parte siamo e
 * la si ribalta al clic, registrando la scelta in `localStorage`.
 *
 * Finché il componente non è montato l'icona resta quella chiara: il server non
 * può sapere quale tema ha scelto chi visita la pagina, e disegnarne una a caso
 * farebbe litigare l'HTML del server con quello del browser.
 */
export default function InterruttoreTema({ className = "" }: { className?: string }) {
  const [scuro, setScuro] = useState(false);
  const [montato, setMontato] = useState(false);

  useEffect(() => {
    setScuro(document.documentElement.classList.contains("dark"));
    setMontato(true);
  }, []);

  function cambia() {
    const prossimo = !scuro;
    document.documentElement.classList.toggle("dark", prossimo);
    setScuro(prossimo);

    // In incognito `localStorage` può lanciare: il tema resta valido per questa
    // visita, si perde solo la memoria della scelta.
    try {
      localStorage.setItem(CHIAVE_TEMA, prossimo ? "scuro" : "chiaro");
    } catch {}
  }

  const attivo = montato && scuro;

  return (
    <button
      type="button"
      onClick={cambia}
      role="switch"
      aria-checked={attivo}
      aria-label={attivo ? "Passa al tema chiaro" : "Passa al tema scuro"}
      title={attivo ? "Tema chiaro" : "Tema scuro"}
      className={`rounded-lg p-2 text-slate-600 ring-1 ring-slate-300 transition active:bg-slate-100 ${className}`}
    >
      {attivo ? <IconaSole /> : <IconaLuna />}
    </button>
  );
}

function IconaLuna() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M20 13.5A8.5 8.5 0 0 1 10.5 4a8.5 8.5 0 1 0 9.5 9.5Z" />
    </svg>
  );
}

function IconaSole() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
