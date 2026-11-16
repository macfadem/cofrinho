import { describe, expect, it } from "vitest";
import {
  aportesDesdeAoMudarDia,
  cicloAtual,
  estadoDoAporte,
  inicioDosAportes,
} from "@/lib/plano";

const QUARTA = 3;
// 24/10/2026 é sábado; a quarta anterior é 21/10 e a próxima, 28/10.
const SABADO = "2026-10-24";

describe("cicloAtual", () => {
  it("é a quarta mais recente antes de hoje", () => {
    expect(cicloAtual(SABADO, QUARTA)).toBe("2026-10-21");
  });

  it("é o próprio dia quando hoje é dia de aporte", () => {
    expect(cicloAtual("2026-10-28", QUARTA)).toBe("2026-10-28");
  });

  it("funciona com qualquer dia da semana", () => {
    expect(cicloAtual(SABADO, 6)).toBe(SABADO);
    expect(cicloAtual(SABADO, 0)).toBe("2026-10-18");
  });
});

describe("aporte pendente vs. feito", () => {
  const base = {
    hoje: SABADO,
    diaAporte: QUARTA,
    aporteSemanal: 15000,
    aportesDesde: null,
  };

  it("pendente quando não há aporte desde a quarta: o próximo é hoje", () => {
    const e = estadoDoAporte({ ...base, ultimoAporte: "2026-10-14" });
    expect(e).toEqual({ ciclo: "2026-10-21", pendente: true, proximo: SABADO });
  });

  it("pendente quando nunca houve aporte", () => {
    expect(estadoDoAporte({ ...base, ultimoAporte: null }).pendente).toBe(true);
  });

  it("feito quando há aporte no dia do ciclo: o próximo é a quarta seguinte", () => {
    const e = estadoDoAporte({ ...base, ultimoAporte: "2026-10-21" });
    expect(e).toEqual({ ciclo: "2026-10-21", pendente: false, proximo: "2026-10-28" });
  });

  it("feito quando o aporte veio depois do ciclo (atrasado)", () => {
    expect(estadoDoAporte({ ...base, ultimoAporte: "2026-10-23" }).pendente).toBe(false);
  });

  it("nunca pendente com aporte semanal zero", () => {
    expect(estadoDoAporte({ ...base, aporteSemanal: 0, ultimoAporte: null }).pendente).toBe(false);
  });

  it("respeita o início dos aportes definido no primeiro uso", () => {
    const jaGuardado = inicioDosAportes(SABADO, QUARTA, true);
    expect(jaGuardado).toBe("2026-10-28");
    const e = estadoDoAporte({ ...base, ultimoAporte: null, aportesDesde: jaGuardado });
    expect(e).toEqual({ ciclo: "2026-10-21", pendente: false, proximo: "2026-10-28" });

    // Na quarta seguinte, o aporte passa a ser cobrado.
    const naQuarta = estadoDoAporte({ ...base, hoje: "2026-10-28", ultimoAporte: null, aportesDesde: jaGuardado });
    expect(naQuarta.pendente).toBe(true);

    const aindaNao = inicioDosAportes(SABADO, QUARTA, false);
    expect(aindaNao).toBe("2026-10-21");
    expect(estadoDoAporte({ ...base, ultimoAporte: null, aportesDesde: aindaNao }).pendente).toBe(true);
  });
});

describe("mudar o dia do aporte", () => {
  const SEXTA = 5;
  const emDia = {
    hoje: SABADO,
    diaAporte: QUARTA,
    aporteSemanal: 15000,
    ultimoAporte: "2026-10-21",
    aportesDesde: null,
  };

  it("com a semana em dia, o novo dia não vira pendência", () => {
    const aportesDesde = aportesDesdeAoMudarDia(emDia, SEXTA);
    expect(aportesDesde).toBe("2026-10-30");
    const depois = estadoDoAporte({ ...emDia, diaAporte: SEXTA, aportesDesde });
    expect(depois).toEqual({ ciclo: "2026-10-23", pendente: false, proximo: "2026-10-30" });
  });

  it("com o aporte pendente, continua pendente no novo dia", () => {
    const pendente = { ...emDia, ultimoAporte: "2026-10-14" };
    const aportesDesde = aportesDesdeAoMudarDia(pendente, SEXTA);
    expect(aportesDesde).toBeNull();
    expect(estadoDoAporte({ ...pendente, diaAporte: SEXTA, aportesDesde }).pendente).toBe(true);
  });

  it("sem mudar o dia, nada muda", () => {
    expect(aportesDesdeAoMudarDia(emDia, QUARTA)).toBeNull();
  });
});

