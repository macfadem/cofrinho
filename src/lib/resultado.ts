import type { z } from "zod";

/** Resposta das Server Actions: dá certo, ou explica o que corrigir. */
export type Resultado<T = undefined> =
  | { ok: true; dados: T }
  | { ok: false; erro: string };

export function sucesso(): Resultado<undefined>;
export function sucesso<T>(dados: T): Resultado<T>;
export function sucesso<T>(dados?: T): Resultado<T | undefined> {
  return { ok: true, dados };
}

export function falha(erro: string): { ok: false; erro: string } {
  return { ok: false, erro };
}

/** Primeira mensagem de erro de uma validação do Zod. */
export function mensagemDoErro(erro: z.ZodError): string {
  return erro.issues[0]?.message ?? "Dados inválidos.";
}
