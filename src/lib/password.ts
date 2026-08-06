/**
 * Politica sulle password.
 *
 * Funzioni pure, usate sia dal server (che decide) sia dal browser (che mostra
 * l'elenco dei requisiti mentre si digita). Il controllo lato client è solo un
 * aiuto: quello che conta è quello sul server.
 *
 * Le regole di composizione classiche — una maiuscola, un numero, un simbolo —
 * da sole producono soprattutto varianti di «Password1!». Qui ci sono, ma
 * accanto a due controlli che pesano di più: il divieto di usare parole comuni
 * e il divieto di usare i propri dati. In compenso una passphrase abbastanza
 * lunga è esentata dall'obbligo dei simboli: «il mio cane si chiama argo» è
 * molto più robusta di «Pwd2024!» e non ha senso rifiutarla.
 */

export const LUNGHEZZA_MINIMA = 10;
export const LUNGHEZZA_MINIMA_AMMINISTRATORE = 12;

/** Tipi di carattere richiesti fra minuscole, maiuscole, cifre e simboli. */
export const CLASSI_MINIME = 3;

/** Da questa lunghezza in su la varietà di caratteri non è più richiesta. */
export const LUNGHEZZA_ESENTE_DA_CLASSI = 16;

export interface ContestoPassword {
  nome?: string | null;
  cognome?: string | null;
  email?: string | null;
  numeroTessera?: string | null;
}

export interface OpzioniPassword {
  lunghezzaMinima?: number;
  contesto?: ContestoPassword;
}

export interface Requisito {
  id: string;
  /** Come compare nell'elenco mostrato mentre si digita. */
  descrizione: string;
  /** Come viene segnalato quando il salvataggio viene rifiutato. */
  errore: string;
  soddisfatto: boolean;
}

/**
 * Password troppo diffuse per essere accettate, in forma già minuscola e senza
 * accenti. L'elenco è volutamente corto: intercetta le scelte più prevedibili,
 * non sostituisce un archivio di credenziali trapelate.
 */
const PAROLE_COMUNI = [
  "password",
  "passwort",
  "parola",
  "segreto",
  "qwerty",
  "asdfgh",
  "iloveyou",
  "tiamo",
  "amoremio",
  "ciaociao",
  "benvenuto",
  "welcome",
  "letmein",
  "admin",
  "amministratore",
  "segreteria",
  "circolo",
  "piscina",
  "nuoto",
  "vasca",
  "juventus",
  "milan",
  "inter",
  "napoli",
  "roma",
  "italia",
  "estate",
  "sole",
  "monkey",
  "dragon",
  "abc123",
  "test",
];

const FILE_TASTIERA = ["qwertyuiop", "asdfghjkl", "zxcvbnm"];

function minuscole(s: string): boolean {
  return /[a-zà-öø-ÿ]/.test(s);
}

function maiuscole(s: string): boolean {
  return /[A-ZÀ-ÖØ-Þ]/.test(s);
}

function cifre(s: string): boolean {
  return /\d/.test(s);
}

function simboli(s: string): boolean {
  return /[^\p{L}\p{N}]/u.test(s);
}

/** Quanti tipi di carattere diversi compaiono, da 0 a 4. */
export function classiUsate(password: string): number {
  return [minuscole, maiuscole, cifre, simboli].filter((f) => f(password)).length;
}

/**
 * Sequenze prevedibili: caratteri ripetuti, progressioni come «1234» o «dcba»,
 * tratti di una fila della tastiera.
 */
