"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Link2, Loader2, Search, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { removerImagem } from "@/actions/itens";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Item } from "@/lib/db/schema";
import {
  abrirBuscaDeImagem,
  ACEITAR_IMAGENS,
  arquivoDeImagem,
  enviarImagem,
  pareceImagem,
  problemaNoArquivo,
  urlDeImagem,
} from "@/lib/transferencia";
import { cn } from "@/lib/utils";
import { ImagemItem } from "./imagem-item";

/** Trocar a imagem de um desejo: colar, arrastar, escolher, buscar ou pegar do link. */
export function DialogoImagem({
  item,
  aberto,
  onAbertoChange,
}: {
  item: Item | null;
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
}) {
  return (
    <Dialog open={aberto && item !== null} onOpenChange={onAbertoChange}>
      <DialogContent className="sm:max-w-lg">
        {item ? <Conteudo key={item.id} item={item} aoTerminar={() => onAbertoChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function Conteudo({ item, aoTerminar }: { item: Item; aoTerminar: () => void }) {
  const seletor = useRef<HTMLInputElement>(null);
  const [arrastando, setArrastando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  function usar(origem: File | string) {
    if (typeof origem !== "string") {
      const problema = problemaNoArquivo(origem);
      if (problema) return setErro(problema);
    }
    setErro(null);
    iniciar(async () => {
      const r = await enviarImagem(item.id, origem);
      if (!r.ok) return setErro(r.erro);
      toast.success("Imagem atualizada.");
      aoTerminar();
    });
  }

  // Ctrl+V em qualquer lugar enquanto o diálogo está aberto.
  useEffect(() => {
    function colar(e: ClipboardEvent) {
      const origem = arquivoDeImagem(e.clipboardData) ?? urlDeImagem(e.clipboardData);
      if (!origem) return;
      e.preventDefault();
      usar(origem);
    }
    document.addEventListener("paste", colar);
    return () => document.removeEventListener("paste", colar);
  });

  function usarDoLink() {
    if (!item.link) return;
    setErro(null);
    iniciar(async () => {
      try {
        const resposta = await fetch("/api/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: item.link }),
        });
        const json = await resposta.json();
        if (!json.ok) return setErro(json.erro);
        if (!json.dados.imagemUrl) return setErro("Não achei uma imagem na página do produto.");
        const r = await enviarImagem(item.id, json.dados.imagemUrl);
        if (!r.ok) return setErro(r.erro);
        toast.success("Imagem atualizada com a foto do produto.");
        aoTerminar();
      } catch {
        setErro("Não consegui ler o link agora.");
      }
    });
  }

  function remover() {
    iniciar(async () => {
      const r = await removerImagem(item.id);
      if (!r.ok) return setErro(r.erro);
      toast("Imagem removida.");
      aoTerminar();
    });
  }

  return (
    <div className="grid gap-5">
      <DialogHeader>
        <DialogTitle>Imagem</DialogTitle>
        <DialogDescription>{item.nome}</DialogDescription>
      </DialogHeader>

      <div
        onDragOver={(e) => {
          if (!pareceImagem(e.dataTransfer)) return;
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={(e) => {
          e.preventDefault();
          setArrastando(false);
          const origem = arquivoDeImagem(e.dataTransfer) ?? urlDeImagem(e.dataTransfer);
          if (origem) usar(origem);
          else setErro("Isso não parece uma imagem.");
        }}
        className={cn(
          "relative overflow-hidden rounded-2xl border-2 border-dashed transition-colors",
          arrastando ? "border-primary" : "border-transparent",
        )}
      >
        <ImagemItem nome={item.nome} emoji={item.emoji} imagem={item.imagem} className="aspect-[16/9]" />
        {salvando || arrastando ? (
          <div className="absolute inset-0 grid place-items-center bg-background/70 text-sm font-semibold backdrop-blur-sm">
            {salvando ? (
              <span className="flex items-center gap-2">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Salvando a imagem...
              </span>
            ) : (
              "Solte para usar esta imagem"
            )}
          </div>
        ) : null}
      </div>

      <p className="text-sm text-muted-foreground">
        Cole uma imagem com <kbd className="rounded bg-muted px-1.5 py-0.5 font-sans text-xs">Ctrl+V</kbd>,
        arraste um arquivo ou uma imagem de outra aba para cá, ou escolha no computador.
      </p>

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={salvando} onClick={() => seletor.current?.click()}>
          <Upload />
          Escolher arquivo
        </Button>
        <Button type="button" variant="outline" onClick={() => abrirBuscaDeImagem(item.nome)}>
          <Search />
          Buscar imagem
        </Button>
        {item.link ? (
          <Button type="button" variant="outline" disabled={salvando} onClick={usarDoLink}>
            <Link2 />
            Usar a do link
          </Button>
        ) : null}
        {item.imagem ? (
          <Button type="button" variant="ghost" disabled={salvando} onClick={remover}>
            <Trash2 />
            Remover
          </Button>
        ) : null}
      </div>

      <input
        ref={seletor}
        type="file"
        accept={ACEITAR_IMAGENS}
        className="hidden"
        aria-label="Escolher imagem do computador"
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          if (arquivo) usar(arquivo);
          e.target.value = "";
        }}
      />

      {erro ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {erro}
        </p>
      ) : null}
    </div>
  );
}
