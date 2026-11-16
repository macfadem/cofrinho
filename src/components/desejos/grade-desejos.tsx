"use client";

import { useEffect, useMemo, useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import {
  arrayMove,
  rectSortingStrategy,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { toast } from "sonner";
import {
  definirAlvo,
  editarItem,
  excluirItem,
  reordenarItens,
  restaurarItem,
} from "@/actions/itens";
import { EVENTO_ABRIR_AJUSTES } from "@/components/ajustes/ajustes-dialogo";
import { EstadoVazio } from "@/components/estado-vazio";
import { Button } from "@/components/ui/button";
import type { Item } from "@/lib/db/schema";
import { impactoDeComprarAgora, preverItens, type ContextoDoPlano } from "@/lib/plano";
import { CartaoDesejo, type AcoesDoCard, type PlanoDoCard } from "./cartao-desejo";
import { enviarImagem } from "@/lib/transferencia";
import { DialogoComprei } from "./dialogo-comprei";
import { DialogoImagem } from "./dialogo-imagem";
import { DialogoItem } from "./dialogo-item";

const INSTRUCOES = {
  draggable:
    "Para mudar a prioridade, aperte espaço ou Enter, use as setas para mover e aperte espaço ou Enter de novo para soltar. Esc cancela.",
};

/** Grade de desejos na ordem de prioridade; arraste para reordenar. */
export function GradeDesejos({ itens, ctx }: { itens: Item[]; ctx: ContextoDoPlano }) {
  const [ordem, setOrdem] = useState(itens);
  const [selecionado, setSelecionado] = useState<Item | null>(null);
  const [dialogo, setDialogo] = useState<"editar" | "comprei" | "imagem" | null>(null);

  // A cada atualização do servidor, a grade volta a refletir o banco.
  useEffect(() => setOrdem(itens), [itens]);

  // O plano acompanha a ordem e os alvos na hora, antes mesmo de o servidor responder.
  const planos = useMemo(() => {
    const previsoes = new Map(preverItens(ordem, ctx).map((p) => [p.id, p]));
    const temAlvos = ordem.some((i) => i.alvo);
    return new Map(
      ordem.map((item): [number, PlanoDoCard] => [
        item.id,
        {
          hoje: ctx.hoje,
          previsao: previsoes.get(item.id) ?? null,
          impacto: item.alvo ? null : impactoDeComprarAgora(item.preco, ordem, ctx),
          cabeNoCaixa: !temAlvos && item.preco <= ctx.saldo,
        },
      ]),
    );
  }, [ordem, ctx]);

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const anuncios = useMemo<Announcements>(() => {
    const nome = (id: UniqueIdentifier) => ordem.find((i) => i.id === id)?.nome ?? "item";
    const posicao = (id: UniqueIdentifier) => ordem.findIndex((i) => i.id === id) + 1;
    const total = ordem.length;
    return {
      onDragStart: ({ active }) => `Pegou ${nome(active.id)}, na posição ${posicao(active.id)} de ${total}.`,
      onDragOver: ({ active, over }) =>
        over ? `${nome(active.id)} está na posição ${posicao(over.id)} de ${total}.` : `${nome(active.id)} está fora da lista.`,
      onDragEnd: ({ active, over }) =>
        over ? `${nome(active.id)} ficou na posição ${posicao(over.id)} de ${total}.` : `${nome(active.id)} foi solto.`,
      onDragCancel: ({ active }) => `Movimento cancelado. ${nome(active.id)} voltou ao lugar.`,
    };
  }, [ordem]);

  function aoSoltar({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const de = ordem.findIndex((i) => i.id === active.id);
    const para = ordem.findIndex((i) => i.id === over.id);
    const nova = arrayMove(ordem, de, para);
    setOrdem(nova);
    reordenarItens(nova.map((i) => i.id)).then((r) => {
      if (!r.ok) {
        toast.error(r.erro);
        setOrdem(itens);
      }
    });
  }

  const acoes: AcoesDoCard = {
    onAlvo(item) {
      const alvo = !item.alvo;
      setOrdem((o) => o.map((i) => (i.id === item.id ? { ...i, alvo } : i)));
      definirAlvo(item.id, alvo).then((r) => {
        if (!r.ok) {
          toast.error(r.erro);
          setOrdem(itens);
        }
      });
    },
    onEditar(item) {
      setSelecionado(item);
      setDialogo("editar");
    },
    onComprei(item) {
      setSelecionado(item);
      setDialogo("comprei");
    },
    onExcluir(item) {
      setOrdem((o) => o.filter((i) => i.id !== item.id));
      excluirItem(item.id).then((r) => {
        if (!r.ok) {
          toast.error(r.erro);
          setOrdem(itens);
          return;
        }
        toast(`${item.nome} saiu da lista.`, {
          duration: 5000,
          action: {
            label: "Desfazer",
            onClick: async () => {
              const volta = await restaurarItem(item.id);
              if (!volta.ok) toast.error(volta.erro);
            },
          },
        });
      });
    },
    async onSalvarNome(item, nome) {
      const r = await editarItem({ id: item.id, nome });
      if (!r.ok) toast.error(r.erro);
      return r.ok;
    },
    onImagem(item) {
      setSelecionado(item);
      setDialogo("imagem");
    },
    onSoltarImagem(item, origem) {
      const promessa = enviarImagem(item.id, origem).then((r) => {
        if (!r.ok) throw new Error(r.erro);
      });
      toast.promise(promessa, {
        loading: "Salvando a imagem...",
        success: `Imagem de ${item.nome} atualizada.`,
        error: (e: Error) => e.message,
      });
    },
    async onSalvarPreco(item, preco) {
      const r = await editarItem({ id: item.id, preco });
      if (!r.ok) toast.error(r.erro);
      return r.ok;
    },
  };

  if (ordem.length === 0) {
    return (
      <EstadoVazio emoji="🎁" titulo="Sua lista está vazia">
        Escreva o nome e o valor de um desejo na barra acima e aperte Enter.
      </EstadoVazio>
    );
  }

  return (
    <>
      {ctx.aporteSemanal <= 0 ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-amarelo-suave px-4 py-3 text-sm text-amarelo">
          <p className="font-semibold text-pretty">Sem aporte semanal, não dá para prever as datas.</p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_AJUSTES))}
          >
            Definir aporte
          </Button>
        </div>
      ) : null}

      <DndContext
        id="lista-de-desejos"
        sensors={sensores}
        collisionDetection={closestCenter}
        onDragEnd={aoSoltar}
        accessibility={{ announcements: anuncios, screenReaderInstructions: INSTRUCOES }}
      >
        <SortableContext items={ordem.map((i) => i.id)} strategy={rectSortingStrategy}>
          <ul aria-label="Desejos em ordem de prioridade" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
            {ordem.map((item, i) => (
              <CartaoDesejo
                key={item.id}
                item={item}
                posicao={i + 1}
                plano={planos.get(item.id) ?? { hoje: ctx.hoje, previsao: null, impacto: null, cabeNoCaixa: false }}
                acoes={acoes}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <DialogoItem
        item={selecionado}
        aberto={dialogo === "editar"}
        onAbertoChange={(v) => setDialogo(v ? "editar" : null)}
      />
      <DialogoImagem
        item={selecionado}
        aberto={dialogo === "imagem"}
        onAbertoChange={(v) => setDialogo(v ? "imagem" : null)}
      />
      <DialogoComprei
        item={selecionado}
        aberto={dialogo === "comprei"}
        onAbertoChange={(v) => setDialogo(v ? "comprei" : null)}
        saldo={ctx.saldo}
        hoje={ctx.hoje}
      />
    </>
  );
}
