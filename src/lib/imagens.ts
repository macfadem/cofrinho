// Imagens dos desejos, guardadas em data/images (só no servidor).

import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { PASTA_IMAGENS } from "./caminhos";
import { buscarComLimites, ErroDeRede } from "./rede";

export const TAMANHO_MAXIMO_IMAGEM = 10 * 1024 * 1024;

export const TIPOS_DE_IMAGEM = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
} as const;

export type FormatoDeImagem = keyof typeof TIPOS_DE_IMAGEM;

/** Nomes que o app gera: um identificador aleatório e a extensão. */
export const NOME_DE_IMAGEM = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|gif|avif)$/;

function ascii(bytes: Uint8Array, de: number, ate: number) {
  return String.fromCharCode(...bytes.subarray(de, ate));
}

/** Descobre o formato pelos primeiros bytes do arquivo (não confia na extensão). */
export function formatoDaImagem(bytes: Uint8Array): FormatoDeImagem | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (bytes[0] === 0x89 && ascii(bytes, 1, 4) === "PNG") return "png";
  if (ascii(bytes, 0, 4) === "GIF8") return "gif";
  if (ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 12) === "WEBP") return "webp";
  if (ascii(bytes, 4, 8) === "ftyp" && ["avif", "avis"].includes(ascii(bytes, 8, 12))) return "avif";
  return null;
}

/** Valida e grava a imagem; devolve o nome do arquivo. */
export function salvarImagem(bytes: Uint8Array): string {
  if (bytes.byteLength > TAMANHO_MAXIMO_IMAGEM) throw new ErroDeRede("A imagem passa de 10 MB.");
  const formato = formatoDaImagem(bytes);
  if (!formato) throw new ErroDeRede("Esse arquivo não é uma imagem JPG, PNG, WebP, GIF ou AVIF.");
  fs.mkdirSync(PASTA_IMAGENS, { recursive: true });
  const nome = `${randomUUID()}.${formato}`;
  fs.writeFileSync(path.join(PASTA_IMAGENS, nome), bytes);
  return nome;
}

/** Baixa a imagem de um link para a pasta do app. */
export async function baixarImagem(url: string): Promise<string> {
  const r = await buscarComLimites(url, {
    limiteBytes: TAMANHO_MAXIMO_IMAGEM,
    aceitar: "image/avif,image/webp,image/png,image/jpeg,image/*;q=0.8",
  });
  if (!formatoDaImagem(r.bytes)) throw new ErroDeRede("Esse link não é de uma imagem que eu consiga usar.");
  return salvarImagem(r.bytes);
}

export function apagarImagem(nome: string | null | undefined) {
  if (!nome || !NOME_DE_IMAGEM.test(nome)) return;
  fs.rmSync(path.join(PASTA_IMAGENS, nome), { force: true });
}

/** Apaga imagens que nenhum item usa mais (e que não são recentes). */
export function limparImagensOrfas(emUso: Set<string>, idadeMinimaMs = 24 * 60 * 60 * 1000) {
  if (!fs.existsSync(PASTA_IMAGENS)) return 0;
  const limite = Date.now() - idadeMinimaMs;
  let apagadas = 0;
  for (const nome of fs.readdirSync(PASTA_IMAGENS)) {
    if (!NOME_DE_IMAGEM.test(nome) || emUso.has(nome)) continue;
    const caminho = path.join(PASTA_IMAGENS, nome);
    if (fs.statSync(caminho).mtimeMs < limite) {
      fs.rmSync(caminho, { force: true });
      apagadas++;
    }
  }
  return apagadas;
}
