"use client";

import { useState, type CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  CalendarClock,
  EllipsisVertical,
  ExternalLink,
  GripVertical,
  ImageIcon,
  Pencil,
  ShoppingBag,
  Tag,
  Target,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AvisoDoPrazo, SeloCabeNoCaixa, SeloDoImpacto, SeloPrecoAlvo, TextoDaPrevisao } from "@/components/plano/previsao";
import type { Item } from "@/lib/db/schema";
import { formatarBRL } from "@/lib/dinheiro";
import type { PrevisaoDoItem } from "@/lib/plano";
import { arquivoDeImagem, pareceImagem, urlDeImagem } from "@/lib/transferencia";
import { cn } from "@/lib/utils";
import { CampoNoCard } from "./campo-no-card";
import { ImagemItem } from "./imagem-item";

export type AcoesDoCard = {
  onAlvo: (item: Item) => void;
  onEditar: (item: Item) => void;
  onComprei: (item: Item) => void;
  onExcluir: (item: Item) => void;
  onSalvarNome: (item: Item, nome: string) => Promise<boolean>;
  onSalvarPreco: (item: Item, preco: number) => Promise<boolean>;
  /** Abre o diálogo de imagem. */
  onImagem: (item: Item) => void;
  /** Imagem solta direto no card (arquivo ou endereço). */
  onSoltarImagem: (item: Item, origem: File | string) => void;
};

/** O que o plano diz sobre o item. */
export type PlanoDoCard = {
  hoje: string;
  previsao: PrevisaoDoItem | null;
  /** Semanas que comprar agora atrasa os alvos (só em quem não é alvo; null = não mostrar). */
  impacto: number | null;
  /** Sem alvos: o preço cabe no saldo de agora. */
  cabeNoCaixa: boolean;
};

/** Card de um desejo: arrastável, com alvo, nome e preço editáveis e menu. */
export function CartaoDesejo({
  item,
  posicao,
  plano,
  acoes,
}: {
  item: Item;
  posicao: number;
  plano: PlanoDoCard;
  acoes: AcoesDoCard;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const [recebendo, setRecebendo] = useState(false);

  const estilo: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={estilo}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-3xl bg-card shadow-cartao",
        item.alvo && "ring-2 ring-verde",
        isDragging && "z-20 shadow-flutuante",
      )}
    >
      <div className="relative">
        <button
          type="button"
          onClick={() => acoes.onImagem(item)}
          aria-label={`Imagem de ${item.nome}: trocar`}
          title="Trocar imagem (ou solte uma imagem aqui)"
          onDragOver={(e) => {
            if (!pareceImagem(e.dataTransfer)) return;
            e.preventDefault();
            setRecebendo(true);
          }}
          onDragLeave={() => setRecebendo(false)}
          onDrop={(e) => {
            setRecebendo(false);
            const origem = arquivoDeImagem(e.dataTransfer) ?? urlDeImagem(e.dataTransfer);
            if (!origem) return;
            e.preventDefault();
            acoes.onSoltarImagem(item, origem);
          }}
          className="group/imagem relative block w-full outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60 focus-visible:ring-inset"
        >
          <ImagemItem
            nome={item.nome}
            emoji={item.emoji}
            imagem={item.imagem}
            className="aspect-[4/3] sm:aspect-[16/9]"
            tamanhoEmoji="text-4xl sm:text-5xl"
          />
          <span
            aria-hidden
            className={cn(
              "absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 bg-foreground/55 py-1.5 text-xs font-semibold text-background opacity-0 transition-opacity group-hover/imagem:opacity-100 group-focus-visible/imagem:opacity-100",
              recebendo && "inset-y-0 bg-primary/80 text-sm opacity-100",
            )}
          >
            <ImageIcon className="size-3.5" />
            {recebendo ? "Solte para usar esta imagem" : "Trocar imagem"}
          </span>
        </button>

        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          aria-label={`Mudar a prioridade de ${item.nome} (posição ${posicao})`}
          className="absolute top-2 left-2 flex h-8 cursor-grab touch-none items-center gap-0.5 rounded-full bg-card/85 shadow-sm ring-1 ring-foreground/10 pr-2.5 pl-1.5 text-xs font-bold backdrop-blur sm:top-3 sm:left-3 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60 active:cursor-grabbing"
        >
          <GripVertical className="size-4 text-muted-foreground" aria-hidden />
          <span className="numero">{posicao}</span>
        </button>

        <button
          type="button"
          aria-pressed={item.alvo}
          aria-label={item.alvo ? `${item.nome} é alvo. Tirar dos alvos` : `Marcar ${item.nome} como alvo`}
          onClick={() => acoes.onAlvo(item)}
          className={cn(
            "absolute top-2 right-2 flex h-8 items-center gap-1.5 rounded-full px-2 text-xs font-bold backdrop-blur transition-colors sm:top-3 sm:right-3 sm:px-3 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/60",
            item.alvo
              ? "bg-verde text-white dark:text-background"
              : "bg-card/85 text-muted-foreground shadow-sm ring-1 ring-foreground/10 hover:bg-card hover:text-foreground",
          )}
        >
          <Target className="size-4" aria-hidden />
          <span className="hidden sm:inline">Alvo</span>
        </button>
      </div>

      <div className="flex flex-1 flex-col gap-1 p-3 sm:p-4 sm:pt-3">
        <div className="flex items-start gap-1">
          <CampoNoCard
            tipo="texto"
            rotulo="Nome"
            valor={item.nome}
            onSalvar={(nome) => acoes.onSalvarNome(item, nome)}
            className="min-w-0 flex-1 text-sm leading-snug font-semibold sm:text-base"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                className="-mt-1 -mr-2 shrink-0"
                aria-label={`Opções de ${item.nome}`}
              >
                <EllipsisVertical />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => acoes.onEditar(item)}>
                <Pencil />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => acoes.onImagem(item)}>
                <ImageIcon />
                Trocar imagem
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => acoes.onComprei(item)}>
                <ShoppingBag />
                Comprei
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => acoes.onExcluir(item)}>
                <Trash2 />
                Excluir
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <CampoNoCard
          tipo="dinheiro"
          rotulo="Preço"
          valor={item.preco}
          onSalvar={(preco) => acoes.onSalvarPreco(item, preco)}
          className="numero w-fit text-lg font-bold sm:text-2xl"
        />

        <Detalhes item={item} plano={plano} />
      </div>
    </li>
  );
}

