"use client";

import { useState, useTransition } from "react";
import { Target } from "lucide-react";
import { toast } from "sonner";
import { definirAlvos } from "@/actions/itens";
import { EVENTO_ABRIR_AJUSTES } from "@/components/ajustes/ajustes-dialogo";
import { ImagemItem } from "@/components/desejos/imagem-item";
import { BotaoSimular } from "@/components/simulador/simulador";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatarDataPrevista } from "@/lib/datas";
import type { Item } from "@/lib/db/schema";
import { formatarBRL } from "@/lib/dinheiro";
import {
  formatarPrazo,
  preverItens,
  resumirAlvos,
  type ContextoDoPlano,
  type PrevisaoDoItem,
  type ResumoDosAlvos,
} from "@/lib/plano";
import { BarraProgresso } from "./barra-progresso";
import { GraficoDoPlano, type MarcoDoGrafico } from "./grafico-do-plano";
import { AvisoDoPrazo, TextoDaPrevisao, textoDoTotal } from "./previsao";
import { SeletorAlvos } from "./seletor-alvos";

function abrirAjustes() {
  window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_AJUSTES));
}

/** "Seus alvos" e o gráfico do saldo previsto, no Início. */
export function SeusAlvos({ desejos, ctx }: { desejos: Item[]; ctx: ContextoDoPlano }) {
  const [aberto, setAberto] = useState(false);
  const previsoes = preverItens(desejos, ctx);
  const alvos = previsoes.filter((p) => p.alvo);
  const resumo = resumirAlvos(previsoes);
  const porId = new Map(desejos.map((d) => [d.id, d]));

  const marcos: MarcoDoGrafico[] = alvos.map((p, i) => ({
    numero: i + 1,
    nome: porId.get(p.id)?.nome ?? "",
    acumulado: p.acumulado,
    semanas: p.semanas,
    data: p.data,
  }));

  return (
    <>
      <section aria-labelledby="titulo-alvos" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="titulo-alvos" className="text-xl font-semibold">
            Seus alvos
          </h2>
          {desejos.length > 0 ? (
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => setAberto(true)}>
                <Target />
                {alvos.length === 0 ? "Escolher alvos" : "Mudar alvos"}
              </Button>
              <BotaoSimular />
            </div>
          ) : null}
        </div>

        {alvos.length === 0 || !resumo ? (
          <div className="flex flex-col items-start gap-3 rounded-3xl border border-dashed bg-card/60 p-5 sm:flex-row sm:items-center">
            <p className="flex-1 text-pretty text-muted-foreground">
              {desejos.length === 0
                ? "Adicione desejos na lista para escolher seus alvos."
                : "Escolha um ou mais desejos para juntar dinheiro primeiro."}
            </p>
            {desejos.length > 0 ? <Button onClick={() => setAberto(true)}>Escolher alvos</Button> : null}
          </div>
        ) : (
          <div className="overflow-hidden rounded-3xl bg-card shadow-cartao">
            <ol className="divide-y">
              {alvos.map((previsao, i) => {
                const item = porId.get(previsao.id);
                return item ? (
                  <LinhaDoAlvo key={item.id} item={item} previsao={previsao} numero={i + 1} hoje={ctx.hoje} />
                ) : null;
              })}
            </ol>
            <Resumo resumo={resumo} hoje={ctx.hoje} />
          </div>
        )}

        <DialogoAlvos desejos={desejos} aberto={aberto} onAbertoChange={setAberto} />
      </section>

      {/* Sem aporte semanal não há projeção: o resumo dos alvos já pede para definir o aporte. */}
      {alvos.length > 0 && ctx.aporteSemanal > 0 ? (
        <section aria-labelledby="titulo-grafico" className="space-y-3">
          <div>
            <h2 id="titulo-grafico" className="text-xl font-semibold">
              Saldo previsto
            </h2>
            <p className="text-sm text-pretty text-muted-foreground">
              Cada degrau é um aporte de {formatarBRL(ctx.aporteSemanal)}. As linhas tracejadas são o valor de cada
              alvo, e os números marcam quando ele cabe no caixa.
            </p>
          </div>
          <div className="rounded-3xl bg-card p-3 pt-4 shadow-cartao sm:p-5">
            <GraficoDoPlano ctx={ctx} marcos={marcos} />
          </div>
        </section>
      ) : null}
    </>
  );
}

