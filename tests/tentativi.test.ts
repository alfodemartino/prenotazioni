import { describe, expect, it } from "vitest";
import {
  POLITICA_ACCOUNT,
  bloccoFinoA,
  bloccoPiuRestrittivo,
  messaggioBlocco,
  minutiDiAttesa,
  type Politica,
} from "@/lib/tentativi";

const ADESSO = new Date("2026-08-06T14:00:00Z");
const POLITICA: Politica = { limite: 5, finestraMinuti: 15 };

/** Istante di N minuti fa. */
function minutiFa(n: number): Date {
  return new Date(ADESSO.getTime() - n * 60_000);
}

/** N fallimenti, uno per ciascun minuto indicato. */
function fallimenti(...minuti: number[]): Date[] {
  return minuti.map(minutiFa);
}

describe("blocco per troppi tentativi", () => {
  it("non blocca chi non ha mai sbagliato", () => {
    expect(bloccoFinoA([], POLITICA, ADESSO)).toBeNull();
  });

  it("lascia passare fino a un tentativo prima del limite", () => {
    expect(bloccoFinoA(fallimenti(1, 2, 3, 4), POLITICA, ADESSO)).toBeNull();
  });

  it("blocca appena il limite viene raggiunto", () => {
    expect(bloccoFinoA(fallimenti(1, 2, 3, 4, 5), POLITICA, ADESSO)).not.toBeNull();
  });

  it("ignora i fallimenti usciti dalla finestra", () => {
    // Cinque errori, ma tre risalgono a più di un quarto d'ora fa.
    expect(bloccoFinoA(fallimenti(1, 2, 20, 30, 40), POLITICA, ADESSO)).toBeNull();
  });

  it("si scioglie quando il fallimento decisivo esce dalla finestra", () => {
    // Il quinto errore più recente è di 5 minuti fa: il blocco dura altri 10 minuti.
    const fine = bloccoFinoA(fallimenti(1, 2, 3, 4, 5), POLITICA, ADESSO)!;
    expect(minutiDiAttesa(fine, ADESSO)).toBe(10);
  });

  it("i fallimenti più vecchi non prolungano il blocco", () => {
    // Aggiungerne di anteriori non cambia la scadenza: conta il quinto più recente.
    const conVecchi = bloccoFinoA(fallimenti(1, 2, 3, 4, 5, 6, 7, 8), POLITICA, ADESSO)!;
    const senza = bloccoFinoA(fallimenti(1, 2, 3, 4, 5), POLITICA, ADESSO)!;

    expect(conVecchi.getTime()).toBe(senza.getTime());
  });

  it("un nuovo tentativo fallito allunga l'attesa", () => {
    const prima = bloccoFinoA(fallimenti(2, 3, 4, 5, 6), POLITICA, ADESSO)!;
    const dopo = bloccoFinoA(fallimenti(0, 2, 3, 4, 5), POLITICA, ADESSO)!;

    expect(dopo.getTime()).toBeGreaterThan(prima.getTime());
  });

  it("scarta i fallimenti esattamente sul bordo della finestra", () => {
    expect(bloccoFinoA(fallimenti(15, 15, 15, 15, 15), POLITICA, ADESSO)).toBeNull();
  });

  it("non dipende dall'ordine in cui arrivano i fallimenti", () => {
    const ordinati = bloccoFinoA(fallimenti(1, 2, 3, 4, 5), POLITICA, ADESSO)!;
    const sparsi = bloccoFinoA(fallimenti(3, 5, 1, 4, 2), POLITICA, ADESSO)!;

    expect(sparsi.getTime()).toBe(ordinati.getTime());
  });
});

describe("politica predefinita per account", () => {
  it("tollera quattro errori e blocca al quinto", () => {
    expect(bloccoFinoA(fallimenti(1, 2, 3, 4), POLITICA_ACCOUNT, ADESSO)).toBeNull();
    expect(bloccoFinoA(fallimenti(1, 2, 3, 4, 5), POLITICA_ACCOUNT, ADESSO)).not.toBeNull();
  });
});

describe("attesa residua", () => {
  it("arrotonda per eccesso", () => {
    const fine = new Date(ADESSO.getTime() + 61_000); // un minuto e un secondo
    expect(minutiDiAttesa(fine, ADESSO)).toBe(2);
  });

  it("non scende mai sotto il minuto", () => {
    const fine = new Date(ADESSO.getTime() + 1_000);
    expect(minutiDiAttesa(fine, ADESSO)).toBe(1);
  });

  it("declina il messaggio al singolare e al plurale", () => {
    expect(messaggioBlocco(1)).toContain("un minuto");
    expect(messaggioBlocco(10)).toContain("10 minuti");
  });

  it("il messaggio non rivela se l'account esiste", () => {
    const m = messaggioBlocco(5).toLowerCase();
    expect(m).not.toContain("email");
    expect(m).not.toContain("password errata");
  });
});

describe("più limiti insieme", () => {
  it("vince il blocco che finisce più tardi", () => {
    const vicino = new Date(ADESSO.getTime() + 2 * 60_000);
    const lontano = new Date(ADESSO.getTime() + 9 * 60_000);

    expect(bloccoPiuRestrittivo(vicino, lontano)).toEqual(lontano);
    expect(bloccoPiuRestrittivo(lontano, null)).toEqual(lontano);
  });

  it("senza alcun blocco si passa", () => {
    expect(bloccoPiuRestrittivo(null, null)).toBeNull();
    expect(bloccoPiuRestrittivo()).toBeNull();
  });
});