// --- Plano de compras -----------------------------------------------------------------

import {
  aporteParaData,
  formatarPrazo,
  impactoDeComprarAgora,
  preverItens,
  projecaoDoSaldo,
  resumirAlvos,
  semanasPara,
} from "@/lib/plano";

const W = 15000; // R$ 150,00 por semana
const FEITO = { hoje: SABADO, aporteSemanal: W, primeiroAporte: "2026-10-28" }; // aporte da semana já feito
const PENDENTE = { hoje: SABADO, aporteSemanal: W, primeiroAporte: SABADO }; // F = hoje

const AIRPODS = { id: 1, preco: 199900, alvo: true };
const VIAGEM = { id: 2, preco: 200000, alvo: true, dataDesejada: "2027-03-01" };
const LIMPEZA = { id: 3, preco: 18000, alvo: false };
const CABO = { id: 4, preco: 7000, alvo: false };

describe("alvo já pago", () => {
  it("cabe no saldo: agora, hoje e barra cheia", () => {
    const [p] = preverItens([AIRPODS], { ...FEITO, saldo: 250000 });
    expect(p).toMatchObject({ semanas: 0, data: SABADO, alocado: 199900, acumulado: 199900 });
  });
});

describe("vários alvos", () => {
  const ctx = { ...FEITO, saldo: 100000 };
  // Na lista, a limpeza vem antes da viagem, mas os alvos vêm primeiro no plano.
  const previsoes = preverItens([AIRPODS, LIMPEZA, VIAGEM], ctx);

  it("acumula os preços na ordem dos alvos e calcula semanas e datas", () => {
    expect(previsoes.map((p) => [p.id, p.acumulado, p.semanas, p.data])).toEqual([
      [1, 199900, 7, "2026-12-09"],
      [2, 399900, 20, "2027-03-10"],
      [3, 417900, 22, "2027-03-24"],
    ]);
  });

  it("resume quando dá para comprar todos os alvos", () => {
    expect(resumirAlvos(previsoes)).toEqual({ quantidade: 2, total: 399900, semanas: 20, data: "2027-03-10" });
  });

  it("sem alvos não há resumo", () => {
    expect(resumirAlvos(preverItens([LIMPEZA], ctx))).toBeNull();
  });
});

describe("aporte pendente vs. feito no plano", () => {
  it("pendente: o primeiro aporte conta hoje", () => {
    const [p] = preverItens([AIRPODS], { ...PENDENTE, saldo: 100000 });
    expect(p).toMatchObject({ semanas: 7, data: "2026-12-05" });
  });

  it("feito: o primeiro aporte é na próxima quarta", () => {
    const [p] = preverItens([AIRPODS], { ...FEITO, saldo: 100000 });
    expect(p).toMatchObject({ semanas: 7, data: "2026-12-09" });
  });

  it("com uma semana só, a data é o próprio primeiro aporte", () => {
    expect(preverItens([CABO], { ...FEITO, saldo: 0 })[0].data).toBe("2026-10-28");
    expect(preverItens([CABO], { ...PENDENTE, saldo: 0 })[0].data).toBe(SABADO);
  });
});

describe("W = 0", () => {
  const ctx = { ...FEITO, aporteSemanal: 0, saldo: 100000 };

  it("não projeta o que ainda não cabe", () => {
    expect(semanasPara(199900, 100000, 0)).toBeNull();
    const [airpods, cabo] = preverItens([AIRPODS, { ...CABO, alvo: true }], ctx);
    expect(airpods).toMatchObject({ semanas: null, data: null });
    expect(cabo.semanas).toBeNull(); // acumulado 206900 também não cabe
  });

  it("o que cabe continua 'agora'", () => {
    expect(preverItens([CABO], ctx)[0]).toMatchObject({ semanas: 0, data: SABADO });
  });

  it("sem aporte, não calcula impacto nem projeta o saldo", () => {
    expect(impactoDeComprarAgora(7000, [AIRPODS], ctx)).toBeNull();
    expect(projecaoDoSaldo(ctx, 10)).toEqual([{ dia: 0, data: SABADO, saldo: 100000 }]);
  });
});

