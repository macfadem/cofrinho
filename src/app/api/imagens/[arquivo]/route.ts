import fs from "node:fs/promises";
import path from "node:path";
import { PASTA_IMAGENS } from "@/lib/caminhos";
import { NOME_DE_IMAGEM, TIPOS_DE_IMAGEM, type FormatoDeImagem } from "@/lib/imagens";

/** Serve as imagens de data/images (os nomes são aleatórios, então podem ficar em cache). */
export async function GET(_req: Request, ctx: RouteContext<"/api/imagens/[arquivo]">) {
  const { arquivo } = await ctx.params;
  if (!NOME_DE_IMAGEM.test(arquivo)) return new Response("Imagem não encontrada.", { status: 404 });

  try {
    const dados = await fs.readFile(path.join(PASTA_IMAGENS, arquivo));
    const formato = arquivo.split(".").pop() as FormatoDeImagem;
    return new Response(new Uint8Array(dados), {
      headers: {
        "Content-Type": TIPOS_DE_IMAGEM[formato],
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  } catch {
    return new Response("Imagem não encontrada.", { status: 404 });
  }
}
