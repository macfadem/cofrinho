import { describe, expect, it } from "vitest";
import { emojiDoNome, EMOJI_PADRAO, tonsDoNome } from "@/lib/emoji";

describe("emoji pelo nome", () => {
  it.each([
    ["AirPods Pro 3", "🎧"],
    ["Fone bluetooth", "🎧"],
    ['MacBook Air M5 13" 16 GB/512 GB', "💻"],
    ["Notebook novo", "💻"],
    ["Relógio de corrida", "⌚"],
    ["Apple Watch SE 3 (40 mm, GPS)", "⌚"],
    ["iPhone 17 256 GB", "📱"],
    ["Celular reserva", "📱"],
    ["Viagem de fim de semana", "✈️"],
    ["Camiseta nova (2 un.)", "👕"],
    ["Bermuda nova", "👕"],
    ["Cortinas da sala + instalação (2 un.)", "🖼️"],
    ["Quadros decorativos", "🖼️"],
    ["Limpeza dental", "🦷"],
    ["Consulta no dentista", "🦷"],
    ["Consertar o violão", "🎸"],
    ["Jogo de tabuleiro", "🎲"],
    ["Curso de paraquedismo", "🪂"],
    ["Curso de inglês", "🎓"],
    ["Cabo USB-C para Lightning", EMOJI_PADRAO],
  ])("%s → %s", (nome, emoji) => {
    expect(emojiDoNome(nome)).toBe(emoji);
  });

  it("não confunde pedaços de palavras", () => {
    expect(emojiDoNome("Jogador de futebol")).toBe(EMOJI_PADRAO);
  });
});

describe("tons do gradiente", () => {
  it("são estáveis e variam entre nomes", () => {
    expect(tonsDoNome("AirPods Pro 3")).toEqual(tonsDoNome("AirPods Pro 3"));
    const nomes = ["AirPods Pro 3", "Bermuda nova", "Viagem de fim de semana", "Limpeza dental", "Jogo de tabuleiro", "iPhone 17"];
    const combinacoes = new Set(nomes.map((n) => tonsDoNome(n).join("-")));
    expect(combinacoes.size).toBeGreaterThan(3);
    for (const tom of tonsDoNome("Qualquer coisa")) {
      expect(tom).toBeGreaterThanOrEqual(0);
      expect(tom).toBeLessThan(360);
    }
  });
});