describe("impacto de comprar agora", () => {
  const itens = [AIRPODS, VIAGEM];
  // Saldo 1.050: os alvos (3.999) ficam prontos em 20 semanas, com folga de R$ 51.
  const ctx = { ...FEITO, saldo: 105000 };

  it("0 semana quando cabe na folga", () => {
    expect(impactoDeComprarAgora(5000, itens, ctx)).toBe(0);
  });

  it("1 semana", () => {
    expect(impactoDeComprarAgora(7000, itens, ctx)).toBe(1);
  });

  it("2 ou mais semanas", () => {
    expect(impactoDeComprarAgora(30000, itens, ctx)).toBe(2);
    expect(impactoDeComprarAgora(864900, itens, ctx)).toBe(58);
  });

  it("sem alvos, não há impacto", () => {
    expect(impactoDeComprarAgora(7000, [LIMPEZA], ctx)).toBeNull();
  });
});

describe("data desejada", () => {
  const ctx = { ...FEITO, saldo: 100000 };

  it("conta os aportes até a data e quanto guardar por semana", () => {
    // De 28/10/2026 a 01/03/2027 são 124 dias: 17 semanas completas + o primeiro aporte = 18.
    expect(aporteParaData(399900, "2027-03-01", ctx)).toEqual({
      data: "2027-03-01",
      aportesDisponiveis: 18,
      aporteNecessario: 16662,
    });
  });

  it("avisa quando o plano passa da data", () => {
    const viagem = preverItens([AIRPODS, VIAGEM], ctx)[1];
    expect(viagem.prazo).toMatchObject({ passa: true, aporteNecessario: 16662 });
  });

  it("não avisa quando chega a tempo", () => {
    const viagem = preverItens([{ ...VIAGEM, dataDesejada: "2027-06-01" }], ctx)[0];
    expect(viagem.prazo?.passa).toBe(false);
  });

  it("data antes do primeiro aporte: nenhum aporte disponível", () => {
    expect(aporteParaData(399900, "2026-10-25", ctx)).toMatchObject({ aportesDisponiveis: 0, aporteNecessario: null });
    expect(aporteParaData(399900, "2026-10-28", ctx).aportesDisponiveis).toBe(1);
  });

  it("se já cabe, não precisa guardar nada a mais", () => {
    expect(aporteParaData(50000, "2026-11-30", ctx).aporteNecessario).toBe(0);
  });
});

describe("progresso", () => {
  it("o saldo enche os alvos na ordem", () => {
    const [a, b] = preverItens([AIRPODS, VIAGEM], { ...FEITO, saldo: 250000 });
    expect(a.alocado).toBe(199900);
    expect(b.alocado).toBe(50100);
  });

  it("saldo zerado: nada alocado", () => {
    expect(preverItens([AIRPODS], { ...FEITO, saldo: 0 })[0].alocado).toBe(0);
  });
});

describe("prazo em semanas e meses", () => {
  it.each([
    [0, "agora"],
    [1, "1 semana"],
    [3, "3 semanas"],
    [4, "≈ 1 mês"],
    [6, "≈ 1 mês e meio"],
    [11, "≈ 2 meses e meio"],
    [20, "≈ 4 meses e meio"],
    [26, "≈ 6 meses"],
  ])("%i semanas → %s", (semanas, texto) => {
    expect(formatarPrazo(semanas)).toBe(texto);
  });
});

describe("projeção do saldo (gráfico em degraus)", () => {
  it("aporte feito: o primeiro degrau é na próxima quarta", () => {
    expect(projecaoDoSaldo({ ...FEITO, saldo: 100000 }, 3)).toEqual([
      { dia: 0, data: SABADO, saldo: 100000 },
      { dia: 4, data: "2026-10-28", saldo: 115000 },
      { dia: 11, data: "2026-11-04", saldo: 130000 },
      { dia: 18, data: "2026-11-11", saldo: 145000 },
    ]);
  });

  it("aporte pendente: o primeiro degrau é hoje", () => {
    const pontos = projecaoDoSaldo({ ...PENDENTE, saldo: 100000 }, 2);
    expect(pontos.map((p) => [p.dia, p.saldo])).toEqual([
      [0, 100000],
      [0, 115000],
      [7, 130000],
    ]);
  });
});

// --- Simulador -----------------------------------------------------------------------

import {
  aplicarCenario,
  cenarioAtual,
  compararPlanos,
  contextoDoPlano,
  mudancasDoCenario,
} from "@/lib/plano";

