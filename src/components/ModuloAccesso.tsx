"use client";

import { useActionState } from "react";
import { accedi } from "@/app/azioni";

export default function ModuloAccesso() {
  const [stato, azione, inCorso] = useActionState(accedi, null);

  return (
    <form action={azione} className="space-y-4">
      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          defaultValue={stato?.valori?.email}
          className="w-full rounded-xl border-0 bg-white px-4 py-3 text-base ring-1 ring-slate-300 outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>

      <div>
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="w-full rounded-xl border-0 bg-white px-4 py-3 text-base ring-1 ring-slate-300 outline-none focus:ring-2 focus:ring-sky-500"
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
        {inCorso ? "Accesso in corso…" : "Accedi"}
      </button>

      <p className="pt-2 text-center text-sm text-slate-500">
        Le credenziali sono fornite dalla segreteria del circolo.
      </p>
    </form>
  );
}
