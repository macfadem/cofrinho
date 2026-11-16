// Regras de cálculo do Cofrinho: funções puras, sem servidor (rodam também no navegador).
// Dinheiro em centavos; datas como 'AAAA-MM-DD'.

import { adicionarDias, diaDaSemana, diasEntre } from "./datas";

// --- Caixa e aportes ---------------------------------------------------------

/** Data mais recente, menor ou igual a hoje, que cai no dia do aporte. */
export function cicloAtual(hoje: string, diaAporte: number): string {
  const recuo = (diaDaSemana(hoje) - diaAporte + 7) % 7;
  return adicionarDias(hoje, -recuo);
}

export type EntradaAporte = {
  hoje: string;
  /** Dia da semana do aporte (0 = domingo … 6 = sábado). */
  diaAporte: number;
  /** Aporte semanal W, em centavos. */
  aporteSemanal: number;
  /** Data do aporte mais recente (ou null se nunca houve aporte). */
  ultimoAporte: string | null;
  /**
   * Ciclos antes desta data não contam como pendentes (definida no primeiro uso,
   * conforme o aporte da semana já estar ou não no saldo inicial).
   */
  aportesDesde: string | null;
};

export type EstadoAporte = {
  /** cicloAtual: data do aporte desta semana. */
  ciclo: string;
  /** Não existe aporte com data maior ou igual ao ciclo atual. */
  pendente: boolean;
  /** F: data do primeiro aporte futuro (hoje se pendente; senão, ciclo + 7). */
  proximo: string;
};

export function estadoDoAporte({
  hoje,
  diaAporte,
  aporteSemanal,
  ultimoAporte,
  aportesDesde,
}: EntradaAporte): EstadoAporte {
  const ciclo = cicloAtual(hoje, diaAporte);
  const cicloConta = aportesDesde === null || ciclo >= aportesDesde;
  const feito = ultimoAporte !== null && ultimoAporte >= ciclo;
  const pendente = aporteSemanal > 0 && cicloConta && !feito;
  return { ciclo, pendente, proximo: pendente ? hoje : adicionarDias(ciclo, 7) };
}

/**
 * Ao mudar o dia do aporte: se a semana já estava em dia, o ciclo desta semana
 * no novo dia não vira pendência (o aporte da semana já foi feito no dia antigo).
 */
export function aportesDesdeAoMudarDia(antes: EntradaAporte, novoDia: number): string | null {
  if (novoDia === antes.diaAporte || antes.aporteSemanal <= 0) return antes.aportesDesde;
  if (estadoDoAporte(antes).pendente) return antes.aportesDesde;
  const proximoNoNovoDia = adicionarDias(cicloAtual(antes.hoje, novoDia), 7);
  return antes.aportesDesde !== null && antes.aportesDesde > proximoNoNovoDia
    ? antes.aportesDesde
    : proximoNoNovoDia;
}

/**
 * A partir de quando os aportes passam a contar, no primeiro uso:
 * se o aporte desta semana já está no saldo informado, só a semana seguinte conta.
 */
export function inicioDosAportes(
  hoje: string,
  diaAporte: number,
  aporteDaSemanaJaGuardado: boolean,
): string {
  const ciclo = cicloAtual(hoje, diaAporte);
  return aporteDaSemanaJaGuardado ? adicionarDias(ciclo, 7) : ciclo;
}

// --- Plano de compras ---------------------------------------------------------------

/** Semanas por mês, em média. */
export const SEMANAS_POR_MES = 4.345;

export type ContextoDoPlano = {
  hoje: string;
  /** Saldo atual do caixa. */
  saldo: number;
  /** W: aporte semanal. */
  aporteSemanal: number;
  /** F: data do primeiro aporte futuro (veja estadoDoAporte). */
  primeiroAporte: string;
};

export type ItemDoPlano = {
  id: number;
  preco: number;
  alvo: boolean;
  dataDesejada?: string | null;
};

/**
 * N: quantos aportes semanais faltam para juntar `acumulado`.
 * 0 se já cabe no saldo; null se não cabe e não há aporte semanal (W = 0).
 */
export function semanasPara(acumulado: number, saldo: number, aporteSemanal: number): number | null {
  if (acumulado <= saldo) return 0;
  if (aporteSemanal <= 0) return null;
  return Math.ceil((acumulado - saldo) / aporteSemanal);
}

/** Data em que se chega lá: hoje se N = 0; senão, F + 7·(N − 1). */
export function dataPara(semanas: number, { hoje, primeiroAporte }: Pick<ContextoDoPlano, "hoje" | "primeiroAporte">) {
  return semanas === 0 ? hoje : adicionarDias(primeiroAporte, 7 * (semanas - 1));
}

export type PrazoDaData = {
  data: string;
  /** Aportes que ainda acontecem até a data: piso((D − F) / 7) + 1, ou 0 se D < F. */
  aportesDisponiveis: number;
  /** Quanto guardar por semana para chegar a tempo (0 se já cabe; null se não há aportes até lá). */
  aporteNecessario: number | null;
};

