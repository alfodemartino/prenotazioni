import { redirect } from "next/navigation";
import ModuloCambioPassword from "@/components/ModuloCambioPassword";
import { socioCorrente } from "@/lib/auth";
import { leggiImpostazioni } from "@/lib/impostazioni";
import { lunghezzaMinimaPerRuolo } from "@/lib/password";

export const dynamic = "force-dynamic";

export default async function PaginaCambioPassword() {
  const socio = await socioCorrente();
  if (!socio) redirect("/login");

  const imp = await leggiImpostazioni();

  return (
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-5 py-10">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900">{imp.nomeCircolo}</h1>
        <p className="mt-2 text-slate-600">
          {socio.deveCambiarePassword
            ? "Prima di iniziare, scegli una password tua al posto di quella consegnata dalla segreteria."
            : "Cambia la tua password."}
        </p>
      </div>

      <ModuloCambioPassword
        lunghezzaMinima={lunghezzaMinimaPerRuolo(socio.ruolo)}
        contesto={{
          nome: socio.nome,
          cognome: socio.cognome,
          email: socio.email,
          numeroTessera: socio.numeroTessera,
        }}
      />
    </main>
  );
}
