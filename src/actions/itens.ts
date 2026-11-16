"use server";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ehDataValida, hoje } from "@/lib/datas";
import { obterBanco } from "@/lib/db";
import { items, movimentos } from "@/lib/db/schema";
import { VALOR_MAXIMO } from "@/lib/dinheiro";
import { apagarImagem, baixarImagem, salvarImagem, TAMANHO_MAXIMO_IMAGEM } from "@/lib/imagens";
import { ErroDeRede } from "@/lib/rede";
import { falha, mensagemDoErro, sucesso, type Resultado } from "@/lib/resultado";

function atualizarTelas() {
  revalidatePath("/", "layout");
}

const id = z.number().int().positive();

const nome = z
  .string({ error: "Dê um nome ao desejo." })
  .trim()
  .min(1, "Dê um nome ao desejo.")
  .max(120, "O nome pode ter até 120 caracteres.");

const preco = z
  .number({ error: "Informe o preço." })
  .int("Preço inválido.")
  .positive("O preço precisa ser maior que zero.")
  .max(VALOR_MAXIMO, "Valor alto demais.");

const link = z
  .string()
  .trim()
  .max(2000, "Link longo demais.")
  .nullish()
  .transform((v) => v || null)
  .refine((v) => v === null || /^https?:\/\/\S+$/i.test(v), "O link precisa começar com http:// ou https://.");

const nota = z
  .string()
  .trim()
  .max(500, "A nota pode ter até 500 caracteres.")
  .nullish()
  .transform((v) => v || null);

const dataDesejada = z
  .string()
  .nullish()
  .transform((v) => v || null)
  .refine((v) => v === null || ehDataValida(v), "Data desejada inválida.");

const precoAlvo = z
  .number()
  .int("Preço-alvo inválido.")
  .positive("O preço-alvo precisa ser maior que zero.")
  .max(VALOR_MAXIMO, "Valor alto demais.")
  .nullish()
  .transform((v) => v ?? null);

const camposDoItem = { nome, preco, link, nota, dataDesejada, precoAlvo };

export type CamposDoItem = {
  nome: string;
  preco: number;
  link?: string | null;
  nota?: string | null;
  dataDesejada?: string | null;
  precoAlvo?: number | null;
};

const desejoAtivo = (idItem: number) =>
  and(eq(items.id, idItem), eq(items.status, "desejo"), isNull(items.excluidoEm));

// --- Adicionar e editar --------------------------------------------------------

/** Adiciona um desejo no fim da lista. */
export async function adicionarItem(entrada: CamposDoItem): Promise<Resultado<{ id: number }>> {
  const r = z.object(camposDoItem).safeParse(entrada);
  if (!r.success) return falha(mensagemDoErro(r.error));

  const banco = obterBanco();
  const ultimo = banco
    .select({ posicao: sql<number>`coalesce(max(${items.posicao}), 0)` })
    .from(items)
    .where(and(eq(items.status, "desejo"), isNull(items.excluidoEm)))
    .get();
  const [novo] = banco
    .insert(items)
    .values({ ...r.data, posicao: (ultimo?.posicao ?? 0) + 1 })
    .returning({ id: items.id })
    .all();

  atualizarTelas();
  return sucesso({ id: novo.id });
}

const esquemaEdicao = z.object(camposDoItem).partial().extend({ id });

/** Edita só os campos enviados (ex.: só o nome, direto no card). */
export async function editarItem(
  entrada: Partial<CamposDoItem> & { id: number },
): Promise<Resultado> {
  const r = esquemaEdicao.safeParse(entrada);
  if (!r.success) return falha(mensagemDoErro(r.error));

  const { id: idItem, ...campos } = r.data;
  const mudancas = Object.fromEntries(
    Object.entries(campos).filter(([chave]) => chave in entrada),
  );
  if (Object.keys(mudancas).length === 0) return sucesso();

  const banco = obterBanco();
  const existe = banco.select({ id: items.id }).from(items).where(eq(items.id, idItem)).get();
  if (!existe) return falha("Esse desejo não existe mais.");

  banco.update(items).set(mudancas).where(eq(items.id, idItem)).run();
  atualizarTelas();
  return sucesso();
}

// --- Alvos e ordem ----------------------------------------------------------------

export async function definirAlvo(idItem: number, alvo: boolean): Promise<Resultado> {
  if (!id.safeParse(idItem).success) return falha("Desejo inválido.");
  obterBanco()
    .update(items)
    .set({ alvo: Boolean(alvo) })
    .where(desejoAtivo(idItem))
    .run();
  atualizarTelas();
  return sucesso();
}

/** Marca exatamente estes desejos como alvo (e desmarca os outros). */
export async function definirAlvos(ids: number[]): Promise<Resultado> {
  const r = z.array(id).max(500).safeParse(ids);
  if (!r.success) return falha("Seleção inválida.");

  const banco = obterBanco();
  banco.transaction((tx) => {
    tx.update(items)
      .set({ alvo: false })
      .where(and(eq(items.status, "desejo"), isNull(items.excluidoEm)))
      .run();
    if (r.data.length > 0) {
      tx.update(items)
        .set({ alvo: true })
        .where(and(inArray(items.id, r.data), eq(items.status, "desejo"), isNull(items.excluidoEm)))
        .run();
    }
  });
  atualizarTelas();
  return sucesso();
}

