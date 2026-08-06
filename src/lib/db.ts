import { PrismaClient } from "@prisma/client";

// In sviluppo Next.js ricarica i moduli a ogni modifica: senza questa cache
// globale si accumulerebbe una connessione al database per ogni ricarica.
const globalPerPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalPerPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalPerPrisma.prisma = prisma;

/** True quando il database sottostante è PostgreSQL (in sviluppo si usa SQLite). */
export const usaPostgres = (process.env.DATABASE_URL ?? "").startsWith("postgres");
