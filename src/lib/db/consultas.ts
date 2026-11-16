// Leituras do banco (só no servidor).

import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { cache } from "react";
import { hoje as calcularHoje } from "@/lib/datas";
import {
  contextoDoPlano,
  estadoDoAporte,
  type ContextoDoPlano,
  type EntradaAporte,
  type EstadoAporte,
} from "@/lib/plano";
import { obterBanco } from "./index";
import { items, movimentos, settings, type Ajustes, type Item, type Movimento } from "./schema";

/** Lê os ajustes (linha única). */
export function lerAjustes(): Ajustes {
  const banco = obterBanco();
  const linha = banco.select().from(settings).where(eq(settings.id, 1)).get();
  if (!linha) throw new Error("Ajustes não encontrados no banco.");
  return linha;
}

/** Saldo do caixa = soma de todas as movimentações (centavos). */
export function lerSaldo(): number {
  const linha = obterBanco()
    .select({ total: sql<number>`coalesce(sum(${movimentos.valor}), 0)` })
    .from(movimentos)
    .get();
  return linha?.total ?? 0;
}

/** Data do aporte mais recente (ou null). */
export function lerUltimoAporte(): string | null {
  const linha = obterBanco()
    .select({ data: sql<string | null>`max(${movimentos.data})` })
    .from(movimentos)
    .where(eq(movimentos.tipo, "aporte"))
    .get();
  return linha?.data ?? null;
}

/** Desejos (ainda não comprados), na ordem de prioridade (lidos uma vez por requisição). */
export const lerDesejos = cache((): Item[] =>
  obterBanco()
    .select()
    .from(items)
    .where(and(eq(items.status, "desejo"), isNull(items.excluidoEm)))
    .orderBy(asc(items.posicao), asc(items.id))
    .all(),
);

/** Itens já comprados, do mais recente para o mais antigo. */
export function lerConquistas(): Item[] {
  return obterBanco()
    .select()
    .from(items)
    .where(and(eq(items.status, "comprado"), isNull(items.excluidoEm)))
    .orderBy(desc(items.pagoEm), desc(items.id))
    .all();
}

export type MovimentoComItem = Movimento & { itemNome: string | null };

/** Movimentações da mais recente para a mais antiga, com o nome do item (compras). */
export function lerMovimentos(): MovimentoComItem[] {
  return obterBanco()
    .select({
      id: movimentos.id,
      tipo: movimentos.tipo,
      valor: movimentos.valor,
      data: movimentos.data,
      itemId: movimentos.itemId,
      nota: movimentos.nota,
      criadoEm: movimentos.criadoEm,
      itemNome: items.nome,
    })
    .from(movimentos)
    .leftJoin(items, eq(items.id, movimentos.itemId))
    .orderBy(desc(movimentos.data), desc(movimentos.id))
    .all();
}

export type EstadoCaixa = {
  hoje: string;
  configurado: boolean;
  saldo: number;
  aporteSemanal: number;
  diaAporte: number;
  aporte: EstadoAporte;
  /** Os dados que definem o aporte (o simulador recalcula com outro valor semanal). */
  entrada: EntradaAporte;
};

/** Tudo o que as telas precisam saber sobre o caixa agora (lido uma vez por requisição). */
export const lerEstadoCaixa = cache((): EstadoCaixa => {
  const ajustes = lerAjustes();
  const entrada: EntradaAporte = {
    hoje: calcularHoje(),
    diaAporte: ajustes.diaAporte,
    aporteSemanal: ajustes.aporteSemanal,
    ultimoAporte: lerUltimoAporte(),
    aportesDesde: ajustes.aportesDesde,
  };
  return {
    hoje: entrada.hoje,
    configurado: ajustes.configuradoEm !== null,
    saldo: lerSaldo(),
    aporteSemanal: ajustes.aporteSemanal,
    diaAporte: ajustes.diaAporte,
    aporte: estadoDoAporte(entrada),
    entrada,
  };
});

/** O que o plano precisa: hoje, saldo, aporte semanal e a data do próximo aporte (F). */
export function lerContextoDoPlano(): ContextoDoPlano {
  const { saldo, entrada } = lerEstadoCaixa();
  return contextoDoPlano(saldo, entrada);
}
