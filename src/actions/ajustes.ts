"use server";

import { and, eq, inArray, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hoje } from "@/lib/datas";
import { obterBanco } from "@/lib/db";
import {
  guardarCopiaAntesDeImportar,
  lerBackup,
  montarBackup,
  restaurarBackup,
  TAMANHO_MAXIMO_BACKUP,
} from "@/lib/db/backup";
import { lerAjustes, lerUltimoAporte } from "@/lib/db/consultas";
import { items, movimentos, settings, TEMAS } from "@/lib/db/schema";
import { VALOR_MAXIMO } from "@/lib/dinheiro";
import { aportesDesdeAoMudarDia, inicioDosAportes } from "@/lib/plano";
import { falha, mensagemDoErro, sucesso, type Resultado } from "@/lib/resultado";

function atualizarTelas() {
  revalidatePath("/", "layout");
}

const valorNaoNegativo = z
  .number({ error: "Informe um valor." })
  .int("Valor inválido.")
  .min(0, "O valor não pode ser negativo.")
  .max(VALOR_MAXIMO, "Valor alto demais.");

const diaDaSemana = z.number().int().min(0).max(6);

// --- Tema ----------------------------------------------------------------------

/** Salva o tema escolhido (claro, escuro ou automático). */
export async function salvarTema(tema: unknown): Promise<Resultado> {
  const r = z.enum(TEMAS).safeParse(tema);
  if (!r.success) return falha("Tema inválido.");

  obterBanco().update(settings).set({ tema: r.data }).where(eq(settings.id, 1)).run();
  atualizarTelas();
  return sucesso();
}

// --- Aporte semanal ---------------------------------------------------------------

const esquemaAporte = z.object({
  aporteSemanal: valorNaoNegativo,
  diaAporte: diaDaSemana,
});

export async function salvarAporte(entrada: {
  aporteSemanal: number;
  diaAporte: number;
}): Promise<Resultado> {
  const r = esquemaAporte.safeParse(entrada);
  if (!r.success) return falha(mensagemDoErro(r.error));

  const atual = lerAjustes();
  const aportesDesde = aportesDesdeAoMudarDia(
    {
      hoje: hoje(),
      diaAporte: atual.diaAporte,
      aporteSemanal: atual.aporteSemanal,
      ultimoAporte: lerUltimoAporte(),
      aportesDesde: atual.aportesDesde,
    },
    r.data.diaAporte,
  );

  obterBanco()
    .update(settings)
    .set({ ...r.data, aportesDesde })
    .where(eq(settings.id, 1))
    .run();
  atualizarTelas();
  return sucesso();
}

// --- Aplicar o simulador ---------------------------------------------------------------

const idItem = z.number().int().positive();

const esquemaSimulacao = z.object({
  aporteSemanal: valorNaoNegativo.optional(),
  aporteExtra: valorNaoNegativo.positive("O aporte extra precisa ser maior que zero.").optional(),
  precos: z
    .array(z.object({ id: idItem, preco: valorNaoNegativo.positive("O preço precisa ser maior que zero.") }))
    .max(1000)
    .default([]),
  alvos: z.array(z.object({ id: idItem, alvo: z.boolean() })).max(1000).default([]),
});

export type MudancasDoSimulador = {
  aporteSemanal?: number;
  aporteExtra?: number;
  precos?: { id: number; preco: number }[];
  alvos?: { id: number; alvo: boolean }[];
};

/**
 * Salva só as mudanças escolhidas no simulador, tudo de uma vez.
 * O aporte extra entra como ajuste (nota "Aporte extra") para não contar como o aporte da semana.
 */
export async function aplicarSimulacao(entrada: MudancasDoSimulador): Promise<Resultado> {
  const r = esquemaSimulacao.safeParse(entrada);
  if (!r.success) return falha(mensagemDoErro(r.error));
  const { aporteSemanal, aporteExtra, precos, alvos } = r.data;
  const desejoAtivo = (id: number) =>
    and(eq(items.id, id), eq(items.status, "desejo"), isNull(items.excluidoEm));

  obterBanco().transaction((tx) => {
    if (aporteSemanal !== undefined) {
      tx.update(settings).set({ aporteSemanal }).where(eq(settings.id, 1)).run();
    }
    if (aporteExtra !== undefined) {
      tx.insert(movimentos)
        .values({ tipo: "ajuste", valor: aporteExtra, data: hoje(), nota: "Aporte extra" })
        .run();
    }
    for (const { id, preco } of precos) tx.update(items).set({ preco }).where(desejoAtivo(id)).run();
    for (const { id, alvo } of alvos) tx.update(items).set({ alvo }).where(desejoAtivo(id)).run();
  });

  atualizarTelas();
  return sucesso();
}

