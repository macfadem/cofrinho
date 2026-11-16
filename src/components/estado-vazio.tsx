import type { ReactNode } from "react";

/** Tela vazia simpática: emoji, título, uma frase e (opcional) uma ação. */
export function EstadoVazio({
  emoji,
  titulo,
  children,
  acao,
}: {
  emoji: string;
  titulo: string;
  children: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-border bg-card/60 px-6 py-14 text-center">
      <span
        aria-hidden
        className="mb-5 grid size-20 place-items-center rounded-full bg-rosa-suave text-4xl"
      >
        {emoji}
      </span>
      <h2 className="text-xl font-semibold">{titulo}</h2>
      <p className="mt-2 max-w-sm text-pretty text-muted-foreground">
        {children}
      </p>
      {acao ? <div className="mt-6">{acao}</div> : null}
    </div>
  );
}
