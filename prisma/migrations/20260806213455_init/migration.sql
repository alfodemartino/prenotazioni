-- CreateTable
CREATE TABLE "Socio" (
    "id" TEXT NOT NULL,
    "numeroTessera" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cognome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "ruolo" TEXT NOT NULL DEFAULT 'SOCIO',
    "stato" TEXT NOT NULL DEFAULT 'ATTIVO',
    "scadenzaTessera" TEXT,
    "scadenzaCertificato" TEXT,
    "telefono" TEXT,
    "note" TEXT,
    "deveCambiarePassword" BOOLEAN NOT NULL DEFAULT true,
    "versioneSessione" INTEGER NOT NULL DEFAULT 0,
    "creatoIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aggiornatoIl" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Socio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Giornata" (
    "data" TEXT NOT NULL,
    "aperta" BOOLEAN NOT NULL DEFAULT true,
    "capienzaAdulti" INTEGER NOT NULL,
    "overbookingPct" INTEGER NOT NULL,
    "oraApertura" TEXT NOT NULL,
    "oraChiusura" TEXT NOT NULL,
    "nota" TEXT,
    "creataIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aggiornataIl" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Giornata_pkey" PRIMARY KEY ("data")
);

-- CreateTable
CREATE TABLE "Prenotazione" (
    "id" TEXT NOT NULL,
    "socioId" TEXT NOT NULL,
    "data" TEXT NOT NULL,
    "adulti" INTEGER NOT NULL,
    "bambini" INTEGER NOT NULL DEFAULT 0,
    "ospitiAdulti" INTEGER NOT NULL DEFAULT 0,
    "ospitiBambini" INTEGER NOT NULL DEFAULT 0,
    "stato" TEXT NOT NULL DEFAULT 'ATTIVA',
    "slotAttivo" TEXT,
    "checkInIl" TIMESTAMP(3),
    "adultiEffettivi" INTEGER,
    "bambiniEffettivi" INTEGER,
    "ospitiEffettivi" INTEGER,
    "creataIl" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "aggiornataIl" TIMESTAMP(3) NOT NULL,
    "annullataIl" TIMESTAMP(3),

    CONSTRAINT "Prenotazione_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TentativoAccesso" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "quando" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TentativoAccesso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Impostazioni" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "nomeCircolo" TEXT NOT NULL DEFAULT 'Circolo Piscina',
    "capienzaAdultiDefault" INTEGER NOT NULL DEFAULT 80,
    "overbookingPct" INTEGER NOT NULL DEFAULT 10,
    "giorniFinestra" INTEGER NOT NULL DEFAULT 2,
    "oraAperturaDefault" TEXT NOT NULL DEFAULT '09:00',
    "oraChiusuraDefault" TEXT NOT NULL DEFAULT '19:00',
    "tariffaOspiteAdultoCent" INTEGER NOT NULL DEFAULT 1000,
    "tariffaOspiteBambinoCent" INTEGER NOT NULL DEFAULT 500,
    "sogliaUltimiPosti" INTEGER NOT NULL DEFAULT 5,
    "maxPersonePerPrenotazione" INTEGER NOT NULL DEFAULT 20,
    "controlloCertificato" BOOLEAN NOT NULL DEFAULT false,
    "aggiornatoIl" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Impostazioni_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Socio_numeroTessera_key" ON "Socio"("numeroTessera");

-- CreateIndex
CREATE UNIQUE INDEX "Socio_email_key" ON "Socio"("email");

-- CreateIndex
CREATE INDEX "Socio_cognome_nome_idx" ON "Socio"("cognome", "nome");

-- CreateIndex
CREATE INDEX "Prenotazione_data_stato_idx" ON "Prenotazione"("data", "stato");

-- CreateIndex
CREATE UNIQUE INDEX "Prenotazione_socioId_slotAttivo_key" ON "Prenotazione"("socioId", "slotAttivo");

-- CreateIndex
CREATE INDEX "TentativoAccesso_email_quando_idx" ON "TentativoAccesso"("email", "quando");

-- CreateIndex
CREATE INDEX "TentativoAccesso_ip_quando_idx" ON "TentativoAccesso"("ip", "quando");

-- AddForeignKey
ALTER TABLE "Prenotazione" ADD CONSTRAINT "Prenotazione_socioId_fkey" FOREIGN KEY ("socioId") REFERENCES "Socio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prenotazione" ADD CONSTRAINT "Prenotazione_data_fkey" FOREIGN KEY ("data") REFERENCES "Giornata"("data") ON DELETE CASCADE ON UPDATE CASCADE;
