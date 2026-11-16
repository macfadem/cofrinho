"use client";

import { useRef, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatarBRL } from "@/lib/dinheiro";
import type { DadosDoLink } from "@/lib/preview";
import { ImagemItem } from "./imagem-item";

export type EstadoDoLink =
  | { tipo: "buscando"; url: string }
  | { tipo: "pronto"; url: string; dados: DadosDoLink }
  | { tipo: "erro"; url: string; mensagem: string }
  | null;

/** Pede ao servidor a prévia de um link (nome, preço e imagem sugeridos). */
export function usePreviewDoLink() {
  const [estado, setEstado] = useState<EstadoDoLink>(null);
  const pedidoAtual = useRef(0);

  async function buscar(url: string) {
    const pedido = ++pedidoAtual.current;
    setEstado({ tipo: "buscando", url });
    try {
      const resposta = await fetch("/api/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await resposta.json();
      if (pedido !== pedidoAtual.current) return;
      setEstado(
        json.ok
          ? { tipo: "pronto", url, dados: json.dados }
          : { tipo: "erro", url, mensagem: json.erro ?? "Não consegui ler esse link." },
      );
    } catch {
      if (pedido === pedidoAtual.current) {
        setEstado({ tipo: "erro", url, mensagem: "Não consegui ler esse link agora." });
      }
    }
  }

  function limpar() {
    pedidoAtual.current++;
    setEstado(null);
  }

  return { estado, buscar, limpar };
}

/** Mostra o que foi encontrado no link, para confirmar antes de usar. */
export function SugestaoDoLink({
  estado,
  onUsar,
  onFechar,
}: {
  estado: EstadoDoLink;
  onUsar: (dados: DadosDoLink) => void;
  onFechar: () => void;
}) {
  if (!estado) return null;

  if (estado.tipo === "buscando") {
    return (
      <div role="status" className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        Lendo a página do produto...
      </div>
    );
  }

  const nada = estado.tipo === "pronto" && !estado.dados.nome && !estado.dados.preco && !estado.dados.imagemUrl;
  if (estado.tipo === "erro" || nada) {
    return (
      <div role="status" className="flex items-start gap-2 rounded-2xl bg-amarelo-suave px-4 py-3 text-sm text-amarelo">
        <p className="flex-1">
          {estado.tipo === "erro" ? estado.mensagem : "Não achei nome, preço nem imagem nessa página."} Dá
          para preencher à mão.
        </p>
        <button
          type="button"
          onClick={onFechar}
          aria-label="Fechar aviso"
          className="rounded-md p-0.5 outline-none hover:bg-amarelo/10 focus-visible:ring-2 focus-visible:ring-ring/50"
        >
          <X className="size-4" />
        </button>
      </div>
    );
  }

  const { nome, preco, imagemUrl } = estado.dados;
  return (
    <div role="status" className="flex flex-wrap items-center gap-3 rounded-2xl border bg-card p-3 sm:flex-nowrap">
      <ImagemItem
        nome={nome ?? "?"}
        src={imagemUrl}
        className="size-14 shrink-0 rounded-xl border"
        tamanhoEmoji="text-2xl"
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">Encontrei nesta página</p>
        <p className="truncate font-semibold">{nome ?? "Sem nome"}</p>
        <p className="numero text-sm">{preco ? formatarBRL(preco) : "Sem preço"}</p>
      </div>
      <div className="flex gap-2">
        <Button type="button" size="sm" onClick={() => onUsar(estado.dados)}>
          Usar
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onFechar}>
          Ignorar
        </Button>
      </div>
    </div>
  );
}
