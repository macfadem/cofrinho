"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import { FlaskConical } from "lucide-react";
import { toast } from "sonner";
import { aplicarSimulacao, type MudancasDoSimulador } from "@/actions/ajustes";
import { EVENTO_APORTE } from "@/components/caixa/dialogo-aporte";
import { CampoValor } from "@/components/campo-valor";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { formatarDataPrevista } from "@/lib/datas";
import type { Item } from "@/lib/db/schema";
import { formatarBRL, formatarSemSimbolo, lerValor } from "@/lib/dinheiro";
import {
  aplicarCenario,
  compararPlanos,
  contextoDoPlano,
  mudancasDoCenario,
  preverItens,
  type Cenario,
  type ComparacaoDoItem,
  type EntradaAporte,
  type MudancaDoCenario,
  type PrevisaoDoItem,
  type ResumoDosAlvos,
} from "@/lib/plano";
import { cn } from "@/lib/utils";

export const EVENTO_ABRIR_SIMULADOR = "cofrinho:abrir-simulador";

export function abrirSimulador() {
  window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_SIMULADOR));
}

/** Botão "Simular" (atalho: S). */
export function BotaoSimular({ className }: { className?: string }) {
  return (
    <Button
      variant="secondary"
      size="sm"
      onClick={abrirSimulador}
      aria-keyshortcuts="S"
      title="Simular (atalho: S)"
      className={className}
    >
      <FlaskConical />
      Simular
    </Button>
  );
}

type Props = { desejos: Item[]; saldo: number; entrada: EntradaAporte };

/** Painel lateral do simulador: nada é salvo até clicar em "Aplicar". */
export function Simulador(props: Props) {
  const [aberto, setAberto] = useState(false);
  // Ao fechar, o foco volta para onde estava (o painel também abre pelo atalho S).
  const focoAnterior = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const abrir = () => {
      focoAnterior.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setAberto(true);
    };
    window.addEventListener(EVENTO_ABRIR_SIMULADOR, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_SIMULADOR, abrir);
  }, []);

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetContent
        className="gap-0 p-0"
        onCloseAutoFocus={(e) => {
          const anterior = focoAnterior.current;
          if (anterior?.isConnected && anterior !== document.body) {
            e.preventDefault();
            anterior.focus();
          }
        }}
      >
        {/* O painel é montado a cada abertura: sempre começa do plano atual. */}
        <Painel {...props} aoTerminar={() => setAberto(false)} />
      </SheetContent>
    </Sheet>
  );
}

