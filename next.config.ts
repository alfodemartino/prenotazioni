import type { NextConfig } from "next";

/**
 * Intestazioni di sicurezza applicate a tutte le pagine.
 * Contano solo una volta che l'app è raggiungibile da internet, ma è meglio
 * averle attive fin da subito che ricordarsene il giorno della pubblicazione.
 */
const INTESTAZIONI_SICUREZZA = [
  // Impedisce di incorniciare l'app in un altro sito per indurre clic ingannevoli.
  { key: "X-Frame-Options", value: "DENY" },
  // Vieta al browser di indovinare il tipo di un file ignorando quello dichiarato.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Non rivela ai siti esterni l'indirizzo completo da cui si arriva.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // L'app non usa nulla di tutto questo: meglio negarlo esplicitamente.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  experimental: {
    // Le prenotazioni sono sempre dati vivi: nessuna cache implicita.
    staleTimes: { dynamic: 0, static: 0 },
  },

  async headers() {
    return [{ source: "/:path*", headers: INTESTAZIONI_SICUREZZA }];
  },
};

export default nextConfig;
