import Link from "next/link";
import { elencoSoci } from "@/lib/admin";
import { BOTTONE_PRIMARIO } from "@/components/admin/stili";
import SearchableSociList from "@/components/admin/SearchableSociList";

export const dynamic = "force-dynamic";

export default async function PaginaSoci({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { soci, totale, oggi } = await elencoSoci(q);

  return (
    <>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Soci</h1>
          <p className="mt-1 text-slate-600">
            {totale} {totale === 1 ? "profilo registrato" : "profili registrati"}
          </p>
        </div>
        <Link href="/admin/soci/nuovo" className={BOTTONE_PRIMARIO}>
          Nuovo socio
        </Link>
      </div>

      <div className="mb-5">
        <SearchableSociList soci={soci} totale={totale} oggi={oggi} queryIniziale={q} />
      </div>
    </>
  );
}
