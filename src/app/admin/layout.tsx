import Link from "next/link";
import NavAdmin from "@/components/admin/NavAdmin";
import { richiediAdmin } from "@/lib/auth";
import { leggiImpostazioni } from "@/lib/impostazioni";
import { esci } from "@/app/azioni";

export const dynamic = "force-dynamic";

export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  const admin = await richiediAdmin();
  const imp = await leggiImpostazioni();

  return (
    <div className="min-h-dvh bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-slate-900">{imp.nomeCircolo}</p>
            <p className="truncate text-xs text-slate-500">
              Amministrazione · {admin.nome} {admin.cognome}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/"
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 ring-1 ring-slate-300 transition active:bg-slate-100"
            >
              Area soci
            </Link>
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

      <NavAdmin />

      <main className="mx-auto max-w-4xl px-4 py-6 pb-16">{children}</main>
    </div>
  );
}
