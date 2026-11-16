"use client";

import { useState, useTransition } from "react";
import { EllipsisVertical, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { excluirMovimento, restaurarMovimento } from "@/actions/movimentos";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatarDataCurta } from "@/lib/datas";
import type { MovimentoComItem } from "@/lib/db/consultas";
import { formatarComSinal } from "@/lib/dinheiro";
import { cn } from "@/lib/utils";
import { DialogoEditarMovimento } from "./dialogo-editar-movimento";
import { infoDoMovimento } from "./movimento-info";

export type GrupoDoMes = {
  /** 'AAAA-MM' */
  chave: string;
  titulo: string;
  total: number;
  movimentos: MovimentoComItem[];
};

/** Histórico agrupado por mês, com editar e excluir (com "Desfazer"). */
export function ListaMovimentos({ grupos, hoje }: { grupos: GrupoDoMes[]; hoje: string }) {
  const [editando, setEditando] = useState<MovimentoComItem | null>(null);
  const [dialogoAberto, setDialogoAberto] = useState(false);
  const [, iniciar] = useTransition();

  function editar(m: MovimentoComItem) {
    setEditando(m);
    setDialogoAberto(true);
  }

  function excluir(m: MovimentoComItem) {
    const { titulo } = infoDoMovimento(m);
    iniciar(async () => {
      const r = await excluirMovimento(m.id);
      if (!r.ok) {
        toast.error(r.erro);
        return;
      }
      const linha = r.dados;
      toast(`Movimentação de ${formatarDataCurta(m.data)} excluída.`, {
        description: m.tipo === "compra" && m.itemId ? `${titulo}. O item voltou para a lista.` : titulo,
        duration: 5000,
        action: {
          label: "Desfazer",
          onClick: async () => {
            const volta = await restaurarMovimento(linha);
            if (volta.ok) toast.success("Exclusão desfeita.");
            else toast.error(volta.erro);
          },
        },
      });
    });
  }

  return (
    <div className="space-y-8">
      {grupos.map((grupo) => (
        <section key={grupo.chave} aria-labelledby={`mes-${grupo.chave}`}>
          <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
            <h2 id={`mes-${grupo.chave}`} className="text-lg font-semibold">
              {grupo.titulo}
            </h2>
            <p
              className={cn(
                "numero text-sm font-semibold",
                grupo.total > 0 && "text-verde",
                grupo.total < 0 && "text-vermelho",
              )}
            >
              <span className="sr-only">Total do mês: </span>
              {formatarComSinal(grupo.total)}
            </p>
          </div>
          <ul className="divide-y divide-border overflow-hidden rounded-3xl bg-card shadow-cartao">
            {grupo.movimentos.map((m) => (
              <LinhaMovimento
                key={m.id}
                movimento={m}
                onEditar={() => editar(m)}
                onExcluir={() => excluir(m)}
              />
            ))}
          </ul>
        </section>
      ))}

      <DialogoEditarMovimento
        movimento={editando}
        aberto={dialogoAberto}
        onAbertoChange={setDialogoAberto}
        hoje={hoje}
      />
    </div>
  );
}

function LinhaMovimento({
  movimento: m,
  onEditar,
  onExcluir,
}: {
  movimento: MovimentoComItem;
  onEditar: () => void;
  onExcluir: () => void;
}) {
  const { titulo, detalhe, Icone, fundo } = infoDoMovimento(m);
  const data = formatarDataCurta(m.data);

  return (
    <li className="flex items-center gap-3 py-3 pr-2 pl-4 sm:pl-5">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-2xl", fundo)}>
        <Icone className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">{titulo}</p>
        <p className="text-sm text-pretty text-muted-foreground">
          {data}
          {detalhe ? ` · ${detalhe}` : null}
        </p>
      </div>
      <p
        className={cn(
          "numero shrink-0 font-semibold",
          m.valor > 0 && "text-verde",
          m.tipo === "ajuste" && m.valor < 0 && "text-vermelho",
        )}
      >
        {formatarComSinal(m.valor)}
      </p>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Opções: ${titulo}, ${data}`}>
            <EllipsisVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={onEditar}>
            <Pencil />
            Editar
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={onExcluir}>
            <Trash2 />
            Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
