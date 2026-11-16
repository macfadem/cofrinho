"use client";

import { useEffect, useRef } from "react";
import { ImagePlus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { abrirBuscaDeImagem, ACEITAR_IMAGENS } from "@/lib/transferencia";

/** Imagem escolhida antes de salvar o item: um arquivo ou o endereço de uma imagem. */
export type ImagemPendente =
  | { tipo: "arquivo"; arquivo: File; previa: string }
  | { tipo: "url"; url: string; previa: string };

export function imagemDeArquivo(arquivo: File): ImagemPendente {
  return { tipo: "arquivo", arquivo, previa: URL.createObjectURL(arquivo) };
}

export function imagemDeUrl(url: string): ImagemPendente {
  return { tipo: "url", url, previa: url };
}

/** Campo "Imagem" da barra de adicionar: miniatura, escolher arquivo e Buscar imagem. */
export function CampoImagem({
  valor,
  onChange,
  nome,
  onArquivo,
}: {
  valor: ImagemPendente | null;
  onChange: (imagem: ImagemPendente | null) => void;
  /** Nome digitado, usado no "Buscar imagem". */
  nome: string;
  /** Arquivo escolhido no computador (o pai valida e guarda). */
  onArquivo: (arquivo: File) => void;
}) {
  const seletor = useRef<HTMLInputElement>(null);

  // Libera a memória da prévia de arquivo quando ela sai da tela.
  useEffect(() => {
    if (valor?.tipo !== "arquivo") return;
    const previa = valor.previa;
    return () => URL.revokeObjectURL(previa);
  }, [valor]);

  return (
    <div className="flex items-center gap-3">
      <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-dashed bg-muted">
        {valor ? (
          <img src={valor.previa} alt="Prévia da imagem" className="size-full bg-white object-contain p-1" />
        ) : (
          <ImagePlus className="size-6 text-muted-foreground" aria-hidden />
        )}
      </div>
      <div className="min-w-0 text-sm">
        <p className="text-muted-foreground">Cole com Ctrl+V, arraste para cá ou</p>
        <div className="mt-1.5 flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={() => seletor.current?.click()}>
            Escolher arquivo
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!nome.trim()}
            title={nome.trim() ? undefined : "Escreva o nome do desejo primeiro"}
            onClick={() => abrirBuscaDeImagem(nome)}
          >
            <Search />
            Buscar imagem
          </Button>
          {valor ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => onChange(null)}>
              <X />
              Tirar
            </Button>
          ) : null}
        </div>
      </div>
      <input
        ref={seletor}
        type="file"
        accept={ACEITAR_IMAGENS}
        className="hidden"
        aria-label="Escolher imagem do computador"
        onChange={(e) => {
          const arquivo = e.target.files?.[0];
          if (arquivo) onArquivo(arquivo);
          e.target.value = "";
        }}
      />
    </div>
  );
}
