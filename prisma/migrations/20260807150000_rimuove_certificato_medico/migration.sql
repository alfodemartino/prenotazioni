-- Rimuove la gestione del certificato medico.
--
-- Il circolo non verifica i certificati tramite questa applicazione: la data di
-- scadenza registrata sui soci e l'interruttore che la faceva valere come blocco
-- non servono più. Le colonne vengono eliminate, con i dati che contengono: è
-- una scelta voluta, perché conservare un dato sanitario non più utilizzato
-- sarebbe da evitare anche a prescindere dal fatto che non lo si legge più.

-- DropColumn
ALTER TABLE "Socio" DROP COLUMN "scadenzaCertificato";

-- DropColumn
ALTER TABLE "Impostazioni" DROP COLUMN "controlloCertificato";
