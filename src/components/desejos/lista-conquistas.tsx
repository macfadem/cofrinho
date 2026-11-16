"use client";

import { useTransition } from "react";
import { EllipsisVertical, Trash2, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { desfazerCompra, excluirItem, restaurarItem } from "@/actions/itens";
import { EstadoVazio } from "@/components/estado-vazio";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatarDataCurta } from "@/lib/datas";
import type { Item } from "@/lib/db/schema";
import { formatarBRL } from "@/lib/dinheiro";
import { ImagemItem } from "./imagem-item";

/** Aba Conquistas: o que já foi comprado e o total gasto. */
export function ListaConquistas({ itens }: { itens: Item[] }) {
  const [, iniciar] = useTransition();
  const totalGasto = itens.reduce((soma, i) => soma + (i.pagoValor ?? 0), 0);

  if (itens.length === 0) {
    return (
      <EstadoVazio emoji="🏆" titulo="Nenhuma conquista ainda">
        Quando você marcar um desejo como comprado, ele aparece aqui.
      </EstadoVazio>
    );
  }

  function devolver(item: Item) {
    iniciar(async () => {
      const r = await desfazerCompra(item.id);
      if (r.ok) toast(`${item.nome} voltou para a lista e o valor voltou para o caixa.`);
      else toast.error(r.erro);
    });
  }

  function excluir(item: Item) {
    iniciar(async () => {
      const r = await excluirItem(item.id);
      if (!r.ok) return void toast.error(r.erro);
      toast(`${item.nome} saiu das conquistas.`, {
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
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-3xl bg-verde-suave px-5 py-4 text-verde">
        <span className="text-sm font-semibold">Total gasto</span>
        <span className="numero text-3xl font-bold">{formatarBRL(totalGasto)}</span>
        <span className="text-sm">
          em {itens.length} {itens.length === 1 ? "conquista" : "conquistas"}
        </span>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {itens.map((item) => (
          <li key={item.id} className="flex items-center gap-3 rounded-3xl bg-card p-3 shadow-cartao">
            <ImagemItem
              nome={item.nome}
              emoji={item.emoji}
              imagem={item.imagem}
              className="size-16 shrink-0 rounded-2xl"
              tamanhoEmoji="text-3xl"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{item.nome}</p>
              <p className="text-sm text-muted-foreground">
                <span className="numero font-semibold text-foreground">{formatarBRL(item.pagoValor ?? 0)}</span>
                {item.pagoEm ? ` em ${formatarDataCurta(item.pagoEm)}` : null}
              </p>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`Opções de ${item.nome}`}>
                  <EllipsisVertical />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onSelect={() => devolver(item)}>
                  <Undo2 />
                  Devolver para a lista
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onSelect={() => excluir(item)}>
                  <Trash2 />
                  Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </li>
        ))}
      </ul>
    </div>
  );
}
