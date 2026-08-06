import type { StatoForm } from "@/lib/form";

/** Mostra l'esito di un form: errore in rosso, conferma in verde. */
export default function Avviso({ stato }: { stato: StatoForm }) {
  if (!stato) return null;

  if (stato.errore) {
    return (
      <p
        role="alert"
        className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800 ring-1 ring-rose-200"
      >
        {stato.errore}
      </p>
    );
  }

  if (stato.successo) {
    return (
      <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800 ring-1 ring-emerald-200">
        {stato.successo}
      </p>
    );
  }

  return null;
}
