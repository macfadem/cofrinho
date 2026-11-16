"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ehDataValida, hoje } from "@/lib/datas";
import { obterBanco } from "@/lib/db";
import { lerSaldo } from "@/lib/db/consultas";
import { items, movimentos, TIPOS_MOVIMENTO, type Movimento } from "@/lib/db/schema";
import { VALOR_MAXIMO } from "@/lib/dinheiro";
import { falha, mensagemDoErro, sucesso, type Resultado } from "@/lib/resultado";

const centavos = z
  .number({ error: "Informe um valor." })
  .int("Valor inválido.")
  .min(-VALOR_MAXIMO, "Valor alto demais.")
  .max(VALOR_MAXIMO, "Valor alto demais.");

const dataAteHoje = z
  .string()
  .refine(ehDataValida, "Data inválida.")
  .refine((d) => d <= hoje(), "A data não pode estar no futuro.");

const nota = z
  .string()
  .trim()
  .max(200, "A nota pode ter até 200 caracteres.")
  .nullish()
  .transform((v) => v || null);

function atualizarTelas() {
  revalidatePath("/", "layout");
}

// --- Confirmar aporte ----------------------------------------------------------

const esquemaAporte = z.object({
  valor: centavos.positive("O aporte precisa ser maior que zero."),
  data: dataAteHoje,
});

export async function confirmarAporte(entrada: {
  valor: number;
  data: string;
}): Promise<Resultado> {
  const r = esquemaAporte.safeParse(entrada);
  if (!r.success) return falha(mensagemDoErro(r.error));

  obterBanco()
    .insert(movimentos)
    .values({ tipo: "aporte", valor: r.data.valor, data: r.data.data })
    .run();
  atualizarTelas();
  return sucesso();
}

// --- Ajustar saldo ------------------------------------------------------------

const esquemaAjuste = z.object({
  saldoCorreto: centavos.nonnegative("O saldo não pode ser negativo."),
  nota,
});

/** Registra a diferença entre o saldo correto e o atual como um ajuste. */
export async function ajustarSaldo(entrada: {
  saldoCorreto: number;
  nota?: string | null;
}): Promise<Resultado<{ ajuste: number }>> {
  const r = esquemaAjuste.safeParse(entrada);
  if (!r.success) return falha(mensagemDoErro(r.error));

  const ajuste = r.data.saldoCorreto - lerSaldo();
  if (ajuste !== 0) {
    obterBanco()
      .insert(movimentos)
      .values({ tipo: "ajuste", valor: ajuste, data: hoje(), nota: r.data.nota })
      .run();
    atualizarTelas();
  }
  return sucesso({ ajuste });
}

// --- Editar, excluir e restaurar ------------------------------------------------

const esquemaEdicao = z.object({
  id: z.number().int().positive(),
  valor: centavos,
  data: dataAteHoje,
  nota,
});

export async function editarMovimento(entrada: {
  id: number;
  valor: number;
  data: string;
  nota?: string | null;
}): Promise<Resultado> {
  const r = esquemaEdicao.safeParse(entrada);
  if (!r.success) return falha(mensagemDoErro(r.error));
  const { id, valor, data, nota: textoNota } = r.data;

  const banco = obterBanco();
  const atual = banco.select().from(movimentos).where(eq(movimentos.id, id)).get();
  if (!atual) return falha("Essa movimentação não existe mais.");

  if (atual.tipo === "aporte" && valor <= 0) return falha("O aporte precisa ser maior que zero.");
  if (atual.tipo === "compra" && valor >= 0) return falha("O valor da compra precisa ser maior que zero.");
  if (atual.tipo === "ajuste" && valor === 0) return falha("O ajuste não pode ser zero.");

  banco.transaction((tx) => {
    tx.update(movimentos).set({ valor, data, nota: textoNota }).where(eq(movimentos.id, id)).run();
    // A compra e a conquista andam juntas: o item guarda o valor pago e a data.
    if (atual.tipo === "compra" && atual.itemId !== null) {
      tx.update(items).set({ pagoValor: -valor, pagoEm: data }).where(eq(items.id, atual.itemId)).run();
    }
  });
  atualizarTelas();
  return sucesso();
}

/** Exclui e devolve a linha excluída (para o "Desfazer"). */
export async function excluirMovimento(id: number): Promise<Resultado<Movimento>> {
  const banco = obterBanco();
  const linha = banco.select().from(movimentos).where(eq(movimentos.id, id)).get();
  if (!linha) return falha("Essa movimentação não existe mais.");

  banco.transaction((tx) => {
    tx.delete(movimentos).where(eq(movimentos.id, id)).run();
    // Sem a compra no caixa, o item volta para a lista de desejos.
    if (linha.tipo === "compra" && linha.itemId !== null) {
      tx.update(items)
        .set({ status: "desejo", pagoValor: null, pagoEm: null })
        .where(eq(items.id, linha.itemId))
        .run();
    }
  });
  atualizarTelas();
  return sucesso(linha);
}

const esquemaRestauracao = z.object({
  id: z.number().int().positive(),
  tipo: z.enum(TIPOS_MOVIMENTO),
  valor: centavos,
  data: z.string().refine(ehDataValida),
  itemId: z.number().int().positive().nullable(),
  nota: z.string().nullable(),
  criadoEm: z.string(),
});

/** Desfaz uma exclusão, recriando a movimentação com o mesmo id. */
export async function restaurarMovimento(linha: Movimento): Promise<Resultado> {
  const r = esquemaRestauracao.safeParse(linha);
  if (!r.success) return falha("Não deu para desfazer.");

  const banco = obterBanco();
  banco.transaction((tx) => {
    tx.insert(movimentos).values(r.data).onConflictDoNothing().run();
    if (r.data.tipo === "compra" && r.data.itemId !== null) {
      tx.update(items)
        .set({ status: "comprado", pagoValor: -r.data.valor, pagoEm: r.data.data })
        .where(eq(items.id, r.data.itemId))
        .run();
    }
  });
  atualizarTelas();
  return sucesso();
}
