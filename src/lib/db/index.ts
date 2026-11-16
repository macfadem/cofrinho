import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { and, isNotNull, isNull, or, gt } from "drizzle-orm";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { CAMINHO_BANCO, PASTA_DADOS } from "@/lib/caminhos";
import { limparImagensOrfas } from "@/lib/imagens";
import * as schema from "./schema";

export type Banco = BetterSQLite3Database<typeof schema>;

export { CAMINHO_BANCO, PASTA_DADOS };
const PASTA_MIGRACOES = path.join(process.cwd(), "drizzle");

/** Apaga imagens que não pertencem a nenhum item (nem a um excluído há menos de um dia). */
function limparImagens(banco: Banco) {
  const umDiaAtras = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const emUso = banco
    .select({ imagem: schema.items.imagem })
    .from(schema.items)
    .where(
      and(
        isNotNull(schema.items.imagem),
        or(isNull(schema.items.excluidoEm), gt(schema.items.excluidoEm, umDiaAtras)),
      ),
    )
    .all()
    .map((linha) => linha.imagem as string);
  limparImagensOrfas(new Set(emUso));
}

function abrirBanco(): Banco {
  fs.mkdirSync(PASTA_DADOS, { recursive: true });

  const sqlite = new Database(CAMINHO_BANCO);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  sqlite.pragma("busy_timeout = 5000");

  const banco = drizzle(sqlite, { schema });

  // Aplica as migrações pendentes e garante a linha única de ajustes.
  migrate(banco, { migrationsFolder: PASTA_MIGRACOES });
  banco.insert(schema.settings).values({ id: 1 }).onConflictDoNothing().run();

  try {
    limparImagens(banco);
  } catch (erro) {
    console.warn("Não consegui limpar imagens antigas:", erro);
  }

  return banco;
}

// Uma conexão só por processo (o modo dev recarrega módulos, por isso o globalThis).
const global = globalThis as typeof globalThis & { __cofrinhoBanco?: Banco };

/** Conexão com o banco local. Use só no servidor (Server Actions, rotas e páginas). */
export function obterBanco(): Banco {
  global.__cofrinhoBanco ??= abrirBanco();
  return global.__cofrinhoBanco;
}
