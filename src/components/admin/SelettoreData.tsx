"use client";

import { useRouter } from "next/navigation";
import { INPUT } from "./stili";

/** Campo data che ricarica la pagina sulla giornata scelta. */
export default function SelettoreData({ data, base }: { data: string; base: string }) {
  const router = useRouter();

  return (
    <input
      type="date"
      value={data}
      onChange={(e) => {
        if (e.target.value) router.push(`${base}?data=${e.target.value}`);
      }}
      aria-label="Giornata da visualizzare"
      className={`${INPUT} max-w-44`}
    />
  );
}