function Detalhes({ item, plano }: { item: Item; plano: PlanoDoCard }) {
  const { previsao, impacto, hoje } = plano;
  const agora = previsao?.semanas === 0;
  const bateuPrecoAlvo = item.precoAlvo !== null && item.preco <= item.precoAlvo;

  const linhas = [
    previsao && previsao.semanas !== null && (
      <li key="previsao" className="flex items-start gap-1.5">
        <CalendarClock className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        <span>
          <span className="sr-only">Previsão: </span>
          <TextoDaPrevisao semanas={previsao.semanas} data={previsao.data} hoje={hoje} />
        </span>
      </li>
    ),
    impacto !== null && (
      <li key="impacto">
        <SeloDoImpacto semanas={impacto} />
      </li>
    ),
    plano.cabeNoCaixa && !agora && (
      <li key="cabe">
        <SeloCabeNoCaixa />
      </li>
    ),
    item.precoAlvo !== null &&
      (bateuPrecoAlvo ? (
        <li key="preco-alvo">
          <SeloPrecoAlvo />
        </li>
      ) : (
        <li key="preco-alvo" className="flex items-center gap-1.5">
          <Tag className="size-3.5 shrink-0" aria-hidden />
          Preço-alvo {formatarBRL(item.precoAlvo)}
        </li>
      )),
    previsao?.prazo && (
      <li key="prazo">
        <AvisoDoPrazo prazo={previsao.prazo} />
      </li>
    ),
    item.nota && (
      <li key="nota" className="line-clamp-2 text-pretty">
        {item.nota}
      </li>
    ),
    item.link && (
      <li key="link">
        <a
          href={item.link}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 font-semibold text-foreground underline-offset-4 hover:underline"
        >
          <ExternalLink className="size-3.5" aria-hidden />
          Ver produto
          <span className="sr-only"> (abre em nova aba)</span>
        </a>
      </li>
    ),
  ].filter(Boolean);

  if (linhas.length === 0) return null;
  return <ul className="mt-1.5 space-y-1.5 text-xs text-muted-foreground sm:mt-2 sm:text-sm">{linhas}</ul>;
}
