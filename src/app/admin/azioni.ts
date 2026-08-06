"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { creaSessione, richiediAdmin } from "@/lib/auth";
import { aggiornaImpostazioni, leggiImpostazioni } from "@/lib/impostazioni";
import { annullaPrenotazione, salvaPrenotazione } from "@/lib/prenotazioni";
import { addGiorni, differenzaGiorni, isDataISO, oggiISO } from "@/lib/date";
import { checkInConsentito } from "@/lib/report";
import {
  booleano,
  errore,
  intero,
  interoOppure,
  successo,
  testo,
  testoOpzionale,
  type StatoForm,
} from "@/lib/form";
import {
  euroInCentesimi,
  normalizzaEmail,
  validaConfigGiornata,
  validaImpostazioni,
  validaIntervallo,
  validaSocio,
} from "@/lib/validazioni";
import { lunghezzaMinimaPerRuolo, validaPassword } from "@/lib/password";

/** Le pagine da rinfrescare dopo una modifica che tocca la disponibilità. */
function rinfrescaTutto() {
  revalidatePath("/");
  revalidatePath("/prenotazioni");
  revalidatePath("/admin");
  revalidatePath("/admin/calendario");
  revalidatePath("/admin/report");
}

// ---------------------------------------------------------------------------
// Configurazioni
// ---------------------------------------------------------------------------

export async function salvaConfigurazioni(_prec: StatoForm, fd: FormData): Promise<StatoForm> {
  await richiediAdmin();

  const tariffaAdulto = euroInCentesimi(testo(fd, "tariffaOspiteAdulto"));
  const tariffaBambino = euroInCentesimi(testo(fd, "tariffaOspiteBambino"));

  if (Number.isNaN(tariffaAdulto) || Number.isNaN(tariffaBambino)) {
    return errore("Le tariffe devono essere importi in euro, ad esempio 10,00.", fd);
  }

  const dati = {
    nomeCircolo: testo(fd, "nomeCircolo"),
    capienzaAdultiDefault: intero(fd, "capienzaAdultiDefault"),
    overbookingPct: intero(fd, "overbookingPct"),
    giorniFinestra: intero(fd, "giorniFinestra"),
    oraAperturaDefault: testo(fd, "oraAperturaDefault"),
    oraChiusuraDefault: testo(fd, "oraChiusuraDefault"),
    tariffaOspiteAdultoCent: tariffaAdulto,
    tariffaOspiteBambinoCent: tariffaBambino,
    sogliaUltimiPosti: intero(fd, "sogliaUltimiPosti"),
    maxPersonePerPrenotazione: intero(fd, "maxPersonePerPrenotazione"),
    controlloCertificato: booleano(fd, "controlloCertificato"),
  };

  const problema = validaImpostazioni({
    nomeCircolo: dati.nomeCircolo,
    capienzaAdulti: dati.capienzaAdultiDefault,
    overbookingPct: dati.overbookingPct,
    oraApertura: dati.oraAperturaDefault,
    oraChiusura: dati.oraChiusuraDefault,
    giorniFinestra: dati.giorniFinestra,
    tariffaOspiteAdultoCent: dati.tariffaOspiteAdultoCent,
    tariffaOspiteBambinoCent: dati.tariffaOspiteBambinoCent,
    sogliaUltimiPosti: dati.sogliaUltimiPosti,
    maxPersonePerPrenotazione: dati.maxPersonePerPrenotazione,
  });
  if (problema) return errore(problema, fd);

  await aggiornaImpostazioni(dati);
  rinfrescaTutto();
  revalidatePath("/admin/configurazioni");

  // La conferma passa dall'indirizzo e non dallo stato del form: `revalidatePath`
  // ricarica la pagina e lo stato di `useActionState` andrebbe perso, lasciando
  // l'impressione che il salvataggio non sia avvenuto.
  redirect("/admin/configurazioni?salvato=1");
}

