// Backup completo em JSON: ajustes, desejos (com as imagens dentro do arquivo) e movimentações.
// Só no servidor.

import fs from "node:fs";
import path from "node:path";
import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { PASTA_DADOS, PASTA_IMAGENS } from "@/lib/caminhos";
import { ehDataValida, FUSO } from "@/lib/datas";
import { VALOR_MAXIMO } from "@/lib/dinheiro";
import { apagarImagem, formatoDaImagem, NOME_DE_IMAGEM, salvarImagem, TIPOS_DE_IMAGEM } from "@/lib/imagens";
import { falha, mensagemDoErro, sucesso, type Resultado } from "@/lib/resultado";
import { obterBanco } from "./index";
import { items, movimentos, settings, STATUS_ITEM, TEMAS, TIPOS_MOVIMENTO } from "./schema";

/** Maior arquivo de backup aceito na importação. */
export const TAMANHO_MAXIMO_BACKUP = 50 * 1024 * 1024;

const NAO_E_BACKUP = "Esse arquivo não é um backup do Cofrinho.";

const data = z.string().refine(ehDataValida, "Há uma data inválida no backup.");
const momento = z.string().max(40);
const positivo = z.number().int().positive().max(VALOR_MAXIMO);
const texto = (maximo: number) => z.string().max(maximo).nullable();

const esquemaItem = z.object({
  id: z.number().int().positive(),
  nome: z.string().trim().min(1).max(120),
  preco: positivo,
  posicao: z.number().int(),
  alvo: z.boolean(),
  status: z.enum(STATUS_ITEM),
  link: z
    .string()
    .max(2000)
    .regex(/^https?:\/\/\S+$/i, "Há um link inválido no backup.")
    .nullable(),
  /** A imagem vai dentro do arquivo, como data URL. */
  imagem: z.string().nullable(),
  emoji: texto(32),
  nota: texto(500),
  dataDesejada: data.nullable(),
  precoAlvo: positivo.nullable(),
  pagoValor: positivo.nullable(),
  pagoEm: data.nullable(),
  criadoEm: momento,
  atualizadoEm: momento,
  excluidoEm: momento.nullable(),
});

const esquemaMovimento = z.object({
  id: z.number().int().positive(),
  tipo: z.enum(TIPOS_MOVIMENTO),
  valor: z.number().int().min(-VALOR_MAXIMO).max(VALOR_MAXIMO),
  data,
  itemId: z.number().int().positive().nullable(),
  nota: texto(500),
  criadoEm: momento,
});

const esquemaBackup = z
  .object({
    app: z.literal("cofrinho"),
    versao: z.literal(1),
    exportadoEm: momento,
    ajustes: z.object({
      aporteSemanal: z.number().int().min(0).max(VALOR_MAXIMO),
      diaAporte: z.number().int().min(0).max(6),
      tema: z.enum(TEMAS),
      configuradoEm: momento.nullable(),
      aportesDesde: data.nullable(),
    }),
    itens: z.array(esquemaItem).max(10_000),
    movimentos: z.array(esquemaMovimento).max(500_000),
  })
  .superRefine((backup, ctx) => {
    if (new Set(backup.itens.map((i) => i.id)).size !== backup.itens.length) {
      ctx.addIssue({ code: "custom", message: "Há desejos repetidos no backup." });
    }
    if (new Set(backup.movimentos.map((m) => m.id)).size !== backup.movimentos.length) {
      ctx.addIssue({ code: "custom", message: "Há movimentações repetidas no backup." });
    }
  });

export type Backup = z.infer<typeof esquemaBackup>;

