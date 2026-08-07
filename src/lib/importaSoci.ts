/**
 * Import massivo di soci da file CSV — regole, senza I/O.
 *
 * Come per `disponibilita.ts`, la logica sta qui in funzioni pure e il database
 * lo tocca solo la server action: così ogni combinazione di file storto —
 * colonne fuori ordine, date all'italiana, doppioni interni — si verifica nei
 * test senza dover caricare file veri.
 *
 * Il ruolo NON è fra le colonne di proposito: l'import serve a caricare i
 * tesserati, e un amministratore creato per distrazione con un copia-incolla
 * avrebbe accesso a tutte le anagrafiche. Gli amministratori restano una
 * creazione singola e consapevole.
 */

import { isDataISO } from "./date";
import { emailPlausibile, normalizzaEmail } from "./validazioni";

/** Oltre questa soglia il file va spezzato: vedi `MOTIVO_LIMITE`. */
export const MAX_RIGHE = 200;

/**
 * Ogni socio importato richiede il calcolo di un hash bcrypt, che è lento per
 * costruzione. Con qualche centinaio di righe si rischia di superare il tempo
 * massimo concesso alla funzione serverless, lasciando l'import a metà: meglio
 * un limite dichiarato che un errore incomprensibile a due terzi del file.
 */
export const MOTIVO_LIMITE = `Il file contiene più di ${MAX_RIGHE} soci: caricalo in più parti.`;

/** Valore che marca la riga di esempio del template, ignorata in fase di lettura. */
export const MARCATORE_ESEMPIO = "ESEMPIO";

export type ChiaveColonna =
  | "numeroTessera"
  | "nome"
  | "cognome"
  | "email"
  | "telefono"
  | "scadenzaTessera"
  | "scadenzaCertificato"
  | "note";

export interface Colonna {
  chiave: ChiaveColonna;
  intestazione: string;
  obbligatoria: boolean;
  esempio: string;
}

export const COLONNE: Colonna[] = [
  { chiave: "numeroTessera", intestazione: "Numero tessera", obbligatoria: true, esempio: "0042" },
  { chiave: "nome", intestazione: "Nome", obbligatoria: true, esempio: "Maria" },
  { chiave: "cognome", intestazione: "Cognome", obbligatoria: true, esempio: "Rossi" },
  { chiave: "email", intestazione: "Email", obbligatoria: true, esempio: "maria.rossi@example.it" },
  { chiave: "telefono", intestazione: "Telefono", obbligatoria: false, esempio: "333 1234567" },
  {
    chiave: "scadenzaTessera",
    intestazione: "Scadenza tessera",
    obbligatoria: false,
    esempio: "31/12/2026",
  },
  {
    chiave: "scadenzaCertificato",
    intestazione: "Scadenza certificato",
    obbligatoria: false,
    esempio: "30/06/2027",
  },
  { chiave: "note", intestazione: "Note", obbligatoria: false, esempio: "" },
];

/** Anagrafica pronta per il database, con il numero di riga per i messaggi. */
export interface RigaSocio {
  riga: number;
  numeroTessera: string;
  nome: string;
  cognome: string;
  email: string;
  telefono: string | null;
  scadenzaTessera: string | null;
  scadenzaCertificato: string | null;
  note: string | null;
}

export interface ProblemaRiga {
  riga: number;
  descrizione: string;
  /** Come identificare la riga nel foglio: "0042 — Maria Rossi". */
  riferimento: string;
}

export interface EsitoAnalisi {
  righe: RigaSocio[];
  problemi: ProblemaRiga[];
  /** Valorizzato quando il file non è utilizzabile affatto (colonne mancanti). */
  erroreFatale: string | null;
}

/**
 * Riduce un'intestazione alla sua forma confrontabile.
 *
 * "Numero tessera", "numeroTessera" e "NUMERO_TESSERA" devono valere lo stesso:
 * chi compila il foglio non deve indovinare le maiuscole.
 */
