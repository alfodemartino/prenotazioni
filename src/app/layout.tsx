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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0284c7" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

/**
 * Decide il tema prima che il browser disegni qualcosa.
 *
 * Deve restare uno script bloccante nell'`<head>`: spostarlo in un componente
 * React significherebbe applicare la classe solo dopo l'idratazione, e chi ha
 * scelto il tema scuro vedrebbe un lampo bianco a ogni caricamento.
 */
const SCRIPT_TEMA = `
try {
  var scelta = localStorage.getItem("tema");
  var scuro = scelta ? scelta === "scuro" : matchMedia("(prefers-color-scheme: dark)").matches;
  if (scuro) document.documentElement.classList.add("dark");
} catch (e) {}
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // La classe sull'`<html>` la mette lo script qui sotto, quindi al momento
    // dell'idratazione non combacia con l'HTML arrivato dal server: è voluto.
    <html lang="it" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="font-sans text-slate-800 antialiased">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
