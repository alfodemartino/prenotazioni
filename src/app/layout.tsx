import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Prenotazioni Piscina",
  description: "Prenota il tuo accesso giornaliero alla piscina del circolo.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0284c7",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body className="font-sans text-slate-800 antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