export function normalizzaIntestazione(valore: string): string {
  return valore
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // toglie gli accenti: "E-mail" e "É-mail" coincidono
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Intestazioni alternative accettate, oltre a quella ufficiale della colonna. */
const ALIAS: Record<ChiaveColonna, string[]> = {
  numeroTessera: ["tessera", "ntessera", "numero", "numerotessera", "ntess"],
  nome: ["nome"],
  cognome: ["cognome"],
  email: ["email", "mail", "indirizzoemail", "posta", "postaelettronica"],
  telefono: ["telefono", "tel", "cellulare", "cell", "recapito"],
  scadenzaTessera: ["scadenzatessera", "tesserascadenza", "scadtessera"],
  scadenzaCertificato: [
    "scadenzacertificato",
    "certificato",
    "scadenzacertificatomedico",
    "certificatomedico",
    "scadcertificato",
  ],
  note: ["note", "nota", "annotazioni"],
};

/**
 * Accetta le date sia in ISO sia nel formato italiano.
 *
 * Excel mostra e salva quasi sempre `31/12/2026`; pretendere `2026-12-31`
 * significherebbe far fallire la quasi totalità dei file veri.
 *
 * Restituisce la data in ISO, oppure null se il testo non è una data.
 */
export function normalizzaData(valore: string): string | null {
  const v = valore.trim();
  if (v === "") return null;

  if (isDataISO(v)) return v;

  const m = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(v);
  if (!m) return null;

  const [, giorno, mese, anno] = m;
  const iso = `${anno}-${mese.padStart(2, "0")}-${giorno.padStart(2, "0")}`;

  // isDataISO verifica anche che la data esista davvero: 31/02 non passa.
  return isDataISO(iso) ? iso : null;
}

/** Righe del template da scaricare: intestazioni più una riga di esempio. */
export function righeTemplate(): string[][] {
  return [
    COLONNE.map((c) => c.intestazione),
    COLONNE.map((c) => (c.chiave === "numeroTessera" ? MARCATORE_ESEMPIO : c.esempio)),
  ];
}

/**
 * Trasforma la griglia letta dal CSV in anagrafiche valide più l'elenco dei
 * problemi, uno per riga scartata.
 *
 * Non tocca il database: i doppioni rilevati qui sono solo quelli *interni* al
 * file. Il confronto con i soci già registrati spetta alla server action.
 */
export function interpretaCsvSoci(griglia: string[][]): EsitoAnalisi {
  if (griglia.length === 0) {
    return { righe: [], problemi: [], erroreFatale: "Il file è vuoto." };
  }

  const [intestazioni, ...corpo] = griglia;

  const posizione = new Map<ChiaveColonna, number>();
  for (const colonna of COLONNE) {
    const attese = new Set([
      normalizzaIntestazione(colonna.intestazione),
      ...ALIAS[colonna.chiave],
    ]);
    const indice = intestazioni.findIndex((i) => attese.has(normalizzaIntestazione(i)));
    if (indice !== -1) posizione.set(colonna.chiave, indice);
  }

  const mancanti = COLONNE.filter((c) => c.obbligatoria && !posizione.has(c.chiave));
  if (mancanti.length > 0) {
    return {
      righe: [],
      problemi: [],
      erroreFatale:
        `Nel file mancano le colonne obbligatorie: ${mancanti.map((c) => c.intestazione).join(", ")}. ` +
        "Scarica il template e ricopiaci i dati.",
    };
  }

  if (corpo.length > MAX_RIGHE) {
    return { righe: [], problemi: [], erroreFatale: MOTIVO_LIMITE };
  }

  const righe: RigaSocio[] = [];
  const problemi: ProblemaRiga[] = [];
  const emailViste = new Map<string, number>();
  const tessereViste = new Map<string, number>();

  const leggi = (celle: string[], chiave: ChiaveColonna): string => {
    const indice = posizione.get(chiave);
    return indice === undefined ? "" : (celle[indice] ?? "").trim();
  };

  corpo.forEach((celle, i) => {
    // +2 perché il corpo parte dalla seconda riga del foglio e si conta da 1:
    // il numero mostrato deve combaciare con quello che l'utente vede in Excel.
    const riga = i + 2;

    const numeroTessera = leggi(celle, "numeroTessera");
    const nome = leggi(celle, "nome");
    const cognome = leggi(celle, "cognome");
    const email = normalizzaEmail(leggi(celle, "email"));

    // La riga di esempio del template non è un socio: si salta in silenzio,
    // altrimenti chi dimentica di cancellarla si vedrebbe un errore inutile.
    if (numeroTessera.toUpperCase() === MARCATORE_ESEMPIO) return;

    const riferimento = [numeroTessera, `${nome} ${cognome}`.trim()].filter(Boolean).join(" — ");
    const scarta = (descrizione: string) =>
      problemi.push({ riga, descrizione, riferimento: riferimento || "(riga senza dati)" });

    if (!numeroTessera) return scarta("Manca il numero di tessera.");
    if (!nome) return scarta("Manca il nome.");
    if (!cognome) return scarta("Manca il cognome.");
    if (!emailPlausibile(email)) {
      return scarta(email ? `L'email «${email}» non è valida.` : "Manca l'email.");
    }

    const scadenze: Record<string, string | null> = {};
    for (const chiave of ["scadenzaTessera", "scadenzaCertificato"] as const) {
      const grezzo = leggi(celle, chiave);
      if (grezzo === "") {
        scadenze[chiave] = null;
        continue;
      }

      const iso = normalizzaData(grezzo);
      if (!iso) {
        const etichetta = COLONNE.find((c) => c.chiave === chiave)!.intestazione.toLowerCase();
        return scarta(`La ${etichetta} «${grezzo}» non è una data valida (usa 31/12/2026).`);
      }
      scadenze[chiave] = iso;
    }

    const emailPrecedente = emailViste.get(email);
    if (emailPrecedente) return scarta(`Email già presente alla riga ${emailPrecedente} del file.`);

    const tesseraPrecedente = tessereViste.get(numeroTessera.toLowerCase());
    if (tesseraPrecedente) {
      return scarta(`Numero di tessera già presente alla riga ${tesseraPrecedente} del file.`);
    }

    emailViste.set(email, riga);
    tessereViste.set(numeroTessera.toLowerCase(), riga);

    righe.push({
      riga,
      numeroTessera,
      nome,
      cognome,
      email,
      telefono: leggi(celle, "telefono") || null,
      scadenzaTessera: scadenze.scadenzaTessera,
      scadenzaCertificato: scadenze.scadenzaCertificato,
      note: leggi(celle, "note") || null,
    });
  });

  return { righe, problemi, erroreFatale: null };
}
