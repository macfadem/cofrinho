// Placeholder dos itens sem imagem: emoji pelas palavras do nome e gradiente gerado a partir do nome.

/** Palavras-chave → emoji (a primeira regra que bater vence). */
const REGRAS: [RegExp, string][] = [
  [/\b(fones?|airpods?)\b/, "🎧"],
  [/\b(macbook|notebook)\b/, "💻"],
  [/\b(relogio|watch)\b/, "⌚"],
  [/\b(iphone|celular)\b/, "📱"],
  [/\bviage(m|ns)\b/, "✈️"],
  [/\b(camisetas?|bermudas?|roupas?)\b/, "👕"],
  [/\b(cortinas?|quadros?)\b/, "🖼️"],
  [/\b(dentista|dental)\b/, "🦷"],
  [/\bviolao\b/, "🎸"],
  [/\bjogos?\b/, "🎲"],
  [/\bparaquedismo\b/, "🪂"],
  [/\bcursos?\b/, "🎓"],
];

export const EMOJI_PADRAO = "🎁";

/** Minúsculas e sem acentos: "Violão" → "violao". */
function normalizar(texto: string): string {
  return texto.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

export function emojiDoNome(nome: string): string {
  const texto = normalizar(nome);
  return REGRAS.find(([regra]) => regra.test(texto))?.[1] ?? EMOJI_PADRAO;
}

/**
 * Tons escolhidos a dedo (rosa, coral, pêssego, menta, verde-água, céu, anil,
 * lavanda e orquídea): ficam bonitos no claro e no escuro, sem o amarelo-oliva.
 */
const TONS = [350, 15, 40, 160, 185, 215, 250, 285, 320];

/** Dois tons vizinhos da paleta, estáveis para cada nome. */
export function tonsDoNome(nome: string): [number, number] {
  let hash = 5381;
  for (const letra of normalizar(nome)) hash = ((hash << 5) + hash + letra.charCodeAt(0)) >>> 0;
  const i = hash % TONS.length;
  const passo = 1 + ((hash >>> 8) % 2);
  return [TONS[i], TONS[(i + passo) % TONS.length]];
}
