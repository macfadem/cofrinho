import { describe, expect, it } from "vitest";
import {
  formatarBRL,
  formatarComSinal,
  formatarSemSimbolo,
  lerValor,
} from "@/lib/dinheiro";

// O Intl separa "R$" do número com espaço não separável (U+00A0).
const nb = (texto: string) => texto.replace(" ", " ");

describe("leitura de valores", () => {
  it.each([
    ["1999", 199900],
    ["1.999", 199900],
    ["1.999,90", 199990],
    ["R$ 1.999,90", 199990],
    ["R$1.999,90", 199990],
    [nb("R$ 1.999,90"), 199990],
    ["  70 ", 7000],
    ["19,9", 1990],
    ["19,99", 1999],
    ["0,50", 50],
    [",5", 50],
    ["10,", 1000],
    ["0", 0],
    ["1.234.567,89", 123456789],
    ["19.90", 1990],
    ["19.9", 1990],
  ])("%j → %i centavos", (texto, esperado) => {
    expect(lerValor(texto)).toBe(esperado);
  });

  it.each(["", "abc", "1,999", "1.99.9", "12.3456", "1,2,3", "R$", "-50", "1.999,9a"])(
    "rejeita %j",
    (texto) => {
      expect(lerValor(texto)).toBeNull();
    },
  );

  it("aceita negativos só quando permitido", () => {
    expect(lerValor("-50", { permitirNegativo: true })).toBe(-5000);
    expect(lerValor("−R$ 50,00", { permitirNegativo: true })).toBe(-5000);
    expect(lerValor("R$ -1.000,50", { permitirNegativo: true })).toBe(-100050);
    expect(lerValor("--50", { permitirNegativo: true })).toBeNull();
  });

  it("recusa valores absurdos", () => {
    expect(lerValor("999999999999")).toBeNull();
  });
});

describe("formatação", () => {
  it("formata em reais", () => {
    expect(formatarBRL(199990)).toBe(nb("R$ 1.999,90"));
    expect(formatarBRL(0)).toBe(nb("R$ 0,00"));
    expect(formatarSemSimbolo(199990)).toBe("1.999,90");
  });

  it("mostra o sinal", () => {
    expect(formatarComSinal(15000)).toBe(nb("+R$ 150,00"));
    expect(formatarComSinal(-7000)).toBe(nb("−R$ 70,00"));
  });

  it("ida e volta: formatar e ler dá o mesmo valor", () => {
    for (const v of [0, 1, 99, 100, 7000, 199990, 864900]) {
      expect(lerValor(formatarBRL(v))).toBe(v);
      expect(lerValor(formatarSemSimbolo(v))).toBe(v);
    }
  });
});