// ---------------------------------------------------------------------------
// Calendario
// ---------------------------------------------------------------------------

export async function salvaGiornata(_prec: StatoForm, fd: FormData): Promise<StatoForm> {
  await richiediAdmin();

  const data = testo(fd, "data");
  if (!isDataISO(data)) return errore("Data non valida.", fd);

  const imp = await leggiImpostazioni();

  const config = {
    capienzaAdulti: interoOppure(fd, "capienzaAdulti", imp.capienzaAdultiDefault),
    overbookingPct: interoOppure(fd, "overbookingPct", imp.overbookingPct),
    oraApertura: testo(fd, "oraApertura") || imp.oraAperturaDefault,
    oraChiusura: testo(fd, "oraChiusura") || imp.oraChiusuraDefault,
  };

  const problema = validaConfigGiornata(config);
  if (problema) return errore(problema, fd);

  const aperta = booleano(fd, "aperta");
  const nota = testoOpzionale(fd, "nota");

  await prisma.giornata.upsert({
    where: { data },
    update: { ...config, aperta, nota },
    create: { data, ...config, aperta, nota },
  });

  rinfrescaTutto();
  revalidatePath(`/admin/calendario/${data}`);

  redirect(`/admin/calendario/${data}?salvato=${aperta ? "aperta" : "chiusa"}`);
}

/**
 * Chiude (o riapre) un intervallo di date in un colpo solo: serve per
 * manutenzioni e chiusure stagionali.
 *
 * Le prenotazioni già accettate NON vengono annullate: chiudere la giornata
 * impedisce nuove prenotazioni, ma cancellare d'ufficio i gruppi già confermati
 * è una decisione che deve restare esplicita.
 */
export async function chiudiIntervallo(_prec: StatoForm, fd: FormData): Promise<StatoForm> {
  await richiediAdmin();

  const da = testo(fd, "da");
  const a = testo(fd, "a");

  const problema = validaIntervallo(da, a);
  if (problema) return errore(problema, fd);

  const giorni = differenzaGiorni(da, a) + 1;
  if (giorni > 366) return errore("L'intervallo non può superare un anno.", fd);

  const aperta = testo(fd, "operazione") === "riapri";
  const nota = testoOpzionale(fd, "nota");
  const imp = await leggiImpostazioni();

  for (let i = 0; i < giorni; i++) {
    const data = addGiorni(da, i);
    await prisma.giornata.upsert({
      where: { data },
      update: { aperta, ...(nota !== null ? { nota } : {}) },
      create: {
        data,
        aperta,
        nota,
        capienzaAdulti: imp.capienzaAdultiDefault,
        overbookingPct: imp.overbookingPct,
        oraApertura: imp.oraAperturaDefault,
        oraChiusura: imp.oraChiusuraDefault,
      },
    });
  }

  rinfrescaTutto();

  redirect(
    `/admin/calendario?da=${da}&applicate=${giorni}&operazione=${aperta ? "riapri" : "chiudi"}`,
  );
}

// ---------------------------------------------------------------------------
// Registro presenze
// ---------------------------------------------------------------------------

