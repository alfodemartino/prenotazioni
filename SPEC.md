# Prenotazioni Piscina — Specifica funzionale

App web mobile-first per la prenotazione dell'accesso giornaliero alla piscina di un
circolo riservato ai soci tesserati.

---

## 1. Concetti di dominio

| Concetto | Significato |
|---|---|
| **Socio** | Tesserato con account creato dall'amministrazione. È l'unico che può prenotare. |
| **Giornata** | Unità prenotabile. Non esistono fasce orarie: si prenota l'intera giornata. |
| **Prenotazione** | Un socio dichiara, per una giornata, quanti **adulti**, **bambini** e **ospiti** accederanno. |
| **Ospite** | Non tesserato, accompagnato da un socio. Paga in contanti alla reception. |
| **Capienza** | Numero massimo di **adulti tesserati** ammessi in una giornata. |

### Chi consuma capienza

Solo il campo `adulti` (tesserati adulti) riduce i posti disponibili.
Bambini e ospiti vengono registrati — servono a sapere quante persone sono
effettivamente in struttura e a calcolare il dovuto indicativo — ma **non**
sottraggono posti.

---

## 2. Motore di disponibilità

```
occupati(g)      = Σ adulti  su prenotazioni ATTIVE del giorno g
limite(g)        = floor( capienza(g) × (1 + overbooking%) )
residui(g)       = limite(g) − occupati(g)

prenotabile(g) ⟺ g ∈ [oggi, oggi+2]                    // finestra scorrevole
               ∧ stato(g) = APERTO                      // non chiuso dall'admin
               ∧ (g > oggi ∨ adesso < oraChiusura(g))   // per oggi: fino alla chiusura
               ∧ adultiRichiesti ≤ residui(g)
               ∧ socio abilitato                        // vedi §3
```

**Fuso orario**: tutti i confronti su "oggi" e sugli orari usano `Europe/Rome`,
mai UTC. Le date-giornata sono valori `DATE` puri, senza componente oraria.

**Overbooking**: percentuale configurabile (default `10%`). Al socio viene mostrato
solo *Disponibile / Ultimi posti / Esaurito*; l'admin vede il dato reale
(`occupati / capienza`, con evidenza quando si è oltre il 100%).

**Concorrenza**: il controllo capienza e l'inserimento avvengono in un'unica
transazione con lock sulla riga della giornata. Senza questo, due prenotazioni
simultanee possono superare il limite.

---

## 3. Regole sul socio

Un socio può prenotare se:

- stato = `ATTIVO` (non sospeso);
- tessera non scaduta.