// --- Primeiro uso ------------------------------------------------------------------

const esquemaPrimeiroUso = z.object({
  saldoInicial: valorNaoNegativo,
  aporteSemanal: valorNaoNegativo,
  diaAporte: diaDaSemana,
  aporteDaSemanaJaGuardado: z.boolean(),
  alvos: z.array(z.number().int().positive()).max(500).default([]),
});

export async function concluirPrimeiroUso(entrada: {
  saldoInicial: number;
  aporteSemanal: number;
  diaAporte: number;
  aporteDaSemanaJaGuardado: boolean;
  alvos?: number[];
}): Promise<Resultado> {
  const r = esquemaPrimeiroUso.safeParse(entrada);
  if (!r.success) return falha(mensagemDoErro(r.error));
  const { saldoInicial, aporteSemanal, diaAporte, aporteDaSemanaJaGuardado, alvos } = r.data;

  const banco = obterBanco();
  const dataHoje = hoje();
  banco.transaction((tx) => {
    const atual = tx.select().from(settings).where(eq(settings.id, 1)).get();
    if (atual?.configuradoEm) return; // já configurado (ex.: clique duplo)

    if (saldoInicial > 0) {
      tx.insert(movimentos)
        .values({ tipo: "ajuste", valor: saldoInicial, data: dataHoje, nota: "Saldo inicial" })
        .run();
    }
    tx.update(settings)
      .set({
        aporteSemanal,
        diaAporte,
        configuradoEm: new Date().toISOString(),
        aportesDesde: inicioDosAportes(dataHoje, diaAporte, aporteDaSemanaJaGuardado),
      })
      .where(eq(settings.id, 1))
      .run();
    if (alvos.length > 0) {
      tx.update(items)
        .set({ alvo: true })
        .where(and(inArray(items.id, alvos), eq(items.status, "desejo"), isNull(items.excluidoEm)))
        .run();
    }
  });

  atualizarTelas();
  return sucesso();
}

// --- Backup em JSON -------------------------------------------------------------------

/** Tudo (com as imagens) num arquivo JSON para baixar. */
export async function exportarBackup(): Promise<Resultado<{ nome: string; conteudo: string }>> {
  try {
    return sucesso({ nome: `cofrinho-backup-${hoje()}.json`, conteudo: JSON.stringify(montarBackup(), null, 2) });
  } catch (erro) {
    console.error(erro);
    return falha("Não consegui montar o backup. Tente de novo.");
  }
}

/** Troca todos os dados pelos do arquivo. Antes, guarda uma cópia dos dados atuais em data/backups. */
export async function importarBackup(
  formulario: FormData,
): Promise<Resultado<{ desejos: number; copia: string }>> {
  const arquivo = formulario.get("arquivo");
  if (!(arquivo instanceof File) || arquivo.size === 0) return falha("Escolha um arquivo de backup.");
  if (arquivo.size > TAMANHO_MAXIMO_BACKUP) return falha("Esse arquivo é grande demais para ser um backup do Cofrinho.");

  const lido = lerBackup(await arquivo.text());
  if (!lido.ok) return lido;

  let copia: string;
  try {
    copia = guardarCopiaAntesDeImportar();
  } catch (erro) {
    console.error(erro);
    return falha("Não consegui guardar uma cópia dos dados atuais, então não importei nada.");
  }
  try {
    restaurarBackup(lido.dados);
  } catch (erro) {
    console.error(erro);
    return falha("Não consegui importar o backup. Seus dados continuam como estavam.");
  }

  atualizarTelas();
  const desejos = lido.dados.itens.filter((i) => i.status === "desejo" && i.excluidoEm === null).length;
  return sucesso({ desejos, copia });
}
