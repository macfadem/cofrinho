// Backup do banco do Cofrinho (usado pelo `npm run app`).
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const PADRAO_NOME = /^app-\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.db$/;

/** Data e hora de São Paulo no formato AAAA-MM-DD_HH-MM-SS (ordena por nome). */
export function carimbo(data = new Date()) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(data);
  const p = Object.fromEntries(partes.map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}_${p.hour}-${p.minute}-${p.second}`;
}

/** Backups da pasta, do mais antigo para o mais novo. Ignora outros arquivos. */
export function listarBackups(pasta) {
  if (!fs.existsSync(pasta)) return [];
  return fs
    .readdirSync(pasta)
    .filter((nome) => PADRAO_NOME.test(nome))
    .sort();
}

/** Apaga os backups mais antigos, mantendo só os `manter` mais recentes. */
export function limparBackupsAntigos(pasta, manter = 15) {
  const todos = listarBackups(pasta);
  const remover = todos.slice(0, Math.max(0, todos.length - manter));
  for (const nome of remover) fs.rmSync(path.join(pasta, nome));
  return remover;
}

function hashArquivo(arquivo) {
  return createHash("sha256").update(fs.readFileSync(arquivo)).digest("hex");
}

/**
 * Copia o banco para a pasta de backups e mantém só os `manter` mais recentes.
 * Se nada mudou desde o último backup, não guarda uma cópia repetida.
 *
 * @param {{ arquivoBanco: string, pasta: string, manter?: number, agora?: Date }} opcoes
 * @returns {Promise<{ status: "sem-banco" | "sem-mudancas" | "criado", arquivo?: string, removidos?: string[] }>}
 */
export async function fazerBackup({
  arquivoBanco,
  pasta,
  manter = 15,
  agora = new Date(),
}) {
  if (!fs.existsSync(arquivoBanco)) return { status: "sem-banco" };
  fs.mkdirSync(pasta, { recursive: true });

  const nome = `app-${carimbo(agora)}.db`;
  const destino = path.join(pasta, nome);

  // Carregado só aqui: na primeira execução as dependências ainda não existem.
  const { default: Database } = await import("better-sqlite3");
  const banco = new Database(arquivoBanco, { fileMustExist: true });
  try {
    await banco.backup(destino);
  } finally {
    banco.close();
  }

  const ultimo = listarBackups(pasta)
    .filter((n) => n !== nome)
    .at(-1);
  if (ultimo && hashArquivo(path.join(pasta, ultimo)) === hashArquivo(destino)) {
    fs.rmSync(destino);
    return { status: "sem-mudancas", arquivo: ultimo };
  }

  return {
    status: "criado",
    arquivo: nome,
    removidos: limparBackupsAntigos(pasta, manter),
  };
}
