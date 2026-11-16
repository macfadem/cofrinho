import { describe, expect, it } from "vitest";
import { lerBackup } from "@/lib/db/backup";

const ITEM = {
  id: 1,
  nome: "AirPods Pro 3",
  preco: 199900,
  posicao: 1,
  alvo: true,
  status: "desejo",
  link: "https://www.magazineluiza.com.br/airpods",
  imagem: null,
  emoji: "🎧",
  nota: null,
  dataDesejada: null,
  precoAlvo: 190000,
  pagoValor: null,
  pagoEm: null,
  criadoEm: "2026-10-24T10:00:00.000Z",
  atualizadoEm: "2026-10-24T10:00:00.000Z",
  excluidoEm: null,
};

const MOVIMENTO = {
  id: 1,
  tipo: "ajuste",
  valor: 105000,
  data: "2026-10-24",
  itemId: null,
  nota: "Saldo inicial",
  criadoEm: "2026-10-24T10:00:00.000Z",
};

const BACKUP = {
  app: "cofrinho",
  versao: 1,
  exportadoEm: "2026-10-24T13:00:00.000Z",
  ajustes: { aporteSemanal: 15000, diaAporte: 3, tema: "auto", configuradoEm: "2026-10-24T10:00:00.000Z", aportesDesde: "2026-10-28" },
  itens: [ITEM],
  movimentos: [MOVIMENTO],
};

const texto = (valor: unknown) => JSON.stringify(valor);

describe("backup em JSON", () => {
  it("lê um backup válido", () => {
    const r = lerBackup(texto(BACKUP));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.dados.itens[0].nome).toBe("AirPods Pro 3");
  });

  it("recusa o que não é backup do Cofrinho", () => {
    expect(lerBackup("isto não é json")).toEqual({ ok: false, erro: "Esse arquivo não é um backup do Cofrinho." });
    expect(lerBackup(texto({ ...BACKUP, app: "outro" })).ok).toBe(false);
    expect(lerBackup(texto([1, 2, 3])).ok).toBe(false);
  });

  it("avisa quando a versão é desconhecida", () => {
    const r = lerBackup(texto({ ...BACKUP, versao: 2 }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toMatch(/versão/);
  });

  it("recusa links que não são http ou https", () => {
    const r = lerBackup(texto({ ...BACKUP, itens: [{ ...ITEM, link: "javascript:alert(1)" }] }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erro).toMatch(/danificado/);
  });

  it("recusa valores e datas inválidos", () => {
    expect(lerBackup(texto({ ...BACKUP, itens: [{ ...ITEM, preco: -5 }] })).ok).toBe(false);
    expect(lerBackup(texto({ ...BACKUP, movimentos: [{ ...MOVIMENTO, data: "2026-02-30" }] })).ok).toBe(false);
    expect(lerBackup(texto({ ...BACKUP, ajustes: { ...BACKUP.ajustes, diaAporte: 9 } })).ok).toBe(false);
  });

  it("recusa itens repetidos", () => {
    expect(lerBackup(texto({ ...BACKUP, itens: [ITEM, ITEM] })).ok).toBe(false);
  });

  it("solta movimentações de desejos que não estão no arquivo", () => {
    const r = lerBackup(texto({ ...BACKUP, movimentos: [{ ...MOVIMENTO, tipo: "compra", valor: -7000, itemId: 99 }] }));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.dados.movimentos[0].itemId).toBeNull();
  });
});
