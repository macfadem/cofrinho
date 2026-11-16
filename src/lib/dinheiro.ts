// Dinheiro sempre em centavos (números inteiros).

const formatoBRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const formatoSemSimbolo = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Maior valor aceito: R$ 100 milhões (evita erros de digitação absurdos). */
export const VALOR_MAXIMO = 100_000_000_00;

/** 199990 → "R$ 1.999,90" */
export function formatarBRL(centavos: number): string {
  return formatoBRL.format(centavos / 100);
}

/** 199990 → "1.999,90" (para preencher campos de valor). */
export function formatarSemSimbolo(centavos: number): string {
  return formatoSemSimbolo.format(centavos / 100);
}

/** 199990 → "+R$ 1.999,90"; −7000 → "−R$ 70,00" (com sinal sempre visível). */
export function formatarComSinal(centavos: number): string {
  if (centavos === 0) return formatarBRL(0);
  const sinal = centavos > 0 ? "+" : "−";
  return `${sinal}${formatarBRL(Math.abs(centavos))}`;
}

const SO_DIGITOS = /^\d+$/;
const MILHARES_COM_PONTO = /^\d{1,3}(\.\d{3})+$/;

/** Lê a parte inteira em reais: "1999" ou "1.999". */
function lerInteiro(texto: string): number | null {
  if (SO_DIGITOS.test(texto)) return Number(texto);
  if (MILHARES_COM_PONTO.test(texto)) return Number(texto.replaceAll(".", ""));
  return null;
}

/** Lê os centavos depois da vírgula (ou do ponto): "9" → 90, "90" → 90. */
function lerDecimais(texto: string): number | null {
  if (!/^\d{1,2}$/.test(texto)) return null;
  return Number(texto.padEnd(2, "0"));
}

/**
 * Lê um valor digitado e devolve centavos (ou null se não der para entender).
 * Aceita "1999", "1.999", "1.999,90", "R$ 1.999,90", "19,9" e também "19.90".
 * Com `permitirNegativo`, aceita sinal de menos ("-50", "−R$ 50,00", "R$ -50").
 */
export function lerValor(
  texto: string,
  { permitirNegativo = false }: { permitirNegativo?: boolean } = {},
): number | null {
  let t = texto.replace(/\s/g, "").replace(/[−–]/g, "-");

  // O sinal pode vir antes ou depois do "R$": "-R$ 50" ou "R$ -50".
  let negativo = false;
  if (t.startsWith("-")) {
    negativo = true;
    t = t.slice(1);
  }
  if (/^R\$/i.test(t)) t = t.slice(2);
  if (t.startsWith("-")) {
    if (negativo) return null;
    negativo = true;
    t = t.slice(1);
  }
  if (negativo && !permitirNegativo) return null;
  if (!t) return null;

  let reais: number | null;
  let centavos = 0;

  if (t.includes(",")) {
    const partes = t.split(",");
    if (partes.length !== 2) return null;
    reais = partes[0] === "" ? 0 : lerInteiro(partes[0]);
    const dec = partes[1] === "" ? 0 : lerDecimais(partes[1]);
    if (dec === null) return null;
    centavos = dec;
  } else if (t.includes(".") && !MILHARES_COM_PONTO.test(t)) {
    // Ponto como separador decimal: "19.9" ou "19.90".
    const partes = t.split(".");
    if (partes.length !== 2 || !SO_DIGITOS.test(partes[0])) return null;
    reais = Number(partes[0]);
    const dec = lerDecimais(partes[1]);
    if (dec === null) return null;
    centavos = dec;
  } else {
    reais = lerInteiro(t);
  }

  if (reais === null) return null;
  const total = reais * 100 + centavos;
  if (!Number.isSafeInteger(total) || total > VALOR_MAXIMO) return null;
  return negativo ? -total : total;
}
