"use client";

import { useId } from "react";
import { useReducedMotion } from "motion/react";
import { Area, AreaChart, CartesianGrid, ReferenceDot, ReferenceLine, XAxis, YAxis } from "recharts";
import { ChartContainer, ChartTooltip, type ChartConfig } from "@/components/ui/chart";
import { adicionarDias, diasEntre, formatarDataCurta, formatarDataPrevista } from "@/lib/datas";
import { formatarBRL } from "@/lib/dinheiro";
import { projecaoDoSaldo, type ContextoDoPlano } from "@/lib/plano";

const CONFIG = {
  saldo: { label: "Saldo previsto", color: "var(--verde)" },
} satisfies ChartConfig;

const compacto = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

const MIN_SEMANAS = 8;
const MAX_SEMANAS = 260; // 5 anos

/** Marcas redondas para o eixo do dinheiro (de 0 até cobrir o máximo, em até 5 faixas). */
function marcasDoDinheiro(maximo: number): number[] {
  if (maximo <= 0) return [0];
  const alvo = maximo / 5;
  const potencia = 10 ** Math.floor(Math.log10(alvo));
  const passo = [1, 2, 2.5, 5, 10].map((m) => m * potencia).find((p) => p >= alvo) ?? 10 * potencia;
  return Array.from({ length: Math.ceil(maximo / passo) + 1 }, (_, i) => i * passo);
}

/** "O alvo 1 já cabe", "Os alvos 1 e 2 já cabem", "Todos os alvos já cabem"… */
function textoDosAlcancados(alcancados: number, total: number): string | null {
  if (alcancados <= 0) return null;
  if (alcancados === total) return total === 1 ? "O alvo já cabe" : "Todos os alvos já cabem";
  if (alcancados === 1) return "O alvo 1 já cabe";
  if (alcancados === 2) return "Os alvos 1 e 2 já cabem";
  return `Os alvos 1 a ${alcancados} já cabem`;
}

export type MarcoDoGrafico = {
  /** Número do alvo (1, 2, 3…), igual ao da lista. */
  numero: number;
  nome: string;
  /** Valor acumulado até este alvo (centavos). */
  acumulado: number;
  semanas: number | null;
  data: string | null;
};

/** Gráfico em degraus do saldo previsto, com uma linha e um marcador por alvo. */
export function GraficoDoPlano({ ctx, marcos }: { ctx: ContextoDoPlano; marcos: MarcoDoGrafico[] }) {
  const idGradiente = `preenchimento-${useId().replace(/:/g, "")}`;
  const reduzirMovimento = useReducedMotion();

  const semanasDoUltimo = Math.max(0, ...marcos.map((m) => m.semanas ?? 0));
  const horizonte = Math.min(MAX_SEMANAS, Math.max(MIN_SEMANAS, semanasDoUltimo + 2));
  const pontos = projecaoDoSaldo(ctx, horizonte);
  const ultimoDia = pontos.at(-1)?.dia ?? 0;
  const anoLongo = ultimoDia > 300;

  // Marcas do eixo: umas 6, em múltiplos de semana.
  const passo = Math.max(7, Math.ceil(ultimoDia / 6 / 7) * 7);
  const marcasX = Array.from({ length: Math.floor(ultimoDia / passo) + 1 }, (_, i) => i * passo);

  const marcasY = marcasDoDinheiro(Math.max(pontos.at(-1)?.saldo ?? 0, ...marcos.map((m) => m.acumulado)) * 1.04);
  const descricao =
    `Saldo previsto: ${formatarBRL(ctx.saldo)} hoje, mais ${formatarBRL(ctx.aporteSemanal)} por semana. ` +
    marcos
      .map((m) =>
        m.data ? `Alvo ${m.numero}, ${m.nome}: ${formatarDataPrevista(m.data, ctx.hoje)}.` : `Alvo ${m.numero}, ${m.nome}.`,
      )
      .join(" ");

  return (
    <figure>
      <figcaption className="sr-only">{descricao}</figcaption>
      <ChartContainer config={CONFIG} className="aspect-auto h-64 w-full sm:h-72" aria-hidden>
        <AreaChart data={pontos} margin={{ top: 18, right: 14, left: 0, bottom: 0 }} accessibilityLayer={false}>
          <defs>
            <linearGradient id={idGradiente} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-saldo)" stopOpacity={0.32} />
              <stop offset="100%" stopColor="var(--color-saldo)" stopOpacity={0.03} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} strokeDasharray="3 4" />
          <XAxis
            dataKey="dia"
            type="number"
            domain={[0, ultimoDia]}
            ticks={marcasX}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            tickFormatter={(dia: number) => {
              const data = adicionarDias(ctx.hoje, dia);
              return anoLongo ? `${data.slice(5, 7)}/${data.slice(2, 4)}` : `${data.slice(8, 10)}/${data.slice(5, 7)}`;
            }}
          />
          <YAxis
            width={70}
            tickLine={false}
            axisLine={false}
            domain={[Math.min(0, ctx.saldo), marcasY.at(-1) ?? 0]}
            ticks={marcasY}
            tickFormatter={(v: number) => compacto.format(v / 100)}
          />
          <ChartTooltip
            cursor={{ strokeDasharray: "3 3" }}
            content={({ active, payload }) => {
              const ponto = payload?.[0]?.payload as { data: string; saldo: number } | undefined;
              if (!active || !ponto) return null;
              const alcancados = textoDosAlcancados(
                marcos.filter((m) => m.data !== null && m.data <= ponto.data).length,
                marcos.length,
              );
              return (
                <div className="rounded-xl border bg-popover px-3 py-2 text-xs shadow-flutuante">
                  <p className="font-semibold">{formatarDataCurta(ponto.data)}</p>
                  <p className="text-muted-foreground">
                    Saldo previsto <span className="numero font-semibold text-foreground">{formatarBRL(ponto.saldo)}</span>
                  </p>
                  {alcancados ? <p className="mt-1 font-semibold text-verde">{alcancados}</p> : null}
                </div>
              );
            }}
          />
          {marcos.map((m) => (
            <ReferenceLine
              key={`linha-${m.numero}`}
              y={m.acumulado}
              stroke="var(--rosa)"
              strokeOpacity={0.55}
              strokeDasharray="5 5"
              ifOverflow="extendDomain"
            />
          ))}
          <Area
            dataKey="saldo"
            type="stepAfter"
            stroke="var(--color-saldo)"
            strokeWidth={2.5}
            fill={`url(#${idGradiente})`}
            isAnimationActive={!reduzirMovimento}
          />
          {marcos
            .filter((m) => m.data !== null && diasEntre(ctx.hoje, m.data) <= ultimoDia)
            .map((m) => (
              <ReferenceDot
                key={`ponto-${m.numero}`}
                x={diasEntre(ctx.hoje, m.data as string)}
                y={m.acumulado}
                r={11}
                ifOverflow="extendDomain"
                shape={(props: { cx?: number; cy?: number }) => (
                  <g>
                    <circle cx={props.cx} cy={props.cy} r={11} fill="var(--rosa-tinta)" stroke="var(--card)" strokeWidth={2.5} />
                    <text
                      x={props.cx}
                      y={props.cy}
                      dy={4}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight={700}
                      fill="var(--card)"
                    >
                      {m.numero}
                    </text>
                  </g>
                )}
              />
            ))}
        </AreaChart>
      </ChartContainer>
    </figure>
  );
}