/** Lê e confere o texto de um arquivo de backup. */
export function lerBackup(conteudo: string): Resultado<Backup> {
  let json: unknown;
  try {
    json = JSON.parse(conteudo);
  } catch {
    return falha(NAO_E_BACKUP);
  }
  if (typeof json !== "object" || json === null || (json as { app?: unknown }).app !== "cofrinho") {
    return falha(NAO_E_BACKUP);
  }
  if ((json as { versao?: unknown }).versao !== 1) {
    return falha("Esse backup é de uma versão do Cofrinho que este app não conhece.");
  }

  const r = esquemaBackup.safeParse(json);
  if (!r.success) return falha(`O backup parece danificado. ${mensagemDoErro(r.error)}`);

  // Movimentações de desejos que não estão no arquivo ficam sem desejo ligado.
  const ids = new Set(r.data.itens.map((i) => i.id));
  for (const m of r.data.movimentos) if (m.itemId !== null && !ids.has(m.itemId)) m.itemId = null;
  return sucesso(r.data);
}

function imagemComoDataUrl(nome: string | null): string | null {
  if (!nome || !NOME_DE_IMAGEM.test(nome)) return null;
  const caminho = path.join(PASTA_IMAGENS, nome);
  if (!fs.existsSync(caminho)) return null;
  const bytes = fs.readFileSync(caminho);
  const formato = formatoDaImagem(bytes);
  return formato ? `data:${TIPOS_DE_IMAGEM[formato]};base64,${bytes.toString("base64")}` : null;
}

/** Tudo o que está no banco, com as imagens dentro. */
export function montarBackup(): Backup {
  const banco = obterBanco();
  const ajustes = banco.select().from(settings).where(eq(settings.id, 1)).get();
  if (!ajustes) throw new Error("Ajustes não encontrados no banco.");
  return {
    app: "cofrinho",
    versao: 1,
    exportadoEm: new Date().toISOString(),
    ajustes: {
      aporteSemanal: ajustes.aporteSemanal,
      diaAporte: ajustes.diaAporte,
      tema: ajustes.tema,
      configuradoEm: ajustes.configuradoEm,
      aportesDesde: ajustes.aportesDesde,
    },
    itens: banco
      .select()
      .from(items)
      .orderBy(asc(items.id))
      .all()
      .map((item) => ({ ...item, imagem: imagemComoDataUrl(item.imagem) })),
    movimentos: banco.select().from(movimentos).orderBy(asc(movimentos.id)).all(),
  };
}

const DATA_URL = /^data:image\/(?:png|jpeg|webp|gif|avif);base64,([A-Za-z0-9+/]+={0,2})$/;

/** Grava a imagem de um item do backup; se não for uma imagem válida, o item fica sem imagem. */
function gravarImagem(dataUrl: string | null): string | null {
  const partes = dataUrl ? DATA_URL.exec(dataUrl) : null;
  if (!partes) return null;
  try {
    return salvarImagem(Buffer.from(partes[1], "base64"));
  } catch {
    return null;
  }
}

/** Troca todos os dados pelos do backup, de uma vez só (se algo falhar, nada muda). */
export function restaurarBackup(backup: Backup) {
  const imagens = backup.itens.map((item) => gravarImagem(item.imagem));
  try {
    obterBanco().transaction((tx) => {
      tx.delete(movimentos).run();
      tx.delete(items).run();
      tx.update(settings).set(backup.ajustes).where(eq(settings.id, 1)).run();
      backup.itens.forEach((item, i) => {
        tx.insert(items).values({ ...item, imagem: imagens[i] }).run();
      });
      for (const m of backup.movimentos) tx.insert(movimentos).values(m).run();
    });
  } catch (erro) {
    for (const nome of imagens) apagarImagem(nome);
    throw erro;
  }
}

/** Data e hora de São Paulo no formato AAAA-MM-DD_HH-MM-SS. */
function carimbo(agora = new Date()) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: FUSO,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(agora)
      .map((x) => [x.type, x.value]),
  );
  return `${p.year}-${p.month}-${p.day}_${p.hour}-${p.minute}-${p.second}`;
}

/** Guarda os dados de agora em data/backups antes de importar outro backup. */
export function guardarCopiaAntesDeImportar(): string {
  const pasta = path.join(PASTA_DADOS, "backups");
  fs.mkdirSync(pasta, { recursive: true });
  const nome = `antes-de-importar-${carimbo()}.json`;
  fs.writeFileSync(path.join(pasta, nome), JSON.stringify(montarBackup()));
  return nome;
}
