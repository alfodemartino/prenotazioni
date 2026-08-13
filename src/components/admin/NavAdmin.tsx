"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const VOCI = [
  { href: "/admin", etichetta: "Registro" },
  { href: "/admin/calendario", etichetta: "Calendario" },
  { href: "/admin/soci", etichetta: "Soci" },
  { href: "/admin/report", etichetta: "Report" },
  { href: "/admin/configurazioni", etichetta: "Configurazioni" },
];

export default function NavAdmin() {
  const percorso = usePathname();

  return (
    <nav className="border-b border-slate-200 bg-superficie">
      <div className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-4">
        {VOCI.map((v) => {
          // "/admin" corrisponde solo a sé stesso, le altre voci anche alle sottopagine.
          const attiva = v.href === "/admin" ? percorso === v.href : percorso.startsWith(v.href);

          return (
            <Link
              key={v.href}
              href={v.href}
              aria-current={attiva ? "page" : undefined}
              className={`shrink-0 border-b-2 px-3 py-3 text-sm font-medium transition ${
                attiva
                  ? "border-sky-600 text-sky-700"
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {v.etichetta}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
