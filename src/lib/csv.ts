/**
 * Lettura di file CSV forniti dall'amministrazione.
 *
 * Il contraltare di `generaCsv` in `report.ts`, che invece produce CSV. Funzioni
 * pure: ricevono il testo del file e restituiscono una griglia, senza sapere
 * nulla di soci o di database.
 *
 * Il file arriva quasi sempre da Excel, quindi il parser deve reggere ciò che
 * Excel produce davvero: BOM in testa, punto e virgola come separatore nelle
 * versioni italiane, virgolette raddoppiate, righe terminate con CRLF e
 * l'immancabile riga vuota in fondo.
 */

/**
 * Separatore usato dal file.
 *
 * Excel italiano salva con `;`, quello inglese con `,`. Invece di imporre una
 * scelta all'utente — che non sa quale delle due versioni ha — lo si deduce
 * contando i due caratteri nell'intestazione, ignorando quelli fra virgolette.
 */
export function rilevaSeparatore(intestazione: string): ";" | "," {
  let puntoVirgola = 0;
  let virgola = 0;
  let fraVirgolette = false;

  for (const c of intestazione) {
    if (c === '"') fraVirgolette = !fraVirgolette;
    else if (fraVirgolette) continue;
    else if (c === ";") puntoVirgola++;
    else if (c === ",") virgola++;
  }

  // A parità si sceglie `;`: è quello che produce Excel in italiano, il caso
  // di gran lunga più probabile per questo progetto.
  return virgola > puntoVirgola ? "," : ";";
}

/**
 * Converte il testo di un CSV in una griglia di celle già ripulite dagli spazi.
 *
 * Le righe completamente vuote vengono scartate: Excel ne aggiunge quasi sempre
 * una in fondo, e segnalarla come "riga 43 incompleta" sarebbe solo rumore.
 */
export function analizzaCsv(sorgente: string): string[][] {
  // Il BOM serve a Excel per riconoscere UTF-8, ma se resta attaccato alla prima
  // cella l'intestazione "Numero tessera" non verrebbe più riconosciuta.
  const testo = sorgente.replace(/^\uFEFF/, "");
  const separatore = rilevaSeparatore(testo.split("\n", 1)[0] ?? "");

  const righe: string[][] = [];
  let riga: string[] = [];
  let cella = "";
  let fraVirgolette = false;

  const chiudiCella = () => {
    riga.push(cella.trim());
    cella = "";
  };

  const chiudiRiga = () => {
    chiudiCella();
    righe.push(riga);
    riga = [];
  };

  for (let i = 0; i < testo.length; i++) {
    const c = testo[i];

    if (fraVirgolette) {
      if (c !== '"') {
        cella += c;
      } else if (testo[i + 1] === '"') {
        cella += '"'; // virgoletta letterale, raddoppiata secondo la convenzione CSV
        i++;
      } else {
        fraVirgolette = false;
      }
      continue;
    }

    if (c === '"') fraVirgolette = true;
    else if (c === separatore) chiudiCella();
    else if (c === "\n") chiudiRiga();
    else if (c !== "\r") cella += c;
    // Il \r di un CRLF viene ignorato: la riga si chiude sul \n che segue.
  }

  chiudiRiga(); // l'ultima riga non è seguita da un a capo

  return righe.filter((r) => r.some((c) => c !== ""));
}