function LinhaDoAlvo({
  item,
  previsao,
  numero,
  hoje,
}: {
  item: Item;
  previsao: PrevisaoDoItem;
  numero: number;
  hoje: string;
}) {
  const { semanas, data, alocado, prazo } = previsao;
  const falta = item.preco - alocado;

  return (
    <li className="flex gap-3 px-4 py-4 sm:gap-4 sm:px-5">
      <div className="relative shrink-0">
        <ImagemItem
          nome={item.nome}
          emoji={item.emoji}
          imagem={item.imagem}
          className="size-14 rounded-2xl"
          tamanhoEmoji="text-2xl"
        />
        <span
          aria-hidden
          className="numero absolute -top-1.5 -left-1.5 flex size-6 items-center justify-center rounded-full bg-rosa-tinta text-xs font-bold text-card ring-2 ring-card"
        >
          {numero}
        </span>
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div className="flex items-start justify-between gap-3">
          <h3 className="line-clamp-2 min-w-0 font-sans leading-snug font-semibold">
            <span className="sr-only">Alvo {numero}: </span>
            {item.nome}
          </h3>
          <span className="numero shrink-0 font-semibold">{formatarBRL(item.preco)}</span>
        </div>

        <BarraProgresso valor={alocado} total={item.preco} rotulo={`Já guardado para ${item.nome}`} />

        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm">
          <span className={falta <= 0 ? "font-semibold text-verde" : "text-muted-foreground"}>
            {falta <= 0 ? (
              "Valor completo no caixa"
            ) : (
              <>
                Faltam <span className="numero">{formatarBRL(falta)}</span>
              </>
            )}
          </span>
          <TextoDaPrevisao semanas={semanas} data={data} hoje={hoje} />
        </div>

        {prazo ? <AvisoDoPrazo prazo={prazo} /> : null}
      </div>
    </li>
  );
}

function Resumo({ resumo, hoje }: { resumo: ResumoDosAlvos; hoje: string }) {
  const { semanas, data, total, quantidade } = resumo;
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 border-t bg-muted/50 px-4 py-3.5 sm:px-5">
      {semanas === null || data === null ? (
        <SemAporte texto="Defina o aporte semanal para saber quando chega." />
      ) : (
        <div>
          <p className="font-semibold">{textoDoTotal(semanas)}</p>
          <p className="text-sm text-muted-foreground">
            {semanas === 0
              ? quantidade === 1
                ? "O alvo já cabe no caixa."
                : "Os alvos já cabem no caixa."
              : `${semanas >= 4 ? `${formatarPrazo(semanas)} · ` : ""}${formatarDataPrevista(data, hoje)}`}
          </p>
        </div>
      )}
      <div className="text-right">
        <p className="text-sm text-muted-foreground">Total dos alvos</p>
        <p className="numero font-semibold">{formatarBRL(total)}</p>
      </div>
    </div>
  );
}

function SemAporte({ texto }: { texto: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <p className="text-sm text-pretty text-muted-foreground">{texto}</p>
      <Button size="sm" variant="secondary" onClick={abrirAjustes}>
        Definir aporte
      </Button>
    </div>
  );
}

function DialogoAlvos({
  desejos,
  aberto,
  onAbertoChange,
}: {
  desejos: Item[];
  aberto: boolean;
  onAbertoChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={aberto} onOpenChange={onAbertoChange}>
      <DialogContent className="sm:max-w-lg">
        <Formulario desejos={desejos} aoTerminar={() => onAbertoChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function Formulario({ desejos, aoTerminar }: { desejos: Item[]; aoTerminar: () => void }) {
  const [ids, setIds] = useState(() => desejos.filter((d) => d.alvo).map((d) => d.id));
  const [salvando, iniciar] = useTransition();

  function salvar() {
    iniciar(async () => {
      const r = await definirAlvos(ids);
      if (!r.ok) return void toast.error(r.erro);
      toast.success(ids.length === 0 ? "Alvos removidos." : "Alvos salvos.");
      aoTerminar();
    });
  }

  return (
    <div className="grid gap-5">
      <DialogHeader>
        <DialogTitle>Escolher alvos</DialogTitle>
        <DialogDescription>
          Os alvos são comprados na ordem da lista. Para mudar a ordem, arraste os cards em Desejos.
        </DialogDescription>
      </DialogHeader>
      <SeletorAlvos desejos={desejos} valor={ids} onChange={setIds} />
      <DialogFooter>
        <DialogClose asChild>
          <Button variant="outline">Cancelar</Button>
        </DialogClose>
        <Button onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar alvos"}
        </Button>
      </DialogFooter>
    </div>
  );
}