export async function registraCheckIn(fd: FormData): Promise<void> {
  await richiediAdmin();

  const id = testo(fd, "prenotazioneId");
  const prenotazione = await prisma.prenotazione.findUnique({ where: { id } });
  if (!prenotazione || prenotazione.stato !== "ATTIVA") return;

  // Non si può attestare un ingresso che non è ancora avvenuto. L'interfaccia
  // nasconde già il pulsante per le giornate future: questo è il controllo che
  // conta, perché una richiesta può sempre arrivare per altre strade.
  if (!checkInConsentito(prenotazione.data, oggiISO())) return;

  // I campi corretti dalla reception sono opzionali: se lasciati vuoti si assume
  // che sia arrivato esattamente il gruppo dichiarato.
  await prisma.prenotazione.update({
    where: { id },
    data: {
      checkInIl: prenotazione.checkInIl ?? new Date(),
      adultiEffettivi: interoOppure(fd, "adultiEffettivi", prenotazione.adulti),
      bambiniEffettivi: interoOppure(fd, "bambiniEffettivi", prenotazione.bambini),
      ospitiEffettivi: interoOppure(
        fd,
        "ospitiEffettivi",
        prenotazione.ospitiAdulti + prenotazione.ospitiBambini,
      ),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/report");
}

export async function annullaCheckIn(fd: FormData): Promise<void> {
  await richiediAdmin();

  await prisma.prenotazione.update({
    where: { id: testo(fd, "prenotazioneId") },
    data: {
      checkInIl: null,
      adultiEffettivi: null,
      bambiniEffettivi: null,
      ospitiEffettivi: null,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/admin/report");
}

export async function annullaPrenotazioneAdmin(fd: FormData): Promise<void> {
  const admin = await richiediAdmin();

  await annullaPrenotazione({
    socioId: admin.id,
    prenotazioneId: testo(fd, "prenotazioneId"),
    comeAdmin: true,
  });

  rinfrescaTutto();
}

export async function prenotaPerSocio(_prec: StatoForm, fd: FormData): Promise<StatoForm> {
  await richiediAdmin();

  const socio = await prisma.socio.findUnique({ where: { id: testo(fd, "socioId") } });
  if (!socio) return errore("Socio non trovato.", fd);

  const gruppo = {
    adulti: interoOppure(fd, "adulti", 1),
    bambini: interoOppure(fd, "bambini", 0),
    ospitiAdulti: interoOppure(fd, "ospitiAdulti", 0),
    ospitiBambini: interoOppure(fd, "ospitiBambini", 0),
  };

  const esito = await salvaPrenotazione({ socio, data: testo(fd, "data"), gruppo });
  if (!esito.ok) return errore(esito.messaggio, fd);

  rinfrescaTutto();
  return successo(`Prenotazione registrata per ${socio.cognome} ${socio.nome}.`);
}

// ---------------------------------------------------------------------------
// Soci
// ---------------------------------------------------------------------------

function leggiAnagrafica(fd: FormData) {
  return {
    nome: testo(fd, "nome"),
    cognome: testo(fd, "cognome"),
    email: normalizzaEmail(testo(fd, "email")),
    numeroTessera: testo(fd, "numeroTessera"),
    telefono: testoOpzionale(fd, "telefono"),
    note: testoOpzionale(fd, "note"),
    scadenzaTessera: testoOpzionale(fd, "scadenzaTessera"),
    scadenzaCertificato: testoOpzionale(fd, "scadenzaCertificato"),
  };
}

export async function creaSocio(_prec: StatoForm, fd: FormData): Promise<StatoForm> {
  await richiediAdmin();

  const anagrafica = leggiAnagrafica(fd);
  const password = String(fd.get("password") ?? "");
  const ruolo = testo(fd, "ruolo") === "ADMIN" ? "ADMIN" : "SOCIO";

  const problema =
    validaSocio(anagrafica) ??
    validaPassword(password, {
      lunghezzaMinima: lunghezzaMinimaPerRuolo(ruolo),
      contesto: anagrafica,
    });
  if (problema) return errore(problema, fd);

  let nuovoId: string;

  try {
    const socio = await prisma.socio.create({
      data: {
        ...anagrafica,
        ruolo,
        stato: "ATTIVO",
        passwordHash: await bcrypt.hash(password, 10),
        // La password è stata scelta dalla segreteria: il socio dovrà cambiarla.
        deveCambiarePassword: true,
      },
    });
    nuovoId = socio.id;
  } catch (e) {
    return errore(messaggioDuplicato(e) ?? "Non è stato possibile creare il socio.", fd);
  }

  // Fuori dal try: `redirect` funziona lanciando un'eccezione, che un catch
  // intercetterebbe trasformando un successo in un errore.
  revalidatePath("/admin/soci");
  redirect(`/admin/soci/${nuovoId}?creato=1`);
}

export async function aggiornaSocio(_prec: StatoForm, fd: FormData): Promise<StatoForm> {
  const admin = await richiediAdmin();

  const id = testo(fd, "id");
  const anagrafica = leggiAnagrafica(fd);

  const problema = validaSocio(anagrafica);
  if (problema) return errore(problema, fd);

  const richiesto = testo(fd, "ruolo") === "ADMIN" ? "ADMIN" : "SOCIO";
  // Togliersi da soli il ruolo di amministratore significherebbe perdere l'accesso
  // al pannello mentre ci si sta lavorando: il proprio ruolo resta com'è.
  const ruolo = id === admin.id ? admin.ruolo : richiesto;

  try {
    await prisma.socio.update({
      data: { ...anagrafica, ruolo },
      where: { id },
    });
  } catch (e) {
    return errore(messaggioDuplicato(e) ?? "Non è stato possibile salvare le modifiche.", fd);
  }

  revalidatePath("/admin/soci");
  revalidatePath(`/admin/soci/${id}`);

  redirect(`/admin/soci/${id}?salvato=1`);
}

export async function cambiaStatoSocio(fd: FormData): Promise<void> {
  const admin = await richiediAdmin();
  const id = testo(fd, "id");

  // Sospendere il proprio account chiuderebbe fuori l'unico amministratore collegato.
  if (id === admin.id) return;

  const socio = await prisma.socio.findUnique({ where: { id } });
  if (!socio) return;

  await prisma.socio.update({
    where: { id },
    data: { stato: socio.stato === "ATTIVO" ? "SOSPESO" : "ATTIVO" },
  });

  revalidatePath("/admin/soci");
  revalidatePath(`/admin/soci/${id}`);
}

export async function reimpostaPassword(_prec: StatoForm, fd: FormData): Promise<StatoForm> {
  const admin = await richiediAdmin();

  const id = testo(fd, "id");
  const password = String(fd.get("password") ?? "");

  // Serve il destinatario, non chi sta agendo: i requisiti dipendono dal suo
  // ruolo e la password non deve contenere i suoi dati.
  const destinatario = await prisma.socio.findUnique({ where: { id } });
  if (!destinatario) return errore("Socio non trovato.", fd);

  const problema = validaPassword(password, {
    lunghezzaMinima: lunghezzaMinimaPerRuolo(destinatario.ruolo),
    contesto: destinatario,
  });
  if (problema) return errore(problema, fd);

  const aggiornato = await prisma.socio.update({
    where: { id },
    data: {
      passwordHash: await bcrypt.hash(password, 10),
      deveCambiarePassword: true,
      // Se l'account era compromesso, le sessioni aperte altrove vanno chiuse.
      versioneSessione: { increment: 1 },
    },
  });

  // Reimpostando la propria password ci si invaliderebbe il cookie da soli.
  if (id === admin.id) await creaSessione(aggiornato.id, aggiornato.versioneSessione);

  revalidatePath(`/admin/soci/${id}`);
  redirect(`/admin/soci/${id}?password=1`);
}

/** Traduce il vincolo di unicità violato in un messaggio comprensibile. */
function messaggioDuplicato(e: unknown): string | null {
  if (typeof e !== "object" || e === null) return null;
  if ((e as { code?: string }).code !== "P2002") return null;

  const campi = (e as { meta?: { target?: string[] | string } }).meta?.target;
  const testoCampi = Array.isArray(campi) ? campi.join(",") : String(campi ?? "");

  if (testoCampi.includes("email")) return "Questa email è già associata a un altro socio.";
  if (testoCampi.includes("numeroTessera")) return "Questo numero di tessera è già in uso.";

  return "Esiste già un socio con questi dati.";
}