export function haSequenzaPrevedibile(password: string): boolean {
  const p = password.toLowerCase();

  if (/(.)\1{3,}/.test(p)) return true;

  for (let i = 0; i + 3 < p.length; i++) {
    let crescente = true;
    let decrescente = true;

    for (let k = 0; k < 3; k++) {
      const passo = p.charCodeAt(i + k + 1) - p.charCodeAt(i + k);
      if (passo !== 1) crescente = false;
      if (passo !== -1) decrescente = false;
    }

    if (crescente || decrescente) return true;
  }

  for (const fila of FILE_TASTIERA) {
    const rovescio = [...fila].reverse().join("");

    for (let i = 0; i + 4 <= fila.length; i++) {
      if (p.includes(fila.slice(i, i + 4)) || p.includes(rovescio.slice(i, i + 4))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * True se la password è in sostanza una parola comune: o coincide, o la parola
 * ne occupa almeno metà. Così «password123» viene respinta, mentre
 * «ilmiocanesichiamapassword» no.
 */
export function contieneParolaComune(password: string): boolean {
  const p = password.toLowerCase();
  return PAROLE_COMUNI.some((parola) => p.includes(parola) && parola.length * 2 >= p.length);
}

/** Frammenti dei dati personali che non devono comparire nella password. */
function frammentiPersonali(contesto: ContestoPassword): string[] {
  const grezzi = [
    contesto.nome,
    contesto.cognome,
    contesto.numeroTessera,
    contesto.email?.split("@")[0],
  ];

  return grezzi
    .map((v) => v?.trim().toLowerCase() ?? "")
    .filter((v) => v.length >= 3);
}

export function contieneDatiPersonali(password: string, contesto: ContestoPassword): boolean {
  const p = password.toLowerCase();
  return frammentiPersonali(contesto).some((f) => p.includes(f));
}

/**
 * L'elenco completo dei requisiti, ciascuno con l'esito.
 * Il browser lo usa per mostrare la lista che si spunta mentre si scrive.
 */
export function requisiti(password: string, opzioni: OpzioniPassword = {}): Requisito[] {
  const lunghezzaMinima = opzioni.lunghezzaMinima ?? LUNGHEZZA_MINIMA;
  const contesto = opzioni.contesto;

  const esenteDaClassi = password.length >= LUNGHEZZA_ESENTE_DA_CLASSI;

  const elenco: Requisito[] = [
    {
      id: "lunghezza",
      descrizione: `Almeno ${lunghezzaMinima} caratteri`,
      errore: `La password deve avere almeno ${lunghezzaMinima} caratteri.`,
      soddisfatto: password.length >= lunghezzaMinima,
    },
    {
      id: "classi",
      descrizione: `Almeno ${CLASSI_MINIME} tipi fra minuscole, maiuscole, numeri e simboli — oppure ${LUNGHEZZA_ESENTE_DA_CLASSI} caratteri o più`,
      errore: `La password deve contenere almeno ${CLASSI_MINIME} tipi di carattere fra minuscole, maiuscole, numeri e simboli, oppure essere lunga almeno ${LUNGHEZZA_ESENTE_DA_CLASSI} caratteri.`,
      soddisfatto: esenteDaClassi || classiUsate(password) >= CLASSI_MINIME,
    },
    {
      id: "sequenze",
      descrizione: "Niente sequenze tipo «1234» o «aaaa»",
      errore: "La password contiene una sequenza troppo prevedibile.",
      soddisfatto: !haSequenzaPrevedibile(password),
    },
    {
      id: "comuni",
      descrizione: "Non è una password comune",
      errore: "Questa password è troppo comune: scegline una meno prevedibile.",
      soddisfatto: !contieneParolaComune(password),
    },
  ];

  if (contesto && frammentiPersonali(contesto).length > 0) {
    elenco.push({
      id: "personali",
      descrizione: "Non contiene nome, cognome, email o numero di tessera",
      errore: "La password non deve contenere i tuoi dati personali.",
      soddisfatto: !contieneDatiPersonali(password, contesto),
    });
  }

  return elenco;
}

/**
 * Messaggio del primo requisito non soddisfatto, oppure null se la password va bene.
 * Si segnala un problema per volta: un elenco di quattro errori insieme scoraggia
 * più di quanto aiuti, e la lista dei requisiti è già visibile accanto al campo.
 */
export function validaPassword(password: string, opzioni: OpzioniPassword = {}): string | null {
  const mancante = requisiti(password, opzioni).find((r) => !r.soddisfatto);
  return mancante ? mancante.errore : null;
}

/** Lunghezza minima applicabile in base al ruolo. */
export function lunghezzaMinimaPerRuolo(ruolo: string): number {
  return ruolo === "ADMIN" ? LUNGHEZZA_MINIMA_AMMINISTRATORE : LUNGHEZZA_MINIMA;
}

// ---------------------------------------------------------------------------
// Generazione di password iniziali
// ---------------------------------------------------------------------------

/**
 * Parole per comporre le password che la segreteria consegna ai soci.
 *
 * Sono scelte per essere DETTABILI: nomi concreti di uso comune, senza accenti,
 * senza lettere ambigue da pronunciare, tutti distinguibili al telefono. È il
 * motivo per cui non si generano stringhe tipo «k9#Xz2!q»: nessuno riesce a
 * comunicarle senza sbagliare, e finirebbero scritte su un foglietto.
 */
const PAROLE_DETTABILI = [
  "albero", "ancora", "aquila", "arancia", "argento", "banco", "barca", "bosco",
  "bottone", "brezza", "bussola", "cactus", "campana", "candela", "cantina",
  "carota", "cascata", "castello", "cavallo", "cenere", "cerchio", "chiave",
  "cipolla", "collina", "corda", "corona", "cortile", "cotone", "cravatta",
  "cuscino", "delfino", "deserto", "disegno", "falco", "fanale", "farfalla",
  "faro", "ferro", "fiaba", "fienile", "finestra", "fiocco", "fiume", "foglia",
  "fontana", "foresta", "formica", "fragola", "gabbiano", "galleria", "gelato",
  "giardino", "ginepro", "giostra", "granchio", "grotta", "isola", "lampada",
  "lampo", "lanterna", "lavagna", "legno", "lenzuolo", "lucciola", "macchia",
  "maglione", "mandorla", "mantello", "martello", "matita", "medaglia", "miele",
  "mulino", "nastro", "nebbia", "nido", "nocciola", "nuvola", "oceano", "ombra",
  "orologio", "ortica", "pagina", "palude", "panchina", "pantera", "papavero",
  "pennello", "pergola", "pesca", "pettine", "piazza", "pigna", "pineta",
  "piuma", "ponte", "porto", "prato", "quaderno", "quercia", "radice", "ramo",
  "rondine", "ruscello", "sabbia", "salice", "sasso", "scala", "scoglio",
  "scudo", "sentiero", "sirena", "specchio", "stella", "tamburo", "tavolo",
  "tempesta", "tenda", "tigre", "torre", "trifoglio", "tulipano", "uliveto",
  "valle", "veliero", "vento", "vetro", "violino", "zaffiro", "zattera", "zucca",
];

/** Quante parole compongono la password generata. */
const PAROLE_PER_PASSWORD = 4;

const SEPARATORE = "-";

/**
 * Estrazione uniforme da 0 (incluso) a `massimo` (escluso), con il generatore
 * crittografico. Si scarta ciò che eccede il multiplo più alto di `massimo`:
 * col semplice resto i primi valori uscirebbero un po' più spesso degli altri.
 */
function interoCasuale(massimo: number): number {
  const limite = Math.floor(0x1_0000_0000 / massimo) * massimo;
  const buffer = new Uint32Array(1);

  let estratto: number;
  do {
    globalThis.crypto.getRandomValues(buffer);
    estratto = buffer[0];
  } while (estratto >= limite);

  return estratto % massimo;
}

function componi(vocabolario: string[]): string {
  const disponibili = [...vocabolario];
  const scelte: string[] = [];

  for (let i = 0; i < PAROLE_PER_PASSWORD; i++) {
    // Senza reinserimento: parole ripetute si leggono male e non aggiungono nulla.
    const [parola] = disponibili.splice(interoCasuale(disponibili.length), 1);
    scelte.push(parola);
  }

  // Due cifre in coda: alzano la casualità e sono facili da dettare.
  return `${scelte.join(SEPARATORE)}${SEPARATORE}${10 + interoCasuale(90)}`;
}

/**
 * Password iniziale leggibile, già conforme alla politica.
 *
 * Quattro parole più due cifre superano abbondantemente i {@link LUNGHEZZA_ESENTE_DA_CLASSI}
 * caratteri, quindi non servono maiuscole né simboli: la robustezza viene dalla
 * lunghezza, non dalla punteggiatura.
 *
 * Se viene passato un contesto, le parole che richiamano i dati del socio sono
 * escluse in partenza; il risultato è comunque riverificato con la politica.
 */
export function generaPasswordLeggibile(opzioni: OpzioniPassword = {}): string {
  const frammenti = opzioni.contesto ? frammentiPersonali(opzioni.contesto) : [];

  const vocabolario = PAROLE_DETTABILI.filter(
    (parola) => !frammenti.some((f) => parola.includes(f) || f.includes(parola)),
  );

  // Con un vocabolario così ampio il primo tentativo è quasi sempre valido; i
  // successivi coprono le coincidenze residue (per esempio un cognome che
  // compare a cavallo fra due parole).
  for (let tentativo = 0; tentativo < 25; tentativo++) {
    const candidata = componi(vocabolario);
    if (!validaPassword(candidata, opzioni)) return candidata;
  }

  throw new Error("Non è stato possibile generare una password conforme alla politica.");
}
