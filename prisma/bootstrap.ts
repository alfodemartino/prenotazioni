/**
 * Primo avvio in produzione.
 *
 * Crea le impostazioni e UN SOLO account amministratore, leggendone le
 * credenziali dalle variabili d'ambiente. A differenza di `seed.ts` non crea
 * nessun account dimostrativo: su un indirizzo pubblico una password nota
 * sarebbe una porta aperta.
 *
 * Uso:
 *   ADMIN_EMAIL=segreteria@circolo.it \
 *   ADMIN_PASSWORD=... \
 *   ADMIN_NOME=Anna ADMIN_COGNOME=Bianchi \
 *   npm run db:bootstrap
 *
 * È ripetibile: se un amministratore esiste già, non tocca nulla.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
// Stessa politica applicata dall'app, per non avere due regole diverse.
import { LUNGHEZZA_MINIMA_AMMINISTRATORE, validaPassword } from "../src/lib/password";

const prisma = new PrismaClient();

const IMPOSTAZIONI_INIZIALI = {
  nomeCircolo: process.env.NOME_CIRCOLO?.trim() || "Circolo Piscina",
  capienzaAdultiDefault: 80,
  overbookingPct: 10,
  giorniFinestra: 2,
  oraAperturaDefault: "09:00",
  oraChiusuraDefault: "19:00",
  tariffaOspiteAdultoCent: 1000,
  tariffaOspiteBambinoCent: 500,
  sogliaUltimiPosti: 5,
  maxPersonePerPrenotazione: 20,
  controlloCertificato: false,
};

function obbligatoria(nome: string): string {
  const valore = process.env[nome]?.trim();
  if (!valore) {
    throw new Error(
      `Manca la variabile d'ambiente ${nome}. Vedi le istruzioni in cima a prisma/bootstrap.ts.`,
    );
  }
  return valore;
}

async function main() {
  const email = obbligatoria("ADMIN_EMAIL").toLowerCase();
  const password = obbligatoria("ADMIN_PASSWORD");
  const nome = process.env.ADMIN_NOME?.trim() || "Segreteria";
  const cognome = process.env.ADMIN_COGNOME?.trim() || "Circolo";
  const numeroTessera = process.env.ADMIN_TESSERA?.trim() || "ADMIN";

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    throw new Error(`ADMIN_EMAIL non è un indirizzo valido: ${email}`);
  }

  const problemaPassword = validaPassword(password, {
    lunghezzaMinima: LUNGHEZZA_MINIMA_AMMINISTRATORE,
    contesto: { nome, cognome, email, numeroTessera },
  });

  if (problemaPassword) throw new Error(`ADMIN_PASSWORD non va bene. ${problemaPassword}`);

  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error(
      "SESSION_SECRET mancante o troppo corto (servono almeno 32 caratteri). " +
        'Generane uno con: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"',
    );
  }

  await prisma.impostazioni.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, ...IMPOSTAZIONI_INIZIALI },
  });
  console.log("Impostazioni pronte (valori segnaposto, da rivedere in Configurazioni).");

  const amministratoreEsistente = await prisma.socio.findFirst({ where: { ruolo: "ADMIN" } });

  if (amministratoreEsistente) {
    console.log(
      `Esiste già un amministratore (${amministratoreEsistente.email}): non è stato creato nulla.`,
    );
    console.log(
      "Per aggiungerne altri, usa il pannello: Amministrazione → Soci → Nuovo socio.",
    );
    return;
  }

  await prisma.socio.create({
    data: {
      numeroTessera,
      nome,
      cognome,
      email,
      passwordHash: await bcrypt.hash(password, 10),
      ruolo: "ADMIN",
      stato: "ATTIVO",
      // La password iniziale è passata da una variabile d'ambiente, visibile a
      // chiunque abbia accesso al pannello di hosting: va cambiata al primo accesso.
      deveCambiarePassword: true,
    },
  });

  console.log(`\nAmministratore creato: ${email}`);
  console.log("Al primo accesso ti verrà chiesto di scegliere una nuova password.");
}

main()
  .catch((e) => {
    console.error(`\n${e instanceof Error ? e.message : e}\n`);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
