import { describe, expect, it } from "vitest";
import { analizzaCsv, rilevaSeparatore } from "@/lib/csv";

describe("rilevamento del separatore", () => {
  it("sceglie il punto e virgola, come Excel italiano", () => {
    expect(rilevaSeparatore("Nome;Cognome;Email")).toBe(";");
  });

  it("sceglie la virgola quando è chiaramente quella usata", () => {
    expect(rilevaSeparatore("Nome,Cognome,Email")).toBe(",");
  });

  it("non si fa ingannare dalle virgole dentro le virgolette", () => {
    expect(rilevaSeparatore('"Rossi, Maria";Email')).toBe(";");
  });

  it("in mancanza di separatori ripiega sul punto e virgola", () => {
    expect(rilevaSeparatore("Nome")).toBe(";");
  });
});

describe("lettura del CSV", () => {
  it("legge una griglia semplice", () => {
    expect(analizzaCsv("a;b\n1;2")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("toglie il BOM, altrimenti la prima intestazione non verrebbe riconosciuta", () => {
    const [intestazioni] = analizzaCsv("﻿Numero tessera;Nome");
    expect(intestazioni[0]).toBe("Numero tessera");
  });

  it("regge le righe terminate con CRLF", () => {
    expect(analizzaCsv("a;b\r\n1;2\r\n")).toEqual([
      ["a", "b"],
      ["1", "2"],
    ]);
  });

  it("scarta la riga vuota che Excel lascia in fondo", () => {
    expect(analizzaCsv("a;b\n1;2\n\n")).toHaveLength(2);
  });

  it("conserva il separatore contenuto in una cella fra virgolette", () => {
    expect(analizzaCsv('nome;note\nMaria;"tessera 1;2"')).toEqual([
      ["nome", "note"],
      ["Maria", "tessera 1;2"],
    ]);
  });

  it("interpreta le virgolette raddoppiate come una virgoletta sola", () => {
    expect(analizzaCsv('nota\n"ha detto ""si"""')).toEqual([["nota"], ['ha detto "si"']]);
  });

  it("regge un a capo dentro una cella fra virgolette", () => {
    expect(analizzaCsv('nota\n"prima\nseconda"')).toEqual([["nota"], ["prima\nseconda"]]);
  });

  it("ripulisce gli spazi attorno alle celle", () => {
    expect(analizzaCsv("  nome ;  cognome  ")).toEqual([["nome", "cognome"]]);
  });

  it("su un file vuoto non restituisce righe", () => {
    expect(analizzaCsv("")).toEqual([]);
  });
});
