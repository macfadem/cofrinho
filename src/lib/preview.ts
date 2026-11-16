// Prévia de link: lê a página de um produto e sugere nome, imagem e preço.

import { load, type CheerioAPI } from "cheerio";
import { lerValor } from "./dinheiro";
import { buscarComLimites, ErroDeRede } from "./rede";

export type DadosDoLink = {
  nome: string | null;
  /** Preço em centavos (só quando a moeda é real ou não foi informada). */
  preco: number | null;
  imagemUrl: string | null;
};

type Objeto = Record<string, unknown>;

const LIMITE_HTML = 1_500_000;

function normalizar(texto: string) {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/** Preço vindo da página (1999.9, "1999.90", "R$ 1.999,90"…) em centavos. */
export function precoParaCentavos(valor: unknown): number | null {
  if (typeof valor === "number") {
    return Number.isFinite(valor) && valor > 0 ? Math.round(valor * 100) : null;
  }
  if (typeof valor !== "string") return null;
  const texto = valor.trim();
  if (/^\d+(\.\d{1,2})?$/.test(texto)) {
    const numero = Number(texto);
    return numero > 0 ? Math.round(numero * 100) : null;
  }
  const centavos = lerValor(texto);
  return centavos !== null && centavos > 0 ? centavos : null;
}

/** Tira o nome da loja do título: "AirPods Pro 3 - Magazine Luiza" → "AirPods Pro 3". */
export function limparTitulo(titulo: string, site: string | null, host: string): string {
  let t = titulo.replace(/\s+/g, " ").trim();
  const nomesDaLoja = [site, host.replace(/^www\./, "").split(".")[0]]
    .filter((n): n is string => Boolean(n))
    .map(normalizar)
    .filter((n) => n.length >= 3);
  const ehLoja = (pedaco: string) => {
    const p = normalizar(pedaco);
    return p.length > 0 && nomesDaLoja.some((n) => p.includes(n) || n.includes(p));
  };

  const sufixo = /^(.*\S)\s+[|\-–—:]\s+([^|\-–—]+)$/.exec(t);
  if (sufixo && ehLoja(sufixo[2])) t = sufixo[1];
  const prefixo = /^([^|:]+?)\s*[|:]\s+(.+)$/.exec(t);
  if (prefixo && ehLoja(prefixo[1])) t = prefixo[2];
  return t.slice(0, 120).trim();
}

/** Percorre o JSON-LD: listas, "@graph" e objetos aninhados de primeiro nível. */
function* objetos(valor: unknown): Generator<Objeto> {
  if (Array.isArray(valor)) {
    for (const v of valor) yield* objetos(v);
  } else if (valor && typeof valor === "object") {
    const o = valor as Objeto;
    yield o;
    if ("@graph" in o) yield* objetos(o["@graph"]);
  }
}

function ehProduto(o: Objeto) {
  const tipo = o["@type"];
  const tipos = Array.isArray(tipo) ? tipo : [tipo];
  return tipos.some((t) => t === "Product" || t === "ProductGroup");
}

function produtoDoJsonLd($: CheerioAPI): Objeto | null {
  for (const script of $('script[type="application/ld+json"]').toArray()) {
    try {
      const json = JSON.parse($(script).text());
      for (const o of objetos(json)) if (ehProduto(o)) return o;
    } catch {
      // JSON quebrado na página: ignora este bloco.
    }
  }
  return null;
}

function ehReal(moeda: unknown) {
  return moeda === undefined || moeda === null || moeda === "" || String(moeda).toUpperCase() === "BRL";
}

function precoDoProduto(produto: Objeto): number | null {
  for (const oferta of objetos(produto.offers)) {
    if (!ehReal(oferta.priceCurrency)) continue;
    const especificacao = oferta.priceSpecification as Objeto | undefined;
    const preco = precoParaCentavos(oferta.price ?? oferta.lowPrice ?? especificacao?.price);
    if (preco) return preco;
  }
  return null;
}

function imagemDoProduto(produto: Objeto): string | null {
  for (const imagem of Array.isArray(produto.image) ? produto.image : [produto.image]) {
    if (typeof imagem === "string") return imagem;
    if (imagem && typeof imagem === "object") {
      const url = (imagem as Objeto).url ?? (imagem as Objeto).contentUrl;
      if (typeof url === "string") return url;
    }
  }
  return null;
}

function urlAbsoluta(endereco: string | null, base: string): string | null {
  if (!endereco) return null;
  try {
    const url = new URL(endereco.trim(), base);
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Lê nome, imagem e preço do HTML de uma página de produto. */
export function extrairDados(html: string, urlPagina: string): DadosDoLink {
  const $ = load(html);
  const meta = (seletor: string) => $(seletor).first().attr("content")?.trim() || null;
  const produto = produtoDoJsonLd($);

  const nomeDoProduto = typeof produto?.name === "string" ? produto.name : null;
  const titulo =
    nomeDoProduto ??
    meta('meta[property="og:title"]') ??
    meta('meta[name="twitter:title"]') ??
    ($("title").first().text().trim() || null);
  const nome = titulo
    ? limparTitulo(titulo, meta('meta[property="og:site_name"]'), new URL(urlPagina).hostname) || null
    : null;

  const imagem =
    meta('meta[property="og:image:secure_url"]') ??
    meta('meta[property="og:image"]') ??
    meta('meta[name="twitter:image"]') ??
    meta('meta[name="twitter:image:src"]') ??
    meta('meta[property="twitter:image"]') ??
    (produto ? imagemDoProduto(produto) : null);

  let preco = produto ? precoDoProduto(produto) : null;
  if (preco === null) {
    const moeda = meta('meta[property="product:price:currency"]') ?? meta('meta[property="og:price:currency"]');
    if (ehReal(moeda)) {
      preco = precoParaCentavos(
        meta('meta[property="product:price:amount"]') ??
          meta('meta[property="og:price:amount"]') ??
          ($('[itemprop="price"]').first().attr("content") || null),
      );
    }
  }

  return { nome, preco, imagemUrl: urlAbsoluta(imagem, urlPagina) };
}

function decodificar(bytes: Uint8Array, charset: string | null) {
  try {
    return new TextDecoder(charset ?? "utf-8").decode(bytes);
  } catch {
    return new TextDecoder("utf-8").decode(bytes);
  }
}

/** Busca a página e sugere os dados. Se o link já for uma imagem, sugere a própria imagem. */
export async function buscarDadosDoLink(url: string): Promise<DadosDoLink & { url: string }> {
  const r = await buscarComLimites(url, {
    limiteBytes: LIMITE_HTML,
    aceitar: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.5",
    cortarNoLimite: true,
  });
  const final = r.url.toString();
  if (r.tipo.startsWith("image/")) return { nome: null, preco: null, imagemUrl: final, url: final };
  if (!r.tipo.includes("html") && r.tipo !== "") throw new ErroDeRede("Esse link não é de uma página.");
  return { ...extrairDados(decodificar(r.bytes, r.charset), final), url: final };
}
