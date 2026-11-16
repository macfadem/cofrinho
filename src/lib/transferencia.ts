// Ajuda com imagens coladas (Ctrl+V), arrastadas ou escolhidas no navegador.

import { definirImagem } from "@/actions/itens";

const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];
export const ACEITAR_IMAGENS = TIPOS_ACEITOS.join(",");
const TAMANHO_MAXIMO = 10 * 1024 * 1024;

export function ehUrl(texto: string) {
  return /^https?:\/\/\S+$/i.test(texto.trim());
}

/** Primeiro arquivo de imagem colado ou arrastado. */
export function arquivoDeImagem(dados: DataTransfer | null): File | null {
  if (!dados) return null;
  for (const arquivo of Array.from(dados.files)) if (arquivo.type.startsWith("image/")) return arquivo;
  for (const item of Array.from(dados.items ?? [])) {
    if (item.kind === "file" && item.type.startsWith("image/")) {
      const arquivo = item.getAsFile();
      if (arquivo) return arquivo;
    }
  }
  return null;
}

/** Endereço de uma imagem arrastada de outra aba (ou um link de imagem colado). */
export function urlDeImagem(dados: DataTransfer | null): string | null {
  if (!dados) return null;
  const src = /<img[^>]+src=["']([^"']+)["']/i.exec(dados.getData("text/html"))?.[1];
  if (src && ehUrl(src)) return src;
  const lista = dados.getData("text/uri-list").split(/\r?\n/).find((l) => l && !l.startsWith("#"));
  if (lista && ehUrl(lista)) return lista.trim();
  const texto = dados.getData("text/plain").trim();
  return ehUrl(texto) ? texto : null;
}

/** Durante o arraste o conteúdo ainda não pode ser lido, só os tipos. */
export function pareceImagem(dados: DataTransfer | null) {
  if (!dados) return false;
  const tipos = Array.from(dados.types);
  return tipos.includes("Files") || tipos.includes("text/uri-list") || tipos.includes("text/html");
}

/** Mensagem de erro se o arquivo não servir, ou null se estiver tudo certo. */
export function problemaNoArquivo(arquivo: File): string | null {
  if (!TIPOS_ACEITOS.includes(arquivo.type)) return "Use uma imagem JPG, PNG, WebP, GIF ou AVIF.";
  if (arquivo.size > TAMANHO_MAXIMO) return "A imagem passa de 10 MB.";
  return null;
}

/** Abre uma busca de imagens com o nome do item numa nova aba. */
export function abrirBuscaDeImagem(nome: string) {
  window.open(
    `https://www.google.com/search?udm=2&q=${encodeURIComponent(nome)}`,
    "_blank",
    "noopener,noreferrer",
  );
}

/** Envia um arquivo ou o endereço de uma imagem para virar a imagem do item. */
export function enviarImagem(id: number, origem: File | string) {
  const dados = new FormData();
  dados.set("id", String(id));
  if (typeof origem === "string") dados.set("url", origem);
  else dados.set("arquivo", origem);
  return definirImagem(dados);
}
