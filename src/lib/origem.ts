/**
 * Aceita só pedidos feitos pelas telas do próprio app (evita que outro site,
 * aberto no navegador, use as rotas do Cofrinho).
 */
export function pedidoDoProprioApp(req: Request): boolean {
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") return false;
  const origem = req.headers.get("origin");
  if (!origem) return true;
  try {
    return new URL(origem).host === req.headers.get("host");
  } catch {
    return false;
  }
}
