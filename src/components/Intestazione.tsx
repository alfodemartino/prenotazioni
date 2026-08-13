import Link from "next/link";
import { esci } from "@/app/azioni";
import InterruttoreTema from "./InterruttoreTema";

export default function Intestazione({
  nomeCircolo,
  nomeSocio,
}: {
  nomeCircolo: string;
  nomeSocio: string;
}) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200/70 bg-superficie/85 backdrop-blur">
      <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="min-w-0">
          <p className="truncate font-semibold text-slate-900">{nomeCircolo}</p>
          <p className="truncate text-xs text-slate-500">{nomeSocio}</p>
        </Link>

        <div className="flex shrink-0 items-center gap-2">
          <InterruttoreTema />
          <form action={esci}>
            <button
              type="submit"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-300 transition active:bg-slate-100"
            >
              Esci
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
