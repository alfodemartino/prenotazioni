"use client";

import { useActionState } from "react";
import { salvaConfigurazioni } from "@/app/admin/azioni";
import Avviso from "./Avviso";
import { campo, spunta } from "./valori";
import { AIUTO, BOTTONE_PRIMARIO, ETICHETTA, INPUT, RIQUADRO } from "./stili";

export interface ValoriConfigurazioni {
  nomeCircolo: string;
  capienzaAdultiDefault: number;
  overbookingPct: number;
  giorniFinestra: number;
  oraAperturaDefault: string;
  oraChiusuraDefault: string;
  tariffaOspiteAdulto: string;
  tariffaOspiteBambino: string;
  sogliaUltimiPosti: number;
  maxPersonePerPrenotazione: number;
  controlloCertificato: boolean;
}

function Sezione({
  titolo,
  descrizione,
  children,
}: {
  titolo: string;
  descrizione: string;
  children: React.ReactNode;
}) {
  return (
    <section className={RIQUADRO}>
      <h2 className="font-semibold text-slate-900">{titolo}</h2>
      <p className="mt-0.5 mb-4 text-sm text-slate-500">{descrizione}</p>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

export default function FormConfigurazioni({ valori }: { valori: ValoriConfigurazioni }) {
  const [stato, azione, inCorso] = useActionState(salvaConfigurazioni, null);

  // Dopo un errore React svuota il modulo: si riparte da ciò che era stato inviato.
  const v = (nome: keyof ValoriConfigurazioni) =>
    campo(stato, nome, valori[nome] as string | number);

  return (
    <form action={azione} className="space-y-5">
      <Sezione
        titolo="Circolo"
        descrizione="Come si chiama la struttura nelle schermate dei soci."
      >
        <div className="sm:col-span-2">
          <label htmlFor="nomeCircolo" className={ETICHETTA}>
            Nome del circolo
          </label>
          <input
            id="nomeCircolo"
            name="nomeCircolo"
            required
            defaultValue={v("nomeCircolo")}
            className={INPUT}
          />
        </div>
      </Sezione>

      <Sezione
        titolo="Capienza"
        descrizione="Valori applicati alle giornate non personalizzate dal calendario. Ricorda: solo gli adulti tesserati occupano posti."
      >
        <div>
          <label htmlFor="capienzaAdultiDefault" className={ETICHETTA}>
            Capienza adulti al giorno
          </label>
          <input
            id="capienzaAdultiDefault"
            name="capienzaAdultiDefault"
            type="number"
            min={0}
            required
            defaultValue={v("capienzaAdultiDefault")}
            className={INPUT}
          />
        </div>

        <div>
          <label htmlFor="overbookingPct" className={ETICHETTA}>
            Overbooking (%)
          </label>
          <input
            id="overbookingPct"
            name="overbookingPct"
            type="number"
            min={0}
            max={100}
            required
            defaultValue={v("overbookingPct")}
            className={INPUT}
          />
          <p className={AIUTO}>
            Con {valori.capienzaAdultiDefault} posti e {valori.overbookingPct}% il limite reale è{" "}
            {Math.floor(valori.capienzaAdultiDefault * (1 + valori.overbookingPct / 100))}.
          </p>
        </div>

        <div>
          <label htmlFor="sogliaUltimiPosti" className={ETICHETTA}>
            Soglia «ultimi posti»
          </label>
          <input
            id="sogliaUltimiPosti"
            name="sogliaUltimiPosti"
            type="number"
            min={0}
            required
            defaultValue={v("sogliaUltimiPosti")}
            className={INPUT}
          />
          <p className={AIUTO}>Sotto questo numero di posti liberi il socio vede l'avviso.</p>
        </div>

        <div>
          <label htmlFor="maxPersonePerPrenotazione" className={ETICHETTA}>
            Massimo persone per prenotazione
          </label>
          <input
            id="maxPersonePerPrenotazione"
            name="maxPersonePerPrenotazione"
            type="number"
            min={1}
            required
            defaultValue={v("maxPersonePerPrenotazione")}
            className={INPUT}
          />
          <p className={AIUTO}>Adulti, bambini e ospiti sommati. Serve contro i refusi.</p>
        </div>
      </Sezione>

      <Sezione
        titolo="Orari e finestra di prenotazione"
        descrizione="Quando si può prenotare e fino a quando resta aperta la giornata corrente."
      >
        <div>
          <label htmlFor="oraAperturaDefault" className={ETICHETTA}>
            Apertura
          </label>
          <input
            id="oraAperturaDefault"
            name="oraAperturaDefault"
            type="time"
            required
            defaultValue={v("oraAperturaDefault")}
            className={INPUT}
          />
        </div>

        <div>
          <label htmlFor="oraChiusuraDefault" className={ETICHETTA}>
            Chiusura
          </label>
          <input
            id="oraChiusuraDefault"
            name="oraChiusuraDefault"
            type="time"
            required
            defaultValue={v("oraChiusuraDefault")}
            className={INPUT}
          />
          <p className={AIUTO}>Dopo quest'ora non si prenota più per il giorno stesso.</p>
        </div>

        <div>
          <label htmlFor="giorniFinestra" className={ETICHETTA}>
            Giorni prenotabili oltre oggi
          </label>
          <input
            id="giorniFinestra"
            name="giorniFinestra"
            type="number"
            min={0}
            max={30}
            required
            defaultValue={v("giorniFinestra")}
            className={INPUT}
          />
          <p className={AIUTO}>
            Con {valori.giorniFinestra} il socio vede{" "}
            {valori.giorniFinestra === 0
              ? "solo la giornata di oggi"
              : `oggi e i ${valori.giorniFinestra} giorni successivi`}
            .
          </p>
        </div>
      </Sezione>

      <Sezione
        titolo="Ospiti"
        descrizione="Importi mostrati al socio in fase di prenotazione. Si pagano in contanti alla reception: il sistema non tiene il registro di cassa."
      >
        <div>
          <label htmlFor="tariffaOspiteAdulto" className={ETICHETTA}>
            Tariffa ospite adulto
          </label>
          <input
            id="tariffaOspiteAdulto"
            name="tariffaOspiteAdulto"
            inputMode="decimal"
            required
            defaultValue={v("tariffaOspiteAdulto")}
            className={INPUT}
          />
          <p className={AIUTO}>In euro, ad esempio 10,00.</p>
        </div>

        <div>
          <label htmlFor="tariffaOspiteBambino" className={ETICHETTA}>
            Tariffa ospite bambino
          </label>
          <input
            id="tariffaOspiteBambino"
            name="tariffaOspiteBambino"
            inputMode="decimal"
            required
            defaultValue={v("tariffaOspiteBambino")}
            className={INPUT}
          />
        </div>
      </Sezione>

      <Sezione
        titolo="Controlli sui soci"
        descrizione="La tessera scaduta blocca sempre le prenotazioni; il certificato solo se lo attivi qui."
      >
        <label className="flex items-start gap-3 sm:col-span-2">
          <input
            type="checkbox"
            name="controlloCertificato"
            defaultChecked={spunta(stato, "controlloCertificato", valori.controlloCertificato)}
            className="mt-1 h-5 w-5 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
          />
          <span>
            <span className="font-medium text-slate-900">
              Blocca chi ha il certificato medico scaduto
            </span>
            <span className={AIUTO}>
              Si applica solo ai soci che hanno una data di scadenza registrata.
            </span>
          </span>
        </label>
      </Sezione>

      <Avviso stato={stato} />

      <button type="submit" disabled={inCorso} className={BOTTONE_PRIMARIO}>
        {inCorso ? "Salvataggio…" : "Salva le configurazioni"}
      </button>
    </form>
  );
}