/** Salva a nova ordem de prioridade (ids do primeiro ao último). */
export async function reordenarItens(ids: number[]): Promise<Resultado> {
  const r = z
    .array(id)
    .max(2000)
    .refine((lista) => new Set(lista).size === lista.length)
    .safeParse(ids);
  if (!r.success) return falha("Ordem inválida.");

  const banco = obterBanco();
  banco.transaction((tx) => {
    r.data.forEach((idItem, i) => {
      tx.update(items).set({ posicao: i + 1 }).where(eq(items.id, idItem)).run();
    });
  });
  atualizarTelas();
  return sucesso();
}

// --- Comprei ------------------------------------------------------------------------

const esquemaCompra = z.object({
  id,
  valorPago: preco,
  data: z
    .string()
    .refine(ehDataValida, "Data inválida.")
    .refine((d) => d <= hoje(), "A data não pode estar no futuro."),
});

/** Registra a compra: debita do caixa e move o desejo para as Conquistas. */
export async function comprarItem(entrada: {
  id: number;
  valorPago: number;
  data: string;
}): Promise<Resultado> {
  const r = esquemaCompra.safeParse(entrada);
  if (!r.success) return falha(mensagemDoErro(r.error));
  const { id: idItem, valorPago, data } = r.data;

  const banco = obterBanco();
  const comprou = banco.transaction((tx) => {
    const item = tx.select({ id: items.id }).from(items).where(desejoAtivo(idItem)).get();
    if (!item) return false;
    tx.insert(movimentos).values({ tipo: "compra", valor: -valorPago, data, itemId: idItem }).run();
    tx.update(items)
      .set({ status: "comprado", pagoValor: valorPago, pagoEm: data })
      .where(eq(items.id, idItem))
      .run();
    return true;
  });
  if (!comprou) return falha("Esse desejo não está mais na lista.");

  atualizarTelas();
  return sucesso();
}

/** Desfaz a compra: apaga a compra do caixa e devolve o item para a lista. */
export async function desfazerCompra(idItem: number): Promise<Resultado> {
  if (!id.safeParse(idItem).success) return falha("Item inválido.");

  const banco = obterBanco();
  banco.transaction((tx) => {
    tx.delete(movimentos)
      .where(and(eq(movimentos.itemId, idItem), eq(movimentos.tipo, "compra")))
      .run();
    tx.update(items)
      .set({ status: "desejo", pagoValor: null, pagoEm: null })
      .where(and(eq(items.id, idItem), eq(items.status, "comprado")))
      .run();
  });
  atualizarTelas();
  return sucesso();
}

// --- Excluir e desfazer ----------------------------------------------------------------

export async function excluirItem(idItem: number): Promise<Resultado> {
  if (!id.safeParse(idItem).success) return falha("Item inválido.");
  obterBanco()
    .update(items)
    .set({ excluidoEm: new Date().toISOString() })
    .where(eq(items.id, idItem))
    .run();
  atualizarTelas();
  return sucesso();
}

export async function restaurarItem(idItem: number): Promise<Resultado> {
  if (!id.safeParse(idItem).success) return falha("Item inválido.");
  obterBanco().update(items).set({ excluidoEm: null }).where(eq(items.id, idItem)).run();
  atualizarTelas();
  return sucesso();
}

// --- Imagem -----------------------------------------------------------------------------

/**
 * Troca a imagem de um item. O FormData leva `id` e, ou um `arquivo` (colado,
 * arrastado ou escolhido), ou uma `url` (de uma imagem na internet).
 */
export async function definirImagem(dados: FormData): Promise<Resultado<{ imagem: string }>> {
  const idItem = Number(dados.get("id"));
  if (!id.safeParse(idItem).success) return falha("Item inválido.");

  const banco = obterBanco();
  const atual = banco.select({ imagem: items.imagem }).from(items).where(eq(items.id, idItem)).get();
  if (!atual) return falha("Esse desejo não existe mais.");

  const arquivo = dados.get("arquivo");
  const url = dados.get("url");
  let nova: string;
  try {
    if (arquivo instanceof File) {
      if (arquivo.size > TAMANHO_MAXIMO_IMAGEM) return falha("A imagem passa de 10 MB.");
      nova = salvarImagem(new Uint8Array(await arquivo.arrayBuffer()));
    } else if (typeof url === "string" && url) {
      nova = await baixarImagem(url);
    } else {
      return falha("Nenhuma imagem recebida.");
    }
  } catch (erro) {
    return falha(erro instanceof ErroDeRede ? erro.message : "Não consegui salvar a imagem.");
  }

  banco.update(items).set({ imagem: nova }).where(eq(items.id, idItem)).run();
  apagarImagem(atual.imagem);
  atualizarTelas();
  return sucesso({ imagem: nova });
}

export async function removerImagem(idItem: number): Promise<Resultado> {
  if (!id.safeParse(idItem).success) return falha("Item inválido.");
  const banco = obterBanco();
  const atual = banco.select({ imagem: items.imagem }).from(items).where(eq(items.id, idItem)).get();
  if (!atual) return falha("Esse desejo não existe mais.");
  banco.update(items).set({ imagem: null }).where(eq(items.id, idItem)).run();
  apagarImagem(atual.imagem);
  atualizarTelas();
  return sucesso();
}
