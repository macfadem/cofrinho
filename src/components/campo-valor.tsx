"use client";

import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { formatarSemSimbolo, lerValor } from "@/lib/dinheiro";
import { cn } from "@/lib/utils";

type Props = Omit<ComponentProps<"input">, "value" | "onChange" | "type"> & {
  /** Texto digitado (o componente pai lê com `lerValor`). */
  value: string;
  onChange: (texto: string) => void;
  grande?: boolean;
  /** Classes extras para o campo em si (o `className` vai no contêiner). */
  classeCampo?: string;
};

/**
 * Campo de dinheiro com "R$" na frente. Aceita "1999", "1.999,90" etc.
 * Ao sair do campo, arruma o texto para o formato "1.999,90".
 */
export function CampoValor({ value, onChange, grande, className, classeCampo, onBlur, ...props }: Props) {
  const invalido = value.trim() !== "" && lerValor(value) === null;

  return (
    <div className={cn("relative", className)}>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-0 left-3.5 flex items-center font-semibold text-muted-foreground",
          grande && "left-5 text-2xl",
        )}
      >
        R$
      </span>
      <Input
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        aria-invalid={invalido || undefined}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => {
          const atual = e.currentTarget.value;
          const centavos = lerValor(atual);
          if (centavos !== null && formatarSemSimbolo(centavos) !== atual) {
            onChange(formatarSemSimbolo(centavos));
          }
          onBlur?.(e);
        }}
        className={cn(
          "numero pl-11 md:text-base",
          grande && "h-16 rounded-2xl pl-16 text-3xl font-semibold md:text-3xl",
          classeCampo,
        )}
        {...props}
      />
    </div>
  );
}
