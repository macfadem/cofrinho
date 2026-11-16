// Datas como texto 'AAAA-MM-DD', sem fuso. "Hoje" é calculado no fuso de São Paulo.
// As contas são feitas em UTC para não sofrer com horário de verão.

import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const FUSO = "America/Sao_Paulo";

/** Dias da semana: 0 = domingo … 6 = sábado. */
export const DIAS_SEMANA = [
  { curto: "Dom", nome: "domingo" },
  { curto: "Seg", nome: "segunda" },
  { curto: "Ter", nome: "terça" },
  { curto: "Qua", nome: "quarta" },
  { curto: "Qui", nome: "quinta" },
  { curto: "Sex", nome: "sexta" },
  { curto: "Sáb", nome: "sábado" },
] as const;

const DATA_VALIDA = /^\d{4}-\d{2}-\d{2}$/;

/** Data de hoje em São Paulo, no formato 'AAAA-MM-DD'. */
export function hoje(agora: Date = new Date()): string {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: FUSO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(agora);
  const p = Object.fromEntries(partes.map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

function paraUTC(data: string): Date {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function deUTC(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Confere se o texto é uma data real no formato 'AAAA-MM-DD'. */
export function ehDataValida(data: string): boolean {
  return DATA_VALIDA.test(data) && deUTC(paraUTC(data)) === data;
}

export function adicionarDias(data: string, dias: number): string {
  const d = paraUTC(data);
  d.setUTCDate(d.getUTCDate() + dias);
  return deUTC(d);
}

/** 0 = domingo … 6 = sábado. */
export function diaDaSemana(data: string): number {
  return paraUTC(data).getUTCDay();
}

/** Quantos dias de `de` até `ate` (negativo se `ate` vier antes). */
export function diasEntre(de: string, ate: string): number {
  return Math.round((paraUTC(ate).getTime() - paraUTC(de).getTime()) / 86_400_000);
}

/** Meio-dia local da data, só para formatar com o date-fns. */
function paraFormatar(data: string): Date {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(ano, mes - 1, dia, 12);
}

/** '2026-12-02' → "qua, 02/12" */
export function formatarDataCurta(data: string): string {
  const dia = DIAS_SEMANA[diaDaSemana(data)].curto.toLowerCase();
  return `${dia}, ${format(paraFormatar(data), "dd/MM")}`;
}

/** '2026-12-02' → "02/12/2026" */
export function formatarData(data: string): string {
  return format(paraFormatar(data), "dd/MM/yyyy", { locale: ptBR });
}

/** '2026-10-21' → "Outubro de 2026" */
export function formatarMesAno(data: string): string {
  const texto = format(paraFormatar(data), "MMMM 'de' yyyy", { locale: ptBR });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Data prevista: "qua, 09/12" no ano corrente; "qua, 10/03/2027" em outro ano. */
export function formatarDataPrevista(data: string, hoje: string): string {
  return data.slice(0, 4) === hoje.slice(0, 4) ? formatarDataCurta(data) : `${formatarDataCurta(data)}/${data.slice(0, 4)}`;
}