/** Para chegar a `acumulado` até a data desejada D. */
export function aporteParaData(acumulado: number, dataDesejada: string, ctx: ContextoDoPlano): PrazoDaData {
  const aportesDisponiveis =
    dataDesejada < ctx.primeiroAporte ? 0 : Math.floor(diasEntre(ctx.primeiroAporte, dataDesejada) / 7) + 1;
  const falta = acumulado - ctx.saldo;
  return {
    data: dataDesejada,
    aportesDisponiveis,
    aporteNecessario: falta <= 0 ? 0 : aportesDisponiveis === 0 ? null : Math.ceil(falta / aportesDisponiveis),
  };
}

export type PrevisaoDoItem = {
  id: number;
  alvo: boolean;
  preco: number;
  /** Posição no plano: alvos primeiro (na ordem da lista), depois os demais. */
  ordem: number;
  /** C_k: soma dos preços até este item, no plano. */
  acumulado: number;
  /** N_k (null se W = 0 e ainda não cabe). */
  semanas: number | null;
  /** Data prevista (null se não dá para prever). */
  data: string | null;
  /** Quanto do saldo atual já "enche" este item. */
  alocado: number;
  /** Se há data desejada: o prazo, e se o plano passa dela. */
  prazo: (PrazoDaData & { passa: boolean }) | null;
};

/** Previsão de todos os desejos: os alvos primeiro, na ordem da lista; depois os demais. */
export function preverItens(itens: ItemDoPlano[], ctx: ContextoDoPlano): PrevisaoDoItem[] {
  const naOrdem = [...itens.filter((i) => i.alvo), ...itens.filter((i) => !i.alvo)];
  let acumulado = 0;
  return naOrdem.map((item, ordem) => {
    const anterior = acumulado;
    acumulado += item.preco;
    const semanas = semanasPara(acumulado, ctx.saldo, ctx.aporteSemanal);
    const data = semanas === null ? null : dataPara(semanas, ctx);
    const prazo = item.dataDesejada ? aporteParaData(acumulado, item.dataDesejada, ctx) : null;
    return {
      id: item.id,
      alvo: item.alvo,
      preco: item.preco,
      ordem,
      acumulado,
      semanas,
      data,
      alocado: Math.min(Math.max(ctx.saldo - anterior, 0), item.preco),
      prazo: prazo ? { ...prazo, passa: data === null || data > prazo.data } : null,
    };
  });
}

export type ResumoDosAlvos = {
  quantidade: number;
  total: number;
  /** Semanas até comprar todos os alvos (null se W = 0 e ainda não cabe). */
  semanas: number | null;
  data: string | null;
};

/** "Tudo em N semanas": quando dá para comprar todos os alvos juntos. */
export function resumirAlvos(previsoes: PrevisaoDoItem[]): ResumoDosAlvos | null {
  const alvos = previsoes.filter((p) => p.alvo);
  const ultimo = alvos.at(-1);
  if (!ultimo) return null;
  return { quantidade: alvos.length, total: ultimo.acumulado, semanas: ultimo.semanas, data: ultimo.data };
}

/**
 * Quantas semanas comprar um item agora atrasa os alvos:
 * N do último alvo com (saldo − preço) menos N do último alvo com o saldo atual.
 * null se não há alvos ou se não há aporte semanal.
 */
export function impactoDeComprarAgora(preco: number, itens: ItemDoPlano[], ctx: ContextoDoPlano): number | null {
  const totalDosAlvos = itens.filter((i) => i.alvo).reduce((soma, i) => soma + i.preco, 0);
  if (totalDosAlvos === 0) return null;
  const antes = semanasPara(totalDosAlvos, ctx.saldo, ctx.aporteSemanal);
  const depois = semanasPara(totalDosAlvos, ctx.saldo - preco, ctx.aporteSemanal);
  if (antes === null || depois === null) return null;
  return depois - antes;
}

/** "agora", "1 semana", "3 semanas", "≈ 1 mês", "≈ 2 meses e meio"… */
export function formatarPrazo(semanas: number): string {
  if (semanas <= 0) return "agora";
  if (semanas < 4) return semanas === 1 ? "1 semana" : `${semanas} semanas`;
  const meios = Math.max(1, Math.round((semanas / SEMANAS_POR_MES) * 2) / 2);
  const inteiros = Math.floor(meios);
  const texto = inteiros === 1 ? "1 mês" : `${inteiros} meses`;
  return `≈ ${texto}${meios > inteiros ? " e meio" : ""}`;
}

export type PontoDoSaldo = {
  /** Dias desde hoje. */
  dia: number;
  data: string;
  saldo: number;
};

/** Saldo previsto em degraus: hoje e depois de cada um dos próximos `semanas` aportes. */
export function projecaoDoSaldo(ctx: ContextoDoPlano, semanas: number): PontoDoSaldo[] {
  const pontos: PontoDoSaldo[] = [{ dia: 0, data: ctx.hoje, saldo: ctx.saldo }];
  if (ctx.aporteSemanal <= 0) return pontos;
  for (let k = 1; k <= semanas; k++) {
    const data = adicionarDias(ctx.primeiroAporte, 7 * (k - 1));
    pontos.push({ dia: diasEntre(ctx.hoje, data), data, saldo: ctx.saldo + k * ctx.aporteSemanal });
  }
  return pontos;
}

