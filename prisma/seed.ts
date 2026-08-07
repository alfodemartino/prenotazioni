/**
 * Popolamento iniziale per lo SVILUPPO.
 *
 * Crea le impostazioni con i valori segnaposto e alcuni account di prova con
 * password note, per poter usare l'app da subito.
 * Eseguibile più volte senza duplicare nulla.
 *
 * In produzione va usato `prisma/bootstrap.ts`, che non crea account
 * dimostrativi e legge le credenziali dell'amministratore dall'ambiente.
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

// Barriera di sicurezza: queste password sono scritte qui sotto in chiaro e
// non devono finire su un'installazione raggiungibile da internet.
if (process.env.NODE_ENV === "production") {
  console.error(
    "\nQuesto seed crea account di prova con password note e non va eseguito in produzione." +
      "\nUsa invece: npm run db:bootstrap\n",
  );
  process.exit(1);
}

const prisma = new PrismaClient();

const IMPOSTAZIONI_INIZIALI = {
  nomeCircolo: "Circolo Piscina",
  capienzaAdultiDefault: 80,
  overbookingPct: 10,
  giorniFinestra: 2,
  oraAperturaDefault: "09:00",
  oraChiusuraDefault: "19:00",
  tariffaOspiteAdultoCent: 1000,
  tariffaOspiteBambinoCent: 500,
  sogliaUltimiPosti: 5,
  maxPersonePerPrenotazione: 20,
};

// Password volutamente banali e facili da ridigitare: NON rispettano la politica
// applicata dall'app, ma qui servono solo a provare l'app in locale. In produzione
// le crea `bootstrap.ts`, che invece la politica la applica.
const ACCOUNT = [
  {
    numeroTessera: "ADMIN",
    nome: "Segreteria",
    cognome: "Circolo",
    email: "admin@circolo.it",
    password: "admin1234",
    ruolo: "ADMIN",
  },
  {
    numeroTessera: "0001",
    nome: "Maria",
    cognome: "Rossi",
    email: "maria.rossi@example.it",
    password: "socio1234",
    ruolo: "SOCIO",
  },
  {
    numeroTessera: "0002",
    nome: "Luca",
    cognome: "Bianchi",
    email: "luca.bianchi@example.it",
    password: "socio1234",
    ruolo: "SOCIO",
  },
  {
    numeroTessera: "0003",
    nome: "Giulia",
    cognome: "Verdi",
    email: "giulia.verdi@example.it",
    password: "socio1234",
    ruolo: "SOCIO",
  },
];

async function main() {
  await prisma.impostazioni.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, ...IMPOSTAZIONI_INIZIALI },
  });
  console.log("Impostazioni pronte (valori segnaposto, da rivedere in Configurazioni).");

  for (const a of ACCOUNT) {
    await prisma.socio.upsert({
      where: { email: a.email },
      update: {},
      create: {
        numeroTessera: a.numeroTessera,
        nome: a.nome,
        cognome: a.cognome,
        email: a.email,
        passwordHash: await bcrypt.hash(a.password, 10),
        ruolo: a.ruolo,
        stato: "ATTIVO",
        // Il seed serve per provare l'app: niente cambio password forzato.
        deveCambiarePassword: false,
      },
    });
  }

  console.log("\nAccount disponibili:");
  for (const a of ACCOUNT) {
    console.log(`  ${a.ruolo.padEnd(5)}  ${a.email.padEnd(28)}  password: ${a.password}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
