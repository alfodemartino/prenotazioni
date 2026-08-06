"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import {
  chiudiSessione,
  creaSessione,
  richiediSocio,
  socioCorrente,
  verificaPassword,
} from "@/lib/auth";
import { annullaPrenotazione, salvaPrenotazione } from "@/lib/prenotazioni";
import { lunghezzaMinimaPerRuolo, validaPassword } from "@/lib/password";
import { errore, type StatoForm } from "@/lib/form";
import { azzeraFallimenti, bloccoAccesso, registraFallimento } from "@/lib/accessi";

function intero(fd: FormData, campo: string): number {
  const v = Number(fd.get(campo));
  return Number.isFinite(v) ? Math.trunc(v) : NaN;
}

export async function accedi(_prec: StatoForm, fd: FormData): Promise<StatoForm> {
  const email = String(fd.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(fd.get("password") ?? "");

  if (!email || !password) return errore("Inserisci email e password.", fd);

  // Il freno sui tentativi viene prima di toccare il database degli utenti:
  // chi è bloccato non deve nemmeno poter misurare i tempi di risposta.
  const blocco = await bloccoAccesso(email);
  if (blocco) return errore(blocco, fd);

  const socio = await prisma.socio.findUnique({ where: { email } });

  // Messaggio identico in entrambi i casi: non deve essere possibile capire
  // quali indirizzi sono registrati nel circolo.
  if (!socio || !(await verificaPassword(password, socio.passwordHash))) {
    await registraFallimento(email);
    return errore("Email o password non corretti.", fd);
  }

  if (socio.stato !== "ATTIVO") {
    return errore("Il tuo profilo è sospeso. Rivolgiti alla segreteria.", fd);
  }

  await azzeraFallimenti(email);
  await creaSessione(socio.id, socio.versioneSessione);
  redirect("/");
}

export async function esci(): Promise<void> {
  await chiudiSessione();
  redirect("/login");
}

export async function salvaPrenotazioneAction(
  _prec: StatoForm,
  fd: FormData,
): Promise<StatoForm> {
  const socio = await richiediSocio();
  const data = String(fd.get("data") ?? "");

  const gruppo = {
    adulti: intero(fd, "adulti"),
    bambini: intero(fd, "bambini"),
    ospitiAdulti: intero(fd, "ospitiAdulti"),
    ospitiBambini: intero(fd, "ospitiBambini"),
  };

  if (Object.values(gruppo).some(Number.isNaN)) {
    return errore("I numeri inseriti non sono validi.");
  }

  const esito = await salvaPrenotazione({ socio, data, gruppo });
  if (!esito.ok) return errore(esito.messaggio);

  revalidatePath("/");
  revalidatePath("/prenotazioni");
  redirect(`/?salvata=${data}`);
}

export async function annullaPrenotazioneAction(fd: FormData): Promise<void> {
  const socio = await richiediSocio();
  const prenotazioneId = String(fd.get("prenotazioneId") ?? "");

  await annullaPrenotazione({ socioId: socio.id, prenotazioneId });

  revalidatePath("/");
  revalidatePath("/prenotazioni");
  redirect("/?annullata=1");
}

/**
 * Cambio password del socio.
 *
 * Usa `socioCorrente` e non `richiediSocio`: quest'ultimo reindirizza proprio a
 * questa pagina quando la password è ancora quella della segreteria, e si
 * finirebbe in un ciclo.
 */
export async function cambiaPassword(_prec: StatoForm, fd: FormData): Promise<StatoForm> {
  const socio = await socioCorrente();
  if (!socio) redirect("/login");

  const attuale = String(fd.get("attuale") ?? "");
  const nuova = String(fd.get("nuova") ?? "");
  const conferma = String(fd.get("conferma") ?? "");

  if (!(await verificaPassword(attuale, socio.passwordHash))) {
    return errore("La password attuale non è corretta.");
  }

  const problema = validaPassword(nuova, {
    lunghezzaMinima: lunghezzaMinimaPerRuolo(socio.ruolo),
    contesto: socio,
  });
  if (problema) return errore(problema);

  if (nuova !== conferma) return errore("Le due nuove password non coincidono.");

  if (await verificaPassword(nuova, socio.passwordHash)) {
    return errore("La nuova password deve essere diversa da quella attuale.");
  }

  const aggiornato = await prisma.socio.update({
    where: { id: socio.id },
    data: {
      passwordHash: await bcrypt.hash(nuova, 10),
      deveCambiarePassword: false,
      // Chiude le sessioni aperte altrove con la vecchia password.
      versioneSessione: { increment: 1 },
    },
  });

  // Il cookie corrente è appena decaduto: se ne emette subito uno aggiornato,
  // altrimenti chi cambia la password verrebbe buttato fuori dalla sua stessa sessione.
  await creaSessione(aggiornato.id, aggiornato.versioneSessione);

  redirect("/");
}
