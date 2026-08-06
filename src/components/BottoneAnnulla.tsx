"use client";

import { annullaPrenotazioneAction } from "@/app/azioni";

export default function BottoneAnnulla({
  prenotazioneId,
  giorno,
  variante = "secondario",
}: {
  prenotazioneId: string;
  giorno: string;
  variante?: "secondario" | "testo";
}) {
  const classi =
    variante === "testo"
      ? "text-sm font-medium text-rose-700 underline-offset-2 hover:underline"
      : "w-full rounded-xl px-4 py-3 text-sm font-semibold text-rose-700 ring-1 ring-rose-200 transition active:bg-rose-50";

  return (
    <form
      action={annullaPrenotazioneAction}
      onSubmit={(e) => {
        // Annullare libera i posti per gli altri soci: meglio una conferma esplicita.
        if (!window.confirm(`Vuoi annullare la prenotazione di ${giorno}?`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="prenotazioneId" value={prenotazioneId} />
      <button type="submit" className={classi}>
        Annulla prenotazione
      </button>
    </form>
  );
}