describe("simulador", () => {
  // Aporte desta semana já feito: F = próxima quarta.
  const entrada = { hoje: SABADO, diaAporte: QUARTA, aporteSemanal: W, ultimoAporte: "2026-10-21", aportesDesde: null };
  const itens = [AIRPODS, LIMPEZA, VIAGEM, CABO];
  const saldo = 100000;
  const atual = cenarioAtual(itens, W);
  const planoAtual = preverItens(itens, contextoDoPlano(saldo, entrada));

  function simular(mudar: Partial<typeof atual>) {
    const { itens: novos, ctx } = aplicarCenario(itens, saldo, entrada, { ...atual, ...mudar });
    return { novos, ctx, comparacao: compararPlanos(planoAtual, preverItens(novos, ctx)) };
  }

  it("o cenário atual repete o plano: nada muda", () => {
    const { comparacao } = simular({});
    expect(comparacao.alvos.diferenca).toBe(0);
    expect(comparacao.itens.every((c) => c.diferenca === 0)).toBe(true);
    expect(mudancasDoCenario(itens, W, atual)).toEqual([]);
  });

  it("mais aporte por semana: chega antes", () => {
    const { ctx, comparacao } = simular({ aporteSemanal: 20000 });
    expect(ctx.aporteSemanal).toBe(20000);
    // Todos os alvos (R$ 3.999): 20 semanas com R$ 150; 15 semanas com R$ 200.
    expect(comparacao.alvos.antes?.semanas).toBe(20);
    expect(comparacao.alvos.depois?.semanas).toBe(15);
    expect(comparacao.alvos.diferenca).toBe(-5);
    expect(comparacao.alvos.depois?.data).toBe("2027-02-03");
  });

  it("aporte extra agora soma ao saldo", () => {
    const { ctx, comparacao } = simular({ aporteExtra: 50000 });
    expect(ctx.saldo).toBe(150000);
    expect(comparacao.itens.find((c) => c.id === AIRPODS.id)?.diferenca).toBe(-3); // 7 → 4 semanas
  });

  it("muda o preço só de quem é alvo no cenário", () => {
    const { novos } = simular({ precos: { [AIRPODS.id]: 189000, [CABO.id]: 5000 } });
    expect(novos.find((i) => i.id === AIRPODS.id)?.preco).toBe(189000);
    expect(novos.find((i) => i.id === CABO.id)?.preco).toBe(7000);
  });

  it("liga e desliga alvos", () => {
    const { novos, comparacao } = simular({ alvos: [AIRPODS.id, CABO.id] });
    expect(novos.filter((i) => i.alvo).map((i) => i.id)).toEqual([AIRPODS.id, CABO.id]);
    // Sem a viagem, todos os alvos juntos (R$ 2.069) ficam prontos bem antes.
    expect(comparacao.alvos.depois).toMatchObject({ quantidade: 2, total: 206900, semanas: 8 });
    expect(comparacao.alvos.diferenca).toBe(-12);
  });

  it("de W = 0 para um aporte: a semana pendente conta hoje", () => {
    const semAporte = { ...entrada, aporteSemanal: 0, ultimoAporte: null };
    expect(contextoDoPlano(saldo, semAporte).primeiroAporte).toBe("2026-10-28");
    const { ctx } = aplicarCenario(itens, saldo, semAporte, { ...cenarioAtual(itens, 0), aporteSemanal: W });
    expect(ctx.primeiroAporte).toBe(SABADO);
  });

  it("lista as mudanças que dá para aplicar", () => {
    const cenario = {
      aporteSemanal: 20000,
      aporteExtra: 30000,
      precos: { [AIRPODS.id]: 189000, [VIAGEM.id]: 200000, [LIMPEZA.id]: 1000 },
      alvos: [AIRPODS.id, LIMPEZA.id],
    };
    expect(mudancasDoCenario(itens, W, cenario)).toEqual([
      { chave: "aporte", tipo: "aporte", de: 15000, para: 20000 },
      { chave: "extra", tipo: "extra", valor: 30000 },
      { chave: `preco-${AIRPODS.id}`, tipo: "preco", id: AIRPODS.id, de: 199900, para: 189000 },
      { chave: `alvo-${LIMPEZA.id}`, tipo: "alvo", id: LIMPEZA.id, alvo: true },
      { chave: `preco-${LIMPEZA.id}`, tipo: "preco", id: LIMPEZA.id, de: 18000, para: 1000 },
      { chave: `alvo-${VIAGEM.id}`, tipo: "alvo", id: VIAGEM.id, alvo: false },
    ]);
  });
});
