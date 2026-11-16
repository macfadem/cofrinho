"use client";

import { useState, type CSSProperties } from "react";
import { emojiDoNome, tonsDoNome } from "@/lib/emoji";
import { cn } from "@/lib/utils";

/**
 * Imagem do item. Sem imagem (ou se ela não carregar), mostra o emoji escolhido
 * pelo nome sobre um gradiente gerado a partir do nome.
 */
export function ImagemItem({
  nome,
  emoji,
  imagem,
  src,
  className,
  tamanhoEmoji = "text-5xl",
}: {
  nome: string;
  emoji?: string | null;
  /** Arquivo em data/images. */
  imagem?: string | null;
  /** Ou um endereço qualquer (prévia antes de salvar). */
  src?: string | null;
  className?: string;
  tamanhoEmoji?: string;
}) {
  const endereco = src ?? (imagem ? `/api/imagens/${imagem}` : null);
  const [falhou, setFalhou] = useState<string | null>(null);
  const [tom1, tom2] = tonsDoNome(nome);

  if (endereco && falhou !== endereco) {
    return (
      // Fundo morno e "multiply": o branco das fotos de produto se funde ao fundo.
      <div aria-hidden className={cn("relative overflow-hidden bg-[#f4efed]", className)}>
        <img
          src={endereco}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          onError={() => setFalhou(endereco)}
          className="absolute inset-0 size-full object-contain p-[6%] mix-blend-multiply"
        />
      </div>
    );
  }

  return (
    <div
      aria-hidden
      style={{ "--tom1": tom1, "--tom2": tom2 } as CSSProperties}
      className={cn(
        "grid place-items-center overflow-hidden select-none",
        "bg-[linear-gradient(135deg,oklch(0.93_0.06_var(--tom1)),oklch(0.83_0.1_var(--tom2)))]",
        "dark:bg-[linear-gradient(135deg,oklch(0.42_0.08_var(--tom1)),oklch(0.31_0.09_var(--tom2)))]",
        className,
      )}
    >
      <span className={cn("drop-shadow-sm", tamanhoEmoji)}>{emoji || emojiDoNome(nome)}</span>
    </div>
  );
}