/** Contexto do plano a partir do saldo e dos dados do aporte. */
export function contextoDoPlano(saldo: number, entrada: EntradaAporte): ContextoDoPlano {
  return {
    hoje: entrada.hoje,
    saldo,
    aporteSemanal: entrada.aporteSemanal,
    primeiroAporte: estadoDoAporte(entrada).proximo,
  };
}

// --- Simulador ----------------------------------------------------------------------

/** Uma simulação: como o plano ficaria com outras escolhas. Nada aqui é salvo. */
export type Cenario = {
  /** Aporte semanal W no cenário. */
  aporteSemanal: number;
  /** Aporte extra feito agora (soma ao saldo). */
  aporteExtra: number;
  /** Novos preços (id → centavos). Só valem para quem é alvo no cenário. */
  precos: Readonly<Record<number, number>>;
  /** Quem é alvo no cenário. */
  alvos: readonly number[];
};

/** O cenário que repete o plano atual. */
export function cenarioAtual(itens: ItemDoPlano[], aporteSemanal: number): Cenario {
  return { aporteSemanal, aporteExtra: 0, precos: {}, alvos: itens.filter((i) => i.alvo).map((i) => i.id) };
}

/** Itens e contexto como ficariam no cenário (F é recalculado com o novo aporte semanal). */
export function aplicarCenario(
  itens: ItemDoPlano[],
  saldo: number,
  entrada: EntradaAporte,
  cenario: Cenario,
): { itens: ItemDoPlano[]; ctx: ContextoDoPlano } {
  return {
    itens: itens.map((item) => {
      const alvo = cenario.alvos.includes(item.id);
      return { ...item, alvo, preco: alvo ? (cenario.precos[item.id] ?? item.preco) : item.preco };
    }),
    ctx: contextoDoPlano(saldo + cenario.aporteExtra, { ...entrada, aporteSemanal: cenario.aporteSemanal }),
  };
}

/** Semanas a mais (positivo) ou a menos (negativo) depois; null se algum lado não tem previsão. */
export function diferencaEmSemanas(antes: number | null, depois: number | null): number | null {
  return antes === null || depois === null ? null : depois - antes;
}

export type ComparacaoDoItem = {
  id: number;
  antes: PrevisaoDoItem;
  depois: PrevisaoDoItem;
  diferenca: number | null;
};

export type Comparacao = {
  itens: ComparacaoDoItem[];
  /** Todos os alvos juntos, antes e depois. */
  alvos: { antes: ResumoDosAlvos | null; depois: ResumoDosAlvos | null; diferenca: number | null };
};

/** Antes → depois de cada item e de todos os alvos juntos. */
export function compararPlanos(antes: PrevisaoDoItem[], depois: PrevisaoDoItem[]): Comparacao {
  const anteriores = new Map(antes.map((p) => [p.id, p]));
  const itens = depois.flatMap((d) => {
    const a = anteriores.get(d.id);
    return a ? [{ id: d.id, antes: a, depois: d, diferenca: diferencaEmSemanas(a.semanas, d.semanas) }] : [];
  });
  const resumoAntes = resumirAlvos(antes);
  const resumoDepois = resumirAlvos(depois);
  return {
    itens,
    alvos: {
      antes: resumoAntes,
      depois: resumoDepois,
      diferenca: diferencaEmSemanas(resumoAntes?.semanas ?? null, resumoDepois?.semanas ?? null),
    },
  };
}

export type MudancaDoCenario =
  | { chave: "aporte"; tipo: "aporte"; de: number; para: number }
  | { chave: "extra"; tipo: "extra"; valor: number }
  | { chave: `preco-${number}`; tipo: "preco"; id: number; de: number; para: number }
  | { chave: `alvo-${number}`; tipo: "alvo"; id: number; alvo: boolean };

/** O que o cenário muda em relação ao plano atual (é o que "Aplicar" pode salvar). */
export function mudancasDoCenario(itens: ItemDoPlano[], aporteSemanal: number, cenario: Cenario): MudancaDoCenario[] {
  const mudancas: MudancaDoCenario[] = [];
  if (cenario.aporteSemanal !== aporteSemanal) {
    mudancas.push({ chave: "aporte", tipo: "aporte", de: aporteSemanal, para: cenario.aporteSemanal });
  }
  if (cenario.aporteExtra > 0) mudancas.push({ chave: "extra", tipo: "extra", valor: cenario.aporteExtra });
  for (const item of itens) {
    const alvo = cenario.alvos.includes(item.id);
    if (alvo !== item.alvo) mudancas.push({ chave: `alvo-${item.id}`, tipo: "alvo", id: item.id, alvo });
    const preco = cenario.precos[item.id];
    if (alvo && preco !== undefined && preco !== item.preco) {
      mudancas.push({ chave: `preco-${item.id}`, tipo: "preco", id: item.id, de: item.preco, para: preco });
    }
  }
  return mudancas;
}
