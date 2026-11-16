// Acesso à internet pelo servidor (prévia de links e download de imagens),
// com limites: só http/https, tempo máximo, tamanho máximo e sem rede local.

import dns from "node:dns/promises";
import net from "node:net";

/** Erro com mensagem pronta para mostrar na tela. */
export class ErroDeRede extends Error {}

const TEMPO_LIMITE_MS = 8_000;
const MAX_REDIRECIONAMENTOS = 5;
const NAVEGADOR =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

/** Endereços da própria máquina ou da rede local (roteador, outros aparelhos…). */
export function ehEnderecoPrivado(endereco: string): boolean {
  if (net.isIPv4(endereco)) {
    const [a, b] = endereco.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  if (net.isIPv6(endereco)) {
    const e = endereco.toLowerCase();
    if (e === "::" || e === "::1") return true;
    const mapeado = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(e);
    if (mapeado) return ehEnderecoPrivado(mapeado[1]);
    return /^(fc|fd|fe[89ab]|ff)/.test(e);
  }
  return true;
}

/** Confere o texto do link: precisa ser http:// ou https://. */
export function validarUrl(texto: string): URL {
  let url: URL;
  try {
    url = new URL(texto.trim());
  } catch {
    throw new ErroDeRede("Esse link não parece válido.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ErroDeRede("O link precisa começar com http:// ou https://.");
  }
  return url;
}

async function conferirHost(url: URL) {
  // Só para os testes automáticos, que usam páginas servidas no próprio computador.
  if (process.env.COFRINHO_PERMITIR_REDE_LOCAL === "1") return;

  const host = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "localhost" || /\.(localhost|local|internal|lan|home)$/.test(host)) {
    throw new ErroDeRede("Esse link é da rede local.");
  }
  let enderecos: string[];
  if (net.isIP(host)) {
    enderecos = [host];
  } else {
    try {
      enderecos = (await dns.lookup(host, { all: true })).map((e) => e.address);
    } catch {
      throw new ErroDeRede("Não encontrei esse site. Confira o link e a internet.");
    }
  }
  if (enderecos.some(ehEnderecoPrivado)) throw new ErroDeRede("Esse link é da rede local.");
}

async function lerCorpo(resposta: Response, limite: number, cortarNoLimite: boolean) {
  const leitor = resposta.body?.getReader();
  if (!leitor) return new Uint8Array();
  const partes: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await leitor.read();
    if (done) break;
    total += value.byteLength;
    if (total > limite) {
      await leitor.cancel();
      if (!cortarNoLimite) throw new ErroDeRede("O arquivo é grande demais.");
      partes.push(value.subarray(0, value.byteLength - (total - limite)));
      total = limite;
      break;
    }
    partes.push(value);
  }
  const bytes = new Uint8Array(total);
  let pos = 0;
  for (const p of partes) {
    bytes.set(p, pos);
    pos += p.byteLength;
  }
  return bytes;
}

export type RespostaLimitada = {
  /** Endereço final, depois dos redirecionamentos. */
  url: URL;
  /** Tipo do conteúdo, sem parâmetros (ex.: "text/html"). */
  tipo: string;
  charset: string | null;
  bytes: Uint8Array;
};

/**
 * Busca um link com limites. Com `cortarNoLimite`, devolve só o começo do conteúdo
 * (bom para páginas, cujas informações ficam no topo); sem ele, conteúdo grande dá erro.
 */
export async function buscarComLimites(
  texto: string,
  { limiteBytes, aceitar, cortarNoLimite = false }: { limiteBytes: number; aceitar: string; cortarNoLimite?: boolean },
): Promise<RespostaLimitada> {
  let url = validarUrl(texto);
  const sinal = AbortSignal.timeout(TEMPO_LIMITE_MS);

  try {
    for (let i = 0; i <= MAX_REDIRECIONAMENTOS; i++) {
      await conferirHost(url);
      const resposta = await fetch(url, {
        redirect: "manual",
        signal: sinal,
        headers: {
          "User-Agent": NAVEGADOR,
          Accept: aceitar,
          "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.6",
        },
      });

      const destino = resposta.headers.get("location");
      if (resposta.status >= 300 && resposta.status < 400 && destino) {
        await resposta.body?.cancel();
        url = validarUrl(new URL(destino, url).toString());
        continue;
      }
      if (!resposta.ok) {
        await resposta.body?.cancel();
        throw new ErroDeRede(`O site não deixou ler essa página (erro ${resposta.status}).`);
      }

      const cabecalho = (resposta.headers.get("content-type") ?? "").toLowerCase();
      const tamanho = Number(resposta.headers.get("content-length") ?? 0);
      if (!cortarNoLimite && tamanho > limiteBytes) {
        await resposta.body?.cancel();
        throw new ErroDeRede("O arquivo é grande demais.");
      }
      return {
        url,
        tipo: cabecalho.split(";")[0].trim(),
        charset: /charset=["']?([\w-]+)/.exec(cabecalho)?.[1] ?? null,
        bytes: await lerCorpo(resposta, limiteBytes, cortarNoLimite),
      };
    }
    throw new ErroDeRede("O link redireciona vezes demais.");
  } catch (erro) {
    if (erro instanceof ErroDeRede) throw erro;
    const nome = (erro as { name?: string })?.name;
    if (nome === "TimeoutError" || nome === "AbortError") {
      throw new ErroDeRede("O site demorou demais para responder.");
    }
    throw new ErroDeRede("Não consegui acessar esse link.");
  }
}
