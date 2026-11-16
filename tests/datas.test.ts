import { describe, expect, it } from "vitest";
import {
  adicionarDias,
  diaDaSemana,
  diasEntre,
  ehDataValida,
  formatarDataCurta,
  formatarDataPrevista,
  formatarMesAno,
  hoje,
} from "@/lib/datas";

describe("hoje em São Paulo", () => {
  it("usa o fuso de São Paulo, não o UTC", () => {
    // 02:30 UTC de sábado ainda é sexta-feira 23:30 em São Paulo.
    expect(hoje(new Date("2026-10-24T02:30:00Z"))).toBe("2026-10-23");
    expect(hoje(new Date("2026-10-24T03:30:00Z"))).toBe("2026-10-24");
  });
});

describe("aritmética de datas", () => {
  it("soma dias atravessando mês e ano", () => {
    expect(adicionarDias("2026-10-28", 7)).toBe("2026-11-04");
    expect(adicionarDias("2026-12-30", 3)).toBe("2027-01-02");
    expect(adicionarDias("2027-03-01", -1)).toBe("2027-02-28");
  });

  it("dia da semana (0 = domingo)", () => {
    expect(diaDaSemana("2026-10-25")).toBe(0);
    expect(diaDaSemana("2026-10-28")).toBe(3);
    expect(diaDaSemana("2026-10-24")).toBe(6);
  });

  it("dias entre datas", () => {
    expect(diasEntre("2026-10-24", "2026-12-02")).toBe(39);
    expect(diasEntre("2026-12-02", "2026-10-24")).toBe(-39);
  });

  it("valida datas reais", () => {
    expect(ehDataValida("2027-03-01")).toBe(true);
    expect(ehDataValida("2027-02-30")).toBe(false);
    expect(ehDataValida("01/03/2027")).toBe(false);
  });
});

describe("formatação", () => {
  it("data curta com dia da semana", () => {
    expect(formatarDataCurta("2026-12-02")).toBe("qua, 02/12");
    const semana = ["2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31"];
    expect(semana.map((d) => formatarDataCurta(d).slice(0, 3))).toEqual([
      "dom", "seg", "ter", "qua", "qui", "sex", "sáb",
    ]);
  });

  it("mês e ano", () => {
    expect(formatarMesAno("2026-10-21")).toBe("Outubro de 2026");
  });
});

describe("data prevista", () => {
  it("mostra o ano só quando não é o ano corrente", () => {
    expect(formatarDataPrevista("2026-12-09", "2026-10-24")).toBe("qua, 09/12");
    expect(formatarDataPrevista("2027-03-10", "2026-10-24")).toBe("qua, 10/03/2027");
  });
});
