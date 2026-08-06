import { describe, expect, it } from "vitest";
import { errore, successo, intero, interoOppure, testoOpzionale, booleano } from "@/lib/form";
import { campo, spunta } from "@/components/admin/valori";

function form(coppie: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(coppie)) fd.set(k, v);
  return fd;
}

describe("stato di errore", () => {
  it("restituisce i valori inviati per non far ridigitare il modulo", () => {
    const stato = errore("Email già in uso.", form({ nome: "Anna", email: "a@b.it" }));

    expect(stato).toEqual({
      errore: "Email già in uso.",
      valori: { nome: "Anna", email: "a@b.it" },
    });
  });

  it("non rimanda indietro le password", () => {
    const stato = errore(
      "Errore",
      form({ nome: "Anna", password: "segretissima", nuova: "altra", attuale: "vecchia" }),
    );

    expect(stato?.valori).toEqual({ nome: "Anna" });
    expect(JSON.stringify(stato)).not.toContain("segretissima");
  });

  it("senza FormData non porta con sé alcun valore", () => {
    expect(errore("Errore")).toEqual({ errore: "Errore" });
  });

  it("il successo non trasporta valori", () => {
    expect(successo("Fatto.")).toEqual({ successo: "Fatto." });
  });
});

describe("ripristino dei campi dopo un errore", () => {
  it("preferisce il valore inviato a quello memorizzato", () => {
    const stato = errore("Errore", form({ capienza: "60" }));
    expect(campo(stato, "capienza", 80)).toBe("60");
  });

  it("usa il valore memorizzato quando non c'è stato alcun invio", () => {
    expect(campo(null, "capienza", 80)).toBe("80");
    expect(campo(null, "nota", null)).toBe("");
  });

  it("conserva un campo svuotato di proposito", () => {
    const stato = errore("Errore", form({ nota: "" }));
    expect(campo(stato, "nota", "vecchia nota")).toBe("");
  });

  it("una casella non spuntata non viene inviata, quindi risulta spenta", () => {
    // Il modulo è stato inviato con "aperta" tolta: non deve tornare spuntata.
    const stato = errore("Errore", form({ capienza: "60" }));
    expect(spunta(stato, "aperta", true)).toBe(false);
  });

  it("una casella spuntata resta spuntata", () => {
    const stato = errore("Errore", form({ aperta: "on" }));
    expect(spunta(stato, "aperta", false)).toBe(true);
  });

  it("senza invio vale il valore memorizzato", () => {
    expect(spunta(null, "aperta", true)).toBe(true);
    expect(spunta(null, "aperta", false)).toBe(false);
  });
});

describe("lettura dei campi", () => {
  it("legge gli interi e tronca i decimali", () => {
    const fd = form({ n: "5", decimale: "5.9", vuoto: "", testo: "cinque" });

    expect(intero(fd, "n")).toBe(5);
    expect(intero(fd, "decimale")).toBe(5);
    expect(intero(fd, "vuoto")).toBeNaN();
    expect(intero(fd, "testo")).toBeNaN();
    expect(intero(fd, "assente")).toBeNaN();
  });

  it("applica il valore predefinito quando il campo è vuoto", () => {
    const fd = form({ vuoto: "", n: "3" });

    expect(interoOppure(fd, "vuoto", 7)).toBe(7);
    expect(interoOppure(fd, "assente", 7)).toBe(7);
    expect(interoOppure(fd, "n", 7)).toBe(3);
  });

  it("trasforma il testo vuoto in null", () => {
    const fd = form({ nota: "   ", piena: " ciao " });

    expect(testoOpzionale(fd, "nota")).toBeNull();
    expect(testoOpzionale(fd, "piena")).toBe("ciao");
  });

  it("legge le caselle di spunta dalla loro presenza", () => {
    const fd = form({ aperta: "on" });

    expect(booleano(fd, "aperta")).toBe(true);
    expect(booleano(fd, "chiusa")).toBe(false);
  });
});
