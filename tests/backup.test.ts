import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  carimbo,
  fazerBackup,
  limparBackupsAntigos,
  listarBackups,
} from "../scripts/backup.mjs";

let pasta: string;
let arquivoBanco: string;
let pastaBackups: string;

beforeEach(() => {
  pasta = fs.mkdtempSync(path.join(os.tmpdir(), "cofrinho-backup-"));
  arquivoBanco = path.join(pasta, "app.db");
  pastaBackups = path.join(pasta, "backups");
});

afterEach(() => {
  fs.rmSync(pasta, { recursive: true, force: true });
});

function escreverNoBanco(valor: number) {
  const banco = new Database(arquivoBanco);
  banco.exec("create table if not exists t (x integer)");
  banco.prepare("insert into t values (?)").run(valor);
  banco.close();
}

describe("carimbo", () => {
  it("usa o horário de São Paulo e ordena por nome", () => {
    // 03:30 UTC = 00:30 em São Paulo
    expect(carimbo(new Date("2026-10-24T03:30:05Z"))).toBe("2026-10-24_00-30-05");
  });
});

describe("limparBackupsAntigos", () => {
  it("mantém só os 15 mais recentes e ignora outros arquivos", () => {
    fs.mkdirSync(pastaBackups);
    for (let dia = 1; dia <= 20; dia++) {
      const nome = `app-2026-10-${String(dia).padStart(2, "0")}_12-00-00.db`;
      fs.writeFileSync(path.join(pastaBackups, nome), "x");
    }
    fs.writeFileSync(path.join(pastaBackups, "anotacoes.txt"), "não mexer");

    const removidos = limparBackupsAntigos(pastaBackups, 15);

    expect(removidos).toHaveLength(5);
    expect(removidos[0]).toBe("app-2026-10-01_12-00-00.db");
    expect(listarBackups(pastaBackups)).toHaveLength(15);
    expect(listarBackups(pastaBackups)[0]).toBe("app-2026-10-06_12-00-00.db");
    expect(fs.existsSync(path.join(pastaBackups, "anotacoes.txt"))).toBe(true);
  });
});

describe("fazerBackup", () => {
  it("não faz nada quando o banco ainda não existe", async () => {
    const r = await fazerBackup({ arquivoBanco, pasta: pastaBackups });
    expect(r.status).toBe("sem-banco");
  });

  it("cria um backup que abre com os mesmos dados", async () => {
    escreverNoBanco(42);
    const r = await fazerBackup({
      arquivoBanco,
      pasta: pastaBackups,
      agora: new Date("2026-10-24T03:30:00Z"),
    });
    expect(r).toMatchObject({ status: "criado", arquivo: "app-2026-10-24_00-30-00.db" });

    const copia = new Database(path.join(pastaBackups, r.arquivo!), { readonly: true });
    expect(copia.prepare("select x from t").get()).toEqual({ x: 42 });
    copia.close();
  });

  it("não repete o backup quando nada mudou", async () => {
    escreverNoBanco(1);
    await fazerBackup({ arquivoBanco, pasta: pastaBackups, agora: new Date("2026-10-24T10:00:00Z") });
    const r = await fazerBackup({ arquivoBanco, pasta: pastaBackups, agora: new Date("2026-10-24T11:00:00Z") });

    expect(r.status).toBe("sem-mudancas");
    expect(listarBackups(pastaBackups)).toHaveLength(1);
  });

  it("guarda um backup novo quando o banco mudou e respeita o limite", async () => {
    for (let i = 0; i < 4; i++) {
      escreverNoBanco(i);
      await fazerBackup({
        arquivoBanco,
        pasta: pastaBackups,
        manter: 3,
        agora: new Date(Date.UTC(2026, 9, 24, 10 + i)),
      });
    }
    expect(listarBackups(pastaBackups)).toEqual([
      "app-2026-10-24_08-00-00.db",
      "app-2026-10-24_09-00-00.db",
      "app-2026-10-24_10-00-00.db",
    ]);
  });
});
