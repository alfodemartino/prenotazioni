import Link from "next/link";
import { leggiImpostazioni } from "@/lib/impostazioni";

export const dynamic = "force-dynamic";

/**
 * Informativa sul trattamento dei dati personali.
 *
 * Il testo descrive fedelmente ciò che l'applicazione fa davvero. I segnaposto
 * fra parentesi quadre riguardano dati che solo il circolo conosce (denominazione,
 * sede, tempi di conservazione) e vanno compilati prima della pubblicazione,
 * possibilmente facendo rileggere il tutto a chi segue la privacy per l'ente.
 */

const DA_COMPLETARE = "[DA COMPLETARE]";

function Sezione({ titolo, children }: { titolo: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-2 text-lg font-semibold text-slate-900">{titolo}</h2>
      <div className="space-y-3 text-slate-700">{children}</div>
    </section>
  );
}

export default async function PaginaPrivacy() {
  const imp = await leggiImpostazioni();

  return (
    <main className="mx-auto max-w-2xl px-5 py-10 pb-20">
      <Link
        href="/login"
        className="mb-6 inline-block text-sm font-medium text-sky-700 underline-offset-2 hover:underline"
      >
        ← Torna all'accesso
      </Link>

      <h1 className="text-2xl font-bold text-slate-900">Informativa sulla privacy</h1>
      <p className="mt-2 text-slate-600">
        Come {imp.nomeCircolo} tratta i dati personali di chi usa il servizio di
        prenotazione degli accessi in piscina, ai sensi degli articoli 13 e 14 del
        Regolamento (UE) 2016/679.
      </p>

      <Sezione titolo="Titolare del trattamento">
        <p>
          {DA_COMPLETARE} denominazione completa dell&apos;ente, sede legale, codice
          fiscale e indirizzo email di contatto per le questioni relative ai dati
          personali.
        </p>
      </Sezione>

      <Sezione titolo="Quali dati raccogliamo">
        <p>Per gestire le prenotazioni trattiamo:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>nome, cognome, indirizzo email e numero di tessera;</li>
          <li>numero di telefono, se lo fornisci;</li>
          <li>la data di scadenza della tessera;</li>
          <li>
            le tue prenotazioni: giornata, numero di adulti, bambini e ospiti che ti
            accompagnano;
          </li>
          <li>
            l&apos;eventuale registrazione dell&apos;ingresso effettivo alla reception;
          </li>
          <li>
            eventuali note inserite dalla segreteria a fini organizzativi;
          </li>
          <li>
            in caso di accessi falliti, il tuo indirizzo email e l&apos;indirizzo di rete
            da cui è arrivato il tentativo.
          </li>
        </ul>
        <p>
          Gli accompagnatori vengono conteggiati come numero: di loro non registriamo
          né il nome né alcun altro dato.
        </p>
      </Sezione>

      <Sezione titolo="Perché li trattiamo">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <strong>Gestire gli accessi alla piscina</strong> e non superare la capienza
            consentita: il trattamento è necessario per dare esecuzione al rapporto
            associativo.
          </li>
          <li>
            <strong>Sapere chi è presente in struttura</strong>, anche per ragioni di
            sicurezza e soccorso.
          </li>
          <li>
            <strong>Proteggere l&apos;accesso all&apos;applicazione</strong> registrando i
            tentativi falliti: è nostro legittimo interesse impedire che qualcuno provi a
            entrare nell&apos;account di un socio.
          </li>
          <li>
            <strong>Verificare i requisiti per l&apos;accesso</strong>, come la validità
            della tessera.
          </li>
        </ul>
      </Sezione>

      <Sezione titolo="Per quanto tempo li conserviamo">
        <p>
          I dati dei tentativi di accesso falliti vengono cancellati automaticamente entro
          ventiquattro ore.
        </p>
        <p>
          {DA_COMPLETARE} tempi di conservazione dell&apos;anagrafica e dello storico delle
          prenotazioni, coerenti con la durata del rapporto associativo e con gli obblighi
          contabili e assicurativi dell&apos;ente.
        </p>
      </Sezione>

      <Sezione titolo="Chi può accedere ai dati">
        <p>
          Solo il personale di segreteria autorizzato. I dati sono conservati su server di
          fornitori che agiscono come responsabili del trattamento per nostro conto.
        </p>
        <p>
          {DA_COMPLETARE} indicare i fornitori effettivamente utilizzati per
          l&apos;hosting dell&apos;applicazione e del database, la collocazione dei server e
          gli estremi degli accordi sottoscritti con loro.
        </p>
        <p>Non vendiamo i dati e non li usiamo per finalità pubblicitarie.</p>
      </Sezione>

      <Sezione titolo="I tuoi diritti">
        <p>
          Puoi chiedere in qualsiasi momento di accedere ai tuoi dati, correggerli,
          cancellarli, limitarne il trattamento, riceverli in formato leggibile o opporti
          al trattamento fondato sul legittimo interesse. Puoi inoltre proporre reclamo al
          Garante per la protezione dei dati personali.
        </p>
        <p>
          Per esercitarli scrivi a: {DA_COMPLETARE} indirizzo email dedicato.
        </p>
      </Sezione>

      <Sezione titolo="Decisioni automatizzate">
        <p>
          La disponibilità di una giornata è calcolata automaticamente in base ai posti
          residui, ma non viene presa nessuna decisione automatizzata che produca effetti
          giuridici sulla tua persona: la segreteria può sempre intervenire manualmente.
        </p>
      </Sezione>

      <p className="mt-10 text-sm text-slate-500">
        Ultimo aggiornamento: {DA_COMPLETARE} data.
      </p>
    </main>
  );
}
