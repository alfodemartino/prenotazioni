import FormConfigurazioni from "@/components/admin/FormConfigurazioni";
import BannerEsito from "@/components/admin/BannerEsito";
import { leggiImpostazioni } from "@/lib/impostazioni";
import { centesimiInEuro } from "@/lib/validazioni";

export const dynamic = "force-dynamic";

export default async function PaginaConfigurazioni({
  searchParams,
}: {
  searchParams: Promise<{ salvato?: string }>;
}) {
  const [imp, sp] = await Promise.all([leggiImpostazioni(), searchParams]);

  return (
    <>
      <BannerEsito
        messaggio={
          sp.salvato
            ? "Configurazioni salvate. I nuovi valori valgono per le giornate non ancora personalizzate dal calendario."
            : null
        }
      />

      <h1 className="text-2xl font-bold text-slate-900">Configurazioni</h1>
      <p className="mt-1 mb-6 text-slate-600">
        Sono i valori generali del circolo. Le singole giornate possono derogare dal
        calendario: quello che imposti qui vale per tutte le altre.
      </p>

      <FormConfigurazioni
        valori={{
          nomeCircolo: imp.nomeCircolo,
          capienzaAdultiDefault: imp.capienzaAdultiDefault,
          overbookingPct: imp.overbookingPct,
          giorniFinestra: imp.giorniFinestra,
          oraAperturaDefault: imp.oraAperturaDefault,
          oraChiusuraDefault: imp.oraChiusuraDefault,
          tariffaOspiteAdulto: centesimiInEuro(imp.tariffaOspiteAdultoCent),
          tariffaOspiteBambino: centesimiInEuro(imp.tariffaOspiteBambinoCent),
          sogliaUltimiPosti: imp.sogliaUltimiPosti,
          maxPersonePerPrenotazione: imp.maxPersonePerPrenotazione,
        }}
      />
    </>
  );
}
