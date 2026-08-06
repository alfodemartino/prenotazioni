import type { StatoForm } from "@/lib/form";

/**
 * Valore da usare come `defaultValue`: quello appena inviato se il salvataggio
 * è fallito, altrimenti quello memorizzato.
 */
export function campo(
  stato: StatoForm,
  nome: string,
  predefinito: string | number | null,
): string {
  const inviato = stato?.valori?.[nome];
  if (inviato !== undefined) return inviato;

  return predefinito === null ? "" : String(predefinito);
}

/**
 * Come `campo`, per le caselle di spunta. Se lo stato contiene un invio, la
 * casella era spuntata solo se compare fra i valori: i checkbox non selezionati
 * non vengono inviati affatto.
 */
export function spunta(stato: StatoForm, nome: string, predefinito: boolean): boolean {
  if (!stato?.valori) return predefinito;
  return stato.valori[nome] !== undefined;
}
