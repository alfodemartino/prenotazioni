import { socioCorrente } from "@/lib/auth";
import { generaCsv } from "@/lib/report";
import { righeTemplate } from "@/lib/importaSoci";

export const dynamic = "force-dynamic";

export async function GET() {
  // Le route handler stanno fuori dal layout di /admin, quindi non ereditano la
  // sua protezione: va rifatta qui. `richiediAdmin` non va bene perché
  // reindirizza, e un reindirizzamento dentro un download è inservibile.
  const socio = await socioCorrente();
  if (!socio || socio.ruolo !== "ADMIN") {
    return new Response("Accesso riservato all'amministrazione.", { status: 403 });
  }

  return new Response(generaCsv(righeTemplate()), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="template_soci.csv"',
      "Cache-Control": "no-store",
    },
  });
}
