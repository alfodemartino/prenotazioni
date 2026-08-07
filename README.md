# Prenotazioni Piscina

Web app mobile-first per la prenotazione dell'accesso giornaliero alla piscina
di un circolo riservato ai soci tesserati.

Le regole di funzionamento sono descritte in [SPEC.md](SPEC.md).

## Avvio

Serve un database PostgreSQL. Il modo più rapido per averne uno senza installare
niente è creare un progetto gratuito su [Neon](https://neon.com) e usare un
**branch di sviluppo** separato da quello di produzione; in alternativa va bene un
PostgreSQL locale.

```bash
cp .env.example .env   # e riempire DATABASE_URL, DIRECT_URL, SESSION_SECRET
npm install
npm run setup          # applica le migrazioni e popola il database
npm run dev            # http://localhost:3000
```

Account creati dal seed:

| Ruolo | Email | Password |
|---|---|---|
| Admin | `admin@circolo.it` | `admin1234` |
| Socio | `maria.rossi@example.it` | `socio1234` |
| Socio | `luca.bianchi@example.it` | `socio1234` |
| Socio | `giulia.verdi@example.it` | `socio1234` |

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm run dev` | Avvia l'app in sviluppo |
| `npm test` | Esegue i test del motore di disponibilità (non serve il database) |
| `npm run test:watch` | Test in modalità continua |
| `npm run db:migrate` | Crea e applica una migrazione dopo una modifica allo schema |
| `npm run db:deploy` | Applica le migrazioni esistenti (è ciò che gira in produzione) |
| `npm run db:push` | Allinea il database allo schema senza creare una migrazione |
| `npm run db:seed` | Ricarica i dati iniziali **di sviluppo** (account con password note) |
| `npm run db:bootstrap` | Primo avvio in **produzione**: solo impostazioni e amministratore |
| `npm run db:studio` | Apre l'esploratore del database |
| `npm run build` | Build di produzione (include il controllo dei tipi) |

## Struttura

```
prisma/schema.prisma      modello dati
prisma/seed.ts            impostazioni segnaposto e account di prova

src/lib/date.ts           date-giornata e orari nel fuso Europe/Rome
src/lib/disponibilita.ts  motore di disponibilità — funzioni pure, nessun I/O
src/lib/prenotazioni.ts   letture e scritture transazionali sulle prenotazioni
src/lib/impostazioni.ts   parametri configurabili del circolo
src/lib/auth.ts           sessione a cookie firmato

src/lib/admin.ts          letture del pannello amministrazione
src/lib/report.ts         aggregazioni delle presenze ed esportazione CSV
src/lib/validazioni.ts    controlli sui dati inseriti dall'amministrazione

src/app/page.tsx              home: le giornate prenotabili
src/app/prenota/[data]/       creazione e modifica di una prenotazione
src/app/prenotazioni/         prenotazioni attive e storico del socio
src/app/login/                accesso
src/app/cambia-password/      cambio password (obbligatorio al primo accesso)

src/app/admin/                registro del giorno con check-in
src/app/admin/calendario/     capienze, orari e chiusure
src/app/admin/soci/           anagrafiche, sospensioni, reset password
src/app/admin/report/         affluenza, no-show, esportazione CSV
src/app/admin/configurazioni/ parametri generali del circolo

tests/                    test del motore, delle date e delle validazioni
```

La separazione fra `disponibilita.ts` (regole, senza I/O) e `prenotazioni.ts`
(database) è voluta: le regole del circolo si verificano nei test in ogni
combinazione, compresi i casi limite difficili da riprodurre con dati veri.

## Configurazione

Nessun valore di business è scritto nel codice: capienza, overbooking, ampiezza
della finestra, orari, tariffe ospiti e soglie stanno nella tabella
`Impostazioni` e si modificano da **Amministrazione → Configurazioni**. I valori
attuali sono **segnaposto** — vanno concordati con il circolo.

Le singole giornate possono derogare da questi valori: dal **Calendario** si
imposta una capienza ridotta, un orario diverso o una chiusura per una data
specifica, anche su un intervallo di giorni.

| Parametro | Valore attuale |
|---|---|
| Capienza adulti al giorno | 80 |
| Tolleranza di overbooking | 10% (limite reale 88) |
| Giorni prenotabili oltre oggi | 2 |
| Orario di apertura | 09:00 – 19:00 |
| Tariffa ospite adulto | 10,00 € |
| Tariffa ospite bambino | 5,00 € |
| Soglia "ultimi posti" | 5 |
| Massimo persone per prenotazione | 20 |
| Controllo certificato medico | disattivato |

## Sicurezza

- **Nessun account dimostrativo in produzione.** `npm run db:seed` crea utenti con
  password note e si rifiuta di partire con `NODE_ENV=production`. Per un'installazione
  pubblica si usa `npm run db:bootstrap`, che crea le impostazioni e un solo
  amministratore leggendo le credenziali dall'ambiente.
- **Freno sui tentativi di accesso.** Cinque errori sullo stesso account in un quarto
  d'ora lo bloccano per il tempo residuo della finestra; un secondo limite, più largo,
  vale per indirizzo di rete. Il conteggio sta sul database e non in memoria, perché in
  produzione l'app gira su più istanze e un contatore in memoria si aggirerebbe
  ritentando. Il blocco vale anche presentando la password corretta.
- **Le sessioni decadono al cambio password.** Il cookie porta con sé un numero di
  versione che avanza a ogni cambio: reimpostare la password di un account compromesso
  chiude davvero le sessioni aperte altrove.
- **Cambio password obbligatorio al primo accesso** per chi riceve le credenziali dalla
  segreteria.
- **Requisiti sulle password** (`src/lib/password.ts`), applicati sul server e mostrati
  come elenco che si spunta mentre si digita:
  - almeno 10 caratteri per i soci, 12 per gli amministratori;
  - almeno 3 tipi fra minuscole, maiuscole, numeri e simboli — requisito che **decade
    oltre i 16 caratteri**, perché una passphrase lunga è più robusta di `Pwd2024!` e
    non ha senso rifiutarla;
  - nessuna sequenza prevedibile (`1234`, `aaaa`, tratti di tastiera come `qwer`);
  - nessuna password comune, riconosciuta anche mascherata (`Password1!`);
  - nessun riferimento a nome, cognome, email o numero di tessera del socio.

  Le sole regole di composizione producono soprattutto varianti di `Password1!`: qui
  ci sono, ma il lavoro vero lo fanno la lista delle password comuni e il divieto di
  usare i propri dati.
- **Password iniziali generate e dettabili.** Creando un socio — o reimpostandogli la
  password — il campo arriva già compilato con qualcosa come
  `bussola-violino-pineta-cenere-12`: quattro parole italiane comuni più due cifre,
  estratte con il generatore crittografico. Sono lunghe abbastanza da non richiedere
  simboli e si possono dettare al telefono senza sbagliare, che è il vero requisito di
  una credenziale consegnata a mano. Le parole che richiamano i dati del socio vengono
  escluse in partenza, e accanto al campo ci sono «Genera un'altra» e «Copia».
  Il campo è in chiaro di proposito: va letto, non copiato alla cieca.
- **Un amministratore non può sospendere né declassare sé stesso**, per non restare
  chiuso fuori dal pannello.
- **Il segreto di sessione** deve essere di almeno 32 caratteri in produzione: l'app si
  rifiuta di partire altrimenti.
- **Intestazioni di sicurezza** (`X-Frame-Options`, `nosniff`, `Referrer-Policy`,
  `Permissions-Policy`) applicate a tutte le pagine.
- **Informativa privacy** su `/privacy`, collegata dall'accesso e dall'area soci. Il
  testo descrive fedelmente i dati trattati, ma contiene segnaposto `[DA COMPLETARE]`
  che solo il circolo può riempire: vanno compilati prima della pubblicazione.

Non ancora coperto: l'autenticazione a due fattori per gli amministratori, e il
confronto con archivi di credenziali già trapelate (tipo *Have I Been Pwned*), che
coprirebbe molto più della lista interna di password comuni.

Nota: gli account creati da `npm run db:seed` hanno password volutamente banali
(`socio1234` e simili) che **non** rispettano questa politica. Servono solo a provare
l'app in locale; in produzione gli account si creano con `db:bootstrap`, che la applica.

## Pubblicazione su Vercel + Neon

### 1. Il database (Neon)

Creare un progetto su [Neon](https://neon.com) scegliendo una **regione europea**
(es. Frankfurt): i dati trattati sono anagrafiche di soci, e tenerli nell'UE
semplifica gli adempimenti. Il piano gratuito è ampiamente sufficiente per un
circolo di qualche centinaio di tesserati.

Dal pannello si copiano **due** stringhe di connessione allo stesso database:

- quella **pooled** (ha `-pooler` nel nome dell'host) → `DATABASE_URL`
- quella **diretta** (senza `-pooler`) → `DIRECT_URL`

La distinzione conta: l'app apre e chiude connessioni a ogni richiesta e ha
bisogno del pooler, mentre `prisma migrate` vuole una sessione stabile e deve
passare dalla connessione diretta.

È comodo creare anche un **branch di sviluppo** nello stesso progetto Neon, da
usare in locale: costa zero e tiene i dati di prova lontani da quelli veri.

### 2. L'applicazione (Vercel)

Importare il repository da GitHub. Vercel riconosce Next.js da solo; non serve
configurare comandi di build, perché il progetto espone già uno script
`vercel-build` che applica le migrazioni prima di compilare.

Variabili d'ambiente da impostare nel progetto Vercel:

| Variabile | Valore |
|---|---|
| `DATABASE_URL` | connessione **pooled** di Neon |
| `DIRECT_URL` | connessione **diretta** di Neon |
| `SESSION_SECRET` | stringa nuova di almeno 32 caratteri (vedi sotto) |

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Il segreto di produzione deve essere **diverso** da quello di sviluppo: chi lo
conosce può fabbricarsi un cookie da amministratore.

**Il deploy è automatico, senza comandi manuali.** Vercel osserva il
repository: un push su un branch qualsiasi (comprese le pull request) genera
un *Preview Deployment* su un URL a sé; un push o merge su `main` aggiorna il
*Production Deployment*, cioè il sito pubblico. In entrambi i casi
`vercel-build` applica le migrazioni prima di compilare.

Quando si impostano le variabili d'ambiente, Vercel chiede per quali
ambienti valgono (*Production*, *Preview*, *Development*). Se si lasciano
spuntati tutti, un Preview Deployment di un branch di prova punta allo
**stesso database di produzione**: per un progetto con dati reali dei soci,
conviene limitare `DATABASE_URL` e `DIRECT_URL` di produzione al solo
ambiente *Production*, ed eventualmente puntare i Preview a un branch Neon
separato.

### 3. Il primo amministratore

Una volta sola, dal proprio computer, puntando al database di produzione:

```bash
DATABASE_URL="<diretta di Neon>" DIRECT_URL="<diretta di Neon>" \
ADMIN_EMAIL="segreteria@circolo.it" ADMIN_PASSWORD="<password lunga>" \
ADMIN_NOME="Anna" ADMIN_COGNOME="Bianchi" \
npm run db:bootstrap
```

`db:bootstrap` crea le impostazioni e **un solo** account amministratore. Non usare
mai `db:seed` in produzione: crea utenti con password note, e si rifiuta comunque
di partire con `NODE_ENV=production`.

### Nota sul piano gratuito

Il piano **Hobby** di Vercel è riservato all'uso non commerciale: va bene per far
provare l'app al circolo, ma quando diventa lo strumento ufficiale con cui il
circolo lavora serve il piano Pro. Il passaggio non comporta modifiche al codice.

## Lista di controllo prima di pubblicare

- [ ] Progetto Neon creato in **regione europea**, `DATABASE_URL` (pooled) e `DIRECT_URL` (diretta) impostate su Vercel
- [ ] `SESSION_SECRET` nuovo, almeno 32 caratteri, **diverso** da quello di sviluppo
- [ ] Primo deploy riuscito (le migrazioni vengono applicate da `vercel-build`)
- [ ] `npm run db:bootstrap` eseguito con `ADMIN_EMAIL` e `ADMIN_PASSWORD`
- [ ] Verificato che **non** esistano gli account di prova (`maria.rossi@example.it` e simili)
- [ ] Password iniziale dell'amministratore cambiata al primo accesso
- [ ] Segnaposto `[DA COMPLETARE]` compilati in `/privacy`
- [ ] Accordi da responsabile del trattamento accettati con Vercel e Neon
- [ ] Valori reali impostati in Amministrazione → Configurazioni
- [ ] Il file `.env` **non** è finito nel repository (è già in `.gitignore`)

## Note di funzionamento

- **Chiudere una giornata non annulla le prenotazioni già accettate.** Impedisce
  solo di prenotarne di nuove: cancellare gruppi già confermati resta una
  decisione esplicita, da prendere dal registro.
- **Il check-in si registra solo dal giorno stesso in poi.** Attesta che qualcuno è
  entrato, quindi sulle giornate future il pulsante non compare e il server rifiuta
  comunque la richiesta. Resta possibile sulle giornate passate, per recuperare un
  ingresso dimenticato. Se una presenza risulta già registrata su una giornata futura,
  il registro la segnala in giallo e si toglie con «Annulla ingresso».
- **La segreteria può prenotare per conto di un socio**, ma con le stesse regole
  che valgono per lui: finestra di tre giorni, capienza, tessera in corso di
  validità. Non esiste una scorciatoia che le aggiri.
- **Un amministratore non può sospendere sé stesso**, per non chiudersi fuori.

## Da fare

- Email di conferma e promemoria (richiede un servizio di invio e un mittente
  verificato).
- Ricerca soci lato database: oggi l'elenco viene filtrato in memoria, scelta
  adeguata a qualche centinaio di tesserati ma da rivedere se cresceranno molto.
