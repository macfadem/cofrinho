"use client";

import { ImagemItem } from "@/components/desejos/imagem-item";
import { Checkbox } from "@/components/ui/checkbox";
import type { Item } from "@/lib/db/schema";
import { formatarBRL } from "@/lib/dinheiro";

/** Lista de desejos com caixas de marcar, para escolher os alvos. */
export function SeletorAlvos({
  desejos,
  valor,
  onChange,
}: {
  desejos: Item[];
  valor: number[];
  onChange: (ids: number[]) => void;
}) {
  const marcados = new Set(valor);
  const total = desejos.filter((d) => marcados.has(d.id)).reduce((s, d) => s + d.preco, 0);

  function alternar(id: number, marcar: boolean) {
    // Mantém a ordem da lista (a prioridade).
    const novos = new Set(marcados);
    if (marcar) novos.add(id);
    else novos.delete(id);
    onChange(desejos.filter((d) => novos.has(d.id)).map((d) => d.id));
  }

  return (
    <div className="grid gap-3">
      <ul className="max-h-[min(50dvh,26rem)] divide-y overflow-y-auto rounded-2xl border bg-card">
        {desejos.map((item) => (
          <li key={item.id}>
            <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-accent/60">
              <Checkbox
                checked={marcados.has(item.id)}
                onCheckedChange={(c) => alternar(item.id, c === true)}
              />
              <ImagemItem
                nome={item.nome}
                emoji={item.emoji}
                imagem={item.imagem}
                className="size-9 shrink-0 rounded-xl"
                tamanhoEmoji="text-lg"
              />
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.nome}</span>
              <span className="numero shrink-0 text-sm font-semibold">{formatarBRL(item.preco)}</span>
            </label>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {valor.length === 0 ? (
          "Nenhum alvo escolhido."
        ) : (
          <>
            {valor.length} {valor.length === 1 ? "alvo" : "alvos"}, total de{" "}
            <strong className="numero text-foreground">{formatarBRL(total)}</strong>
          </>
        )}
      </p>
    </div>
  );
}
