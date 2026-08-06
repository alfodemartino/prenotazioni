/**
 * Conferma di un'operazione andata a buon fine, letta dall'indirizzo.
 *
 * Le azioni che salvano chiamano `revalidatePath` e ricaricano la pagina: uno
 * stato tenuto nel form verrebbe azzerato proprio nel momento in cui va mostrato.
 * Passando dal parametro nell'URL la conferma sopravvive al ricaricamento.
 */
export default function BannerEsito({ messaggio }: { messaggio: string | null }) {
  if (!messaggio) return null;

  return (
    <p className="mb-5 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 ring-1 ring-emerald-200">
      {messaggio}
    </p>
  );
}
