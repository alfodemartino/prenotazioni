import Link from "next/link";
import FormSocio, { SOCIO_VUOTO } from "@/components/admin/FormSocio";
import { generaPasswordLeggibile } from "@/lib/password";

export const dynamic = "force-dynamic";

export default function PaginaNuovoSocio() {
  // Una proposta diversa a ogni apertura della pagina.
  const passwordSuggerita = generaPasswordLeggibile();

  return (
    <>
      <Link
        href="/admin/soci"
        className="mb-5 inline-block text-sm font-medium text-sky-700 underline-offset-2 hover:underline"
      >
        ← Torna ai soci
      </Link>

      <h1 className="text-2xl font-bold text-slate-900">Nuovo socio</h1>
      <p className="mt-1 mb-6 text-slate-600">
        Il profilo viene creato già attivo. Consegna al socio email e password iniziale: al
        primo accesso gli verrà chiesto di sceglierne una propria.
      </p>

      <FormSocio
        modalita="nuovo"
        valori={SOCIO_VUOTO}
        passwordSuggerita={passwordSuggerita}
      />
    </>
  );
}
