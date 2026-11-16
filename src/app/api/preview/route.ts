import { pedidoDoProprioApp } from "@/lib/origem";
import { buscarDadosDoLink } from "@/lib/preview";
import { ErroDeRede } from "@/lib/rede";

/** Prévia de link: POST { url } → { ok, dados: { nome, preco, imagemUrl, url } } ou { ok: false, erro }. */
export async function POST(req: Request) {
  if (!pedidoDoProprioApp(req)) {
    return Response.json({ ok: false, erro: "Pedido não permitido." }, { status: 403 });
  }

  let url: unknown;
  try {
    ({ url } = await req.json());
  } catch {
    return Response.json({ ok: false, erro: "Pedido inválido." }, { status: 400 });
  }
  if (typeof url !== "string" || url.length > 4000) {
    return Response.json({ ok: false, erro: "Link inválido." }, { status: 400 });
  }

  try {
    return Response.json({ ok: true, dados: await buscarDadosDoLink(url) });
  } catch (erro) {
    const mensagem = erro instanceof ErroDeRede ? erro.message : "Não consegui ler esse link.";
    return Response.json({ ok: false, erro: mensagem });
  }
}
