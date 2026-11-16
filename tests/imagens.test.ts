import { describe, expect, it } from "vitest";
import { formatoDaImagem, NOME_DE_IMAGEM } from "@/lib/imagens";

const bytes = (...partes: (number[] | string)[]) =>
  new Uint8Array(
    partes.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)).concat(Array(16).fill(0)),
  );

describe("formato da imagem pelos primeiros bytes", () => {
  it.each([
    ["jpg", bytes([0xff, 0xd8, 0xff, 0xe0])],
    ["png", bytes([0x89], "PNG", [0x0d, 0x0a, 0x1a, 0x0a])],
    ["gif", bytes("GIF89a")],
    ["webp", bytes("RIFF", [0, 0, 0, 0], "WEBPVP8 ")],
    ["avif", bytes([0, 0, 0, 0x1c], "ftypavif")],
  ])("%s", (formato, dados) => {
    expect(formatoDaImagem(dados)).toBe(formato);
  });

  it("recusa o que não é imagem (HTML, SVG, PDF)", () => {
    expect(formatoDaImagem(bytes("<!doctype html>"))).toBeNull();
    expect(formatoDaImagem(bytes("<svg xmlns='http://www.w3.org/2000/svg'>"))).toBeNull();
    expect(formatoDaImagem(bytes("%PDF-1.7"))).toBeNull();
    expect(formatoDaImagem(new Uint8Array([0xff, 0xd8]))).toBeNull();
  });
});

describe("nomes de arquivo aceitos pela rota de imagens", () => {
  it("só aceita os nomes gerados pelo app", () => {
    expect(NOME_DE_IMAGEM.test("3f2b9c1e-8d4a-4b6f-9e2a-1c5d7f9b0a12.webp")).toBe(true);
    expect(NOME_DE_IMAGEM.test("../app.db")).toBe(false);
    expect(NOME_DE_IMAGEM.test("foto.svg")).toBe(false);
    expect(NOME_DE_IMAGEM.test("3f2b9c1e-8d4a-4b6f-9e2a-1c5d7f9b0a12.svg")).toBe(false);
  });
});
