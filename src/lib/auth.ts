/**
 * Autenticazione a sessione.
 *
 * Gli account sono creati dalla segreteria, quindi non serve registrazione né
 * recupero password via email: bastano un cookie di sessione firmato e il
 * cambio password al primo accesso.
 */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import type { Socio } from "@prisma/client";
import { prisma } from "./db";

const NOME_COOKIE = "sessione";
const DURATA_GIORNI = 30;

function segreto(): Uint8Array {
  // In produzione il segreto firma i cookie di un'app raggiungibile da internet:
  // se fosse indovinabile, chiunque potrebbe fabbricarsi una sessione da admin.
  const minimo = process.env.NODE_ENV === "production" ? 32 : 16;
  const s = process.env.SESSION_SECRET;

  if (!s || s.length < minimo) {
    throw new Error(
      `SESSION_SECRET mancante o più corto di ${minimo} caratteri. ` +
        'Generane uno con: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }

  return new TextEncoder().encode(s);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verificaPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Apre una sessione. La `versioneSessione` finisce dentro il token: al cambio
 * password il numero avanza e i cookie emessi prima smettono di valere, così
 * reimpostare la password di un account compromesso chiude davvero le sessioni
 * aperte altrove.
 */
export async function creaSessione(socioId: string, versioneSessione: number): Promise<void> {
  const token = await new SignJWT({ sub: socioId, v: versioneSessione })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DURATA_GIORNI}d`)
    .sign(segreto());

  const store = await cookies();
  store.set(NOME_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURATA_GIORNI * 24 * 60 * 60,
  });
}

export async function chiudiSessione(): Promise<void> {
  const store = await cookies();
  store.delete(NOME_COOKIE);
}

/** Socio della sessione corrente, oppure null. Non lancia mai. */
export async function socioCorrente(): Promise<Socio | null> {
  const store = await cookies();
  const token = store.get(NOME_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, segreto());

    const id = typeof payload.sub === "string" ? payload.sub : null;
    const versione = typeof payload.v === "number" ? payload.v : null;
    if (!id || versione === null) return null;

    const socio = await prisma.socio.findUnique({ where: { id } });

    // Un socio cancellato o sospeso non deve restare autenticato.
    if (!socio || socio.stato !== "ATTIVO") return null;

    // Password cambiata dopo l'emissione del cookie: la sessione è decaduta.
    if (socio.versioneSessione !== versione) return null;

    return socio;
  } catch {
    return null; // token scaduto o manomesso
  }
}

/**
 * Come socioCorrente, ma reindirizza al login se non autenticato e al cambio
 * password se le credenziali sono ancora quelle assegnate dalla segreteria.
 */
export async function richiediSocio(): Promise<Socio> {
  const socio = await socioCorrente();
  if (!socio) redirect("/login");
  if (socio.deveCambiarePassword) redirect("/cambia-password");
  return socio;
}

export async function richiediAdmin(): Promise<Socio> {
  const socio = await richiediSocio();
  if (socio.ruolo !== "ADMIN") redirect("/");
  return socio;
}