Quando una condizione decade, le prenotazioni **future già confermate restano valide**
(la revoca è una decisione dell'admin, non un effetto automatico).

**Una sola prenotazione attiva per socio per giornata.** Prenotare di nuovo lo stesso
giorno significa modificare quella esistente. Il vincolo è imposto dal database, non
dal codice applicativo: la colonna `slotAttivo` vale la data finché la prenotazione è
attiva e diventa NULL quando viene annullata, e l'indice unico su `(socio, slotAttivo)`
sfrutta il fatto che in SQL due NULL non collidono mai. Così le prenotazioni annullate
restano nello storico senza impedire al socio di riprenotare la stessa giornata.

---

## 4. Ciclo di vita della prenotazione

Gli stati memorizzati sono due soli — `ATTIVA` e `ANNULLATA` — e solo `ATTIVA`
consuma capienza. La presenza **non** è uno stato: si deduce dal momento del
check-in, così non esiste il rischio di uno stato "presente" che dimentichi di
occupare il posto.

```
   crea ─────▶ ATTIVA ─────────────────────▶ (check-in registrato) ─▶ presente
                 │
                 ├─ modifica dei numeri  → resta ATTIVA
                 └─ annulla              → ANNULLATA, posti liberati subito

   ATTIVA + giornata conclusa + nessun check-in  →  no-show
```

- **Modifica e annullamento sono liberi** fino al termine della giornata stessa.
- Aumentare gli adulti richiede di ripassare il controllo capienza; diminuirli
  libera immediatamente i posti.
- Le giornate passate sono in sola lettura per il socio.
- Il no-show non comporta penalità: serve alle statistiche e a tarare la
  percentuale di overbooking.

---

## 5. Tariffe ospiti

L'admin configura due importi: **ospite adulto** e **ospite bambino**.
In fase di prenotazione il socio vede il totale indicativo da pagare in contanti
("Da pagare in cassa: € 24,00"). Il sistema **non** tiene un registro di cassa e
non traccia gli incassi.

---

## 6. Interfaccia socio (mobile-first)

1. **Accesso** — email + password. Credenziali create dall'admin, cambio password al primo accesso.
2. **Home** — tre schede: *Oggi*, *Domani*, *Dopodomani*. Ognuna mostra data, stato
   della giornata e, se già prenotata, il riepilogo del gruppo.
3. **Nuova prenotazione** — selettori `+ / −` per adulti, bambini, ospiti adulti,
   ospiti bambini; totale persone; costo indicativo ospiti; conferma.
4. **Le mie prenotazioni** — prenotazioni attive (modificabili/annullabili) e storico.

Stati mostrati sulla scheda giornata:

| Stato | Condizione |
|---|---|
| `Chiusa` | giornata chiusa dall'admin |
| `Non più prenotabile` | è oggi e la piscina ha chiuso |
| `Esaurita` | residui ≤ 0 |
| `Ultimi posti` | residui ≤ soglia (default 5) |
| `Disponibile` | altrimenti |

---

## 7. Interfaccia amministratore

1. **Registro del giorno** — elenco prenotazioni, totale atteso (adulti / bambini /
   ospiti), check-in con spunta e correzione dei numeri effettivi all'ingresso.
2. **Calendario** — capienza per singolo giorno, chiusure straordinarie (manutenzione,
   meteo, festività), orari di apertura, valore di overbooking.
3. **Soci** — creazione e modifica anagrafiche, sospensione, scadenza tessera,
   reset password, prenotazione per conto del socio.
4. **Report** — affluenza per giorno, ospiti portati per socio, tasso di no-show,
   occupazione media, esportazione CSV.

---

## 8. Modello dati

```
Socio            id, numeroTessera, nome, cognome, email, passwordHash,
                 ruolo (SOCIO | ADMIN), stato (ATTIVO | SOSPESO),
                 scadenzaTessera, telefono, note

Giornata         data (PK), stato (APERTO | CHIUSO), capienzaAdulti,
                 overbookingPct, oraApertura, oraChiusura, nota
                 → se assente, si applicano i valori di default delle impostazioni

Prenotazione     id, socioId, data, adulti, bambini, ospitiAdulti, ospitiBambini,
                 stato (ATTIVA | ANNULLATA), slotAttivo,
                 creataIl, aggiornataIl, annullataIl,
                 checkInIl, adultiEffettivi, bambiniEffettivi, ospitiEffettivi
                 UNIQUE (socioId, slotAttivo)

Impostazioni     capienzaDefault, overbookingPct, giorniFinestra (2),
                 oraAperturaDefault, oraChiusuraDefault,
                 tariffaOspiteAdulto, tariffaOspiteBambino,
                 sogliaUltimiPosti
```

**Vincoli di validazione**: `adulti ≥ 1` (il socio prenotante è incluso nel conteggio),
gli altri campi `≥ 0`, con un tetto per prenotazione (default 20) contro gli errori di battitura.

---

## 9. Punti aperti

- **Valori definitivi** da concordare con il circolo: capienza giornaliera,
  percentuale di overbooking, orari di apertura, tariffe ospiti. Sono tutti
  modificabili da Amministrazione → Configurazioni, senza toccare il codice.
- **Email di conferma e promemoria**: richiedono un servizio di invio esterno
  (es. Resend) e un mittente verificato. Rimandabile a dopo il primo rilascio.