function Painel({ desejos, saldo, entrada, aoTerminar }: Props & { aoTerminar: () => void }) {
  const id = useId();
  const aporteAtual = entrada.aporteSemanal;
  const alvosAtuais = useMemo(() => desejos.filter((d) => d.alvo).map((d) => d.id), [desejos]);

  const [textoAporte, setTextoAporte] = useState(() => formatarSemSimbolo(aporteAtual));
  const [textoExtra, setTextoExtra] = useState("");
  const [textoPrecos, setTextoPrecos] = useState<Record<number, string>>({});
  const [alvos, setAlvos] = useState<number[]>(alvosAtuais);
  const [naoSalvar, setNaoSalvar] = useState<ReadonlySet<string>>(new Set());
  const [salvando, iniciar] = useTransition();

  const cenario: Cenario = {
    aporteSemanal: lerValor(textoAporte) ?? aporteAtual,
    aporteExtra: lerValor(textoExtra) ?? 0,
    precos: Object.fromEntries(
      Object.entries(textoPrecos).flatMap(([idItem, texto]) => {
        const valor = lerValor(texto);
        return valor !== null && valor > 0 ? [[Number(idItem), valor]] : [];
      }),
    ),
    alvos,
  };

  const antes = useMemo(() => preverItens(desejos, contextoDoPlano(saldo, entrada)), [desejos, saldo, entrada]);
  const simulado = aplicarCenario(desejos, saldo, entrada, cenario);
  const comparacao = compararPlanos(antes, preverItens(simulado.itens, simulado.ctx));
  const porId = new Map(comparacao.itens.map((c) => [c.id, c]));
  const mudancas = mudancasDoCenario(desejos, aporteAtual, cenario);
  const escolhidas = mudancas.filter((m) => !naoSalvar.has(m.chave));
  const nomes = new Map(desejos.map((d) => [d.id, d.nome]));

  function desfazerTudo() {
    setTextoAporte(formatarSemSimbolo(aporteAtual));
    setTextoExtra("");
    setTextoPrecos({});
    setAlvos(alvosAtuais);
    setNaoSalvar(new Set());
  }

  function aplicar() {
    const precos: { id: number; preco: number }[] = [];
    const alvosMudados: { id: number; alvo: boolean }[] = [];
    const pedido: MudancasDoSimulador = { precos, alvos: alvosMudados };
    for (const m of escolhidas) {
      if (m.tipo === "aporte") pedido.aporteSemanal = m.para;
      else if (m.tipo === "extra") pedido.aporteExtra = m.valor;
      else if (m.tipo === "preco") precos.push({ id: m.id, preco: m.para });
      else alvosMudados.push({ id: m.id, alvo: m.alvo });
    }
    iniciar(async () => {
      const r = await aplicarSimulacao(pedido);
      if (!r.ok) return void toast.error(r.erro);
      if (pedido.aporteExtra) window.dispatchEvent(new CustomEvent(EVENTO_APORTE));
      toast.success(escolhidas.length === 1 ? "Mudança salva." : `${escolhidas.length} mudanças salvas.`);
      aoTerminar();
    });
  }

  return (
    <>
      <SheetHeader className="gap-1 border-b px-5 pt-5 pb-4 sm:px-6">
        <SheetTitle className="font-display text-2xl font-bold">Simular</SheetTitle>
        <SheetDescription className="pr-6 text-pretty">
          Teste mudanças à vontade. Nada é salvo até você clicar em Aplicar.
        </SheetDescription>
        <ResumoDaComparacao {...comparacao.alvos} hoje={entrada.hoje} />
      </SheetHeader>

      <div className="flex-1 space-y-7 overflow-y-auto px-5 py-5 sm:px-6">
        <section aria-labelledby={`${id}-aporte`} className="space-y-3">
          <h3 id={`${id}-aporte`} className="font-sans text-base font-semibold">
            Aporte
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor={`${id}-semanal`}>Por semana</Label>
              <CampoValor id={`${id}-semanal`} value={textoAporte} onChange={setTextoAporte} placeholder="0,00" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor={`${id}-extra`}>Extra agora</Label>
              <CampoValor id={`${id}-extra`} value={textoExtra} onChange={setTextoExtra} placeholder="0,00" />
            </div>
          </div>
        </section>

        <section aria-labelledby={`${id}-alvos`} className="space-y-3">
          <div>
            <h3 id={`${id}-alvos`} className="font-sans text-base font-semibold">
              Alvos
            </h3>
            <p className="text-sm text-pretty text-muted-foreground">
              Ligue ou desligue alvos e mude o preço de cada um.
            </p>
          </div>
          {desejos.length === 0 ? (
            <p className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
              Sua lista de desejos está vazia.
            </p>
          ) : (
            <ul className="divide-y rounded-2xl border">
              {desejos.map((item) => (
                <LinhaDoItem
                  key={item.id}
                  item={item}
                  alvo={alvos.includes(item.id)}
                  eraAlvo={item.alvo}
                  textoPreco={textoPrecos[item.id]}
                  comparacao={porId.get(item.id)}
                  hoje={entrada.hoje}
                  onAlvo={(ligado) =>
                    setAlvos((atual) => (ligado ? [...atual, item.id] : atual.filter((x) => x !== item.id)))
                  }
                  onPreco={(texto) => setTextoPrecos((atual) => ({ ...atual, [item.id]: texto }))}
                />
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby={`${id}-salvar`} className="space-y-3">
          <div>
            <h3 id={`${id}-salvar`} className="font-sans text-base font-semibold">
              O que salvar
            </h3>
            <p className="text-sm text-pretty text-muted-foreground">
              {mudancas.length === 0
                ? "Nada mudou ainda."
                : "Desmarque o que você não quer salvar. O resto fica só na simulação."}
            </p>
          </div>
          {mudancas.length > 0 ? (
            <ul className="space-y-2.5">
              {mudancas.map((m) => (
                <li key={m.chave} className="flex items-start gap-2.5">
                  <Checkbox
                    id={`${id}-${m.chave}`}
                    checked={!naoSalvar.has(m.chave)}
                    onCheckedChange={(marcado) =>
                      setNaoSalvar((atual) => {
                        const nova = new Set(atual);
                        if (marcado === true) nova.delete(m.chave);
                        else nova.add(m.chave);
                        return nova;
                      })
                    }
                  />
                  <Label htmlFor={`${id}-${m.chave}`} className="block pt-0.5 leading-snug font-normal">
                    {textoDaMudanca(m, nomes)}
                  </Label>
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      </div>

      <SheetFooter className="mt-0 flex-row items-center justify-end gap-2 border-t px-5 py-4 sm:px-6">
        <Button variant="ghost" onClick={desfazerTudo} disabled={mudancas.length === 0 || salvando}>
          Desfazer tudo
        </Button>
        <Button onClick={aplicar} disabled={escolhidas.length === 0 || salvando}>
          {salvando ? "Salvando..." : escolhidas.length > 0 ? `Aplicar (${escolhidas.length})` : "Aplicar"}
        </Button>
      </SheetFooter>
    </>
  );
}

// --- Peças ---------------------------------------------------------------------------

function semanas(n: number) {
  return `${n} ${n === 1 ? "semana" : "semanas"}`;
}

function textoDoResumo(resumo: ResumoDosAlvos | null): string {
  if (!resumo) return "sem alvos";
  if (resumo.semanas === null) return "sem previsão";
  return resumo.semanas === 0 ? "agora" : semanas(resumo.semanas);
}

function textoDaPrevisao(p: PrevisaoDoItem, hoje: string): string {
  if (p.semanas === null || p.data === null) return "sem previsão";
  return p.semanas === 0 ? "agora" : formatarDataPrevista(p.data, hoje);
}

/** "3 semanas antes" (verde), "2 semanas depois" (vermelho) ou "sem mudança". */
function SeloDaDiferenca({ diferenca, className }: { diferenca: number | null; className?: string }) {
  if (diferenca === null) return null;
  const tom =
    diferenca < 0
      ? "bg-verde-suave text-verde"
      : diferenca > 0
        ? "bg-vermelho-suave text-vermelho"
        : "bg-muted text-muted-foreground";
  const texto =
    diferenca < 0 ? `${semanas(-diferenca)} antes` : diferenca > 0 ? `${semanas(diferenca)} depois` : "sem mudança";
  return (
    <span className={cn("inline-flex w-fit rounded-full px-2 py-0.5 text-xs font-semibold", tom, className)}>
      {texto}
    </span>
  );
}

function ResumoDaComparacao({
  antes,
  depois,
  diferenca,
  hoje,
}: {
  antes: ResumoDosAlvos | null;
  depois: ResumoDosAlvos | null;
  diferenca: number | null;
  hoje: string;
}) {
  const data = (r: ResumoDosAlvos | null) => (r?.data ? formatarDataPrevista(r.data, hoje) : "—");
  return (
    <div className="mt-3 rounded-2xl bg-muted/70 p-3.5">
      <p className="text-sm font-semibold text-muted-foreground">Todos os alvos juntos</p>
      {depois === null ? (
        <p className="mt-1 text-sm text-pretty">Nenhum alvo ligado. Ligue alvos abaixo para comparar.</p>
      ) : (
        <div className="mt-1 flex flex-wrap items-end justify-between gap-x-3 gap-y-1.5">
          <div>
            <p className="numero text-lg leading-snug font-semibold">
              <span className="text-muted-foreground">{textoDoResumo(antes)}</span>
              <span> → </span>
              {textoDoResumo(depois)}
            </p>
            <p className="text-sm text-muted-foreground">
              {data(antes)} → {data(depois)}
            </p>
          </div>
          <SeloDaDiferenca diferenca={diferenca} className="text-sm" />
        </div>
      )}
      <p className="sr-only" aria-live="polite">
        {depois === null
          ? "Nenhum alvo ligado."
          : `Todos os alvos: ${textoDoResumo(depois)}${
              diferenca ? `, ${semanas(Math.abs(diferenca))} ${diferenca < 0 ? "antes" : "depois"}` : ""
            }.`}
      </p>
    </div>
  );
}

function LinhaDoItem({
  item,
  alvo,
  eraAlvo,
  textoPreco,
  comparacao,
  hoje,
  onAlvo,
  onPreco,
}: {
  item: Item;
  alvo: boolean;
  eraAlvo: boolean;
  textoPreco: string | undefined;
  comparacao: ComparacaoDoItem | undefined;
  hoje: string;
  onAlvo: (ligado: boolean) => void;
  onPreco: (texto: string) => void;
}) {
  const id = useId();
  return (
    <li className="px-3.5 py-3">
      <div className="flex items-center gap-3">
        <Switch id={id} checked={alvo} onCheckedChange={onAlvo} />
        <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer text-sm leading-snug font-semibold">
          {item.nome}
          <span className="sr-only"> (alvo)</span>
        </label>
        {alvo ? (
          <CampoValor
            value={textoPreco ?? formatarSemSimbolo(item.preco)}
            onChange={onPreco}
            aria-label={`Preço de ${item.nome}`}
            className="w-32 shrink-0"
            classeCampo="h-9 pl-9 text-sm md:text-sm"
          />
        ) : (
          <span className="numero shrink-0 text-sm text-muted-foreground">{formatarBRL(item.preco)}</span>
        )}
      </div>
      {alvo && comparacao ? (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 pl-14 text-xs text-muted-foreground">
          {!eraAlvo ? <span className="font-semibold text-foreground">Novo alvo ·</span> : null}
          <span>
            {textoDaPrevisao(comparacao.antes, hoje)} → <strong className="text-foreground">{textoDaPrevisao(comparacao.depois, hoje)}</strong>
          </span>
          {comparacao.diferenca ? <SeloDaDiferenca diferenca={comparacao.diferenca} /> : null}
        </p>
      ) : !alvo && eraAlvo ? (
        <p className="mt-1.5 pl-14 text-xs text-muted-foreground">Sai dos alvos</p>
      ) : null}
    </li>
  );
}

function textoDaMudanca(m: MudancaDoCenario, nomes: Map<number, string>): string {
  switch (m.tipo) {
    case "aporte":
      return `Aporte semanal: ${formatarBRL(m.de)} → ${formatarBRL(m.para)}`;
    case "extra":
      return `Aporte extra de ${formatarBRL(m.valor)} hoje (entra no histórico)`;
    case "preco":
      return `Preço de ${nomes.get(m.id)}: ${formatarBRL(m.de)} → ${formatarBRL(m.para)}`;
    case "alvo":
      return m.alvo ? `${nomes.get(m.id)} vira alvo` : `${nomes.get(m.id)} deixa de ser alvo`;
  }
}
