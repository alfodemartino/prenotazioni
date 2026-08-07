import Link from "next/link";
import FormImportSoci from "@/components/admin/FormImportSoci";

export const dynamic = "force-dynamic";

export default function PaginaImportSoci() {
  return (
    <>
      <Link href="/admin/soci" className="text-sm font-medium text-sky-700">
        ← Torna all&apos;elenco soci
      </Link>

      <h1 className="mt-3 mb-1 text-2xl font-bold text-slate-900">Importa soci da CSV</h1>
      <p className="mb-5 text-slate-600">
        Per caricare più tesserati in una volta sola. I soci vengono solo aggiunti: le anagrafiche
        già presenti non vengono mai modificate.
      </p>

      <FormImportSoci />
    </>
  );
}
