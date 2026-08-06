import Link from "next/link";
import { redirect } from "next/navigation";
import { socioCorrente } from "@/lib/auth";
import { leggiImpostazioni } from "@/lib/impostazioni";
import ModuloAccesso from "@/components/ModuloAccesso";

export const dynamic = "force-dynamic";

export default async function PaginaAccesso() {
  if (await socioCorrente()) redirect("/");

  const imp = await leggiImpostazioni();

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900">{imp.nomeCircolo}</h1>
        <p className="mt-1 text-slate-600">Prenotazione degli accessi in piscina</p>
      </div>

      <ModuloAccesso />

      <p className="mt-10 text-center text-sm text-slate-500">
        <Link href="/privacy" className="underline-offset-2 hover:underline">
          Informativa sulla privacy
        </Link>
      </p>
    </main>
  );
}
