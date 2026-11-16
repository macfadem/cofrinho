"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DIAS_SEMANA } from "@/lib/datas";
import { cn } from "@/lib/utils";

/** Escolha do dia da semana (0 = domingo … 6 = sábado). */
export function SeletorDia({
  value,
  onChange,
  className,
  ...props
}: {
  value: number;
  onChange: (dia: number) => void;
  className?: string;
  "aria-labelledby"?: string;
}) {
  return (
    <ToggleGroup
      type="single"
      spacing={1}
      value={String(value)}
      onValueChange={(v) => v && onChange(Number(v))}
      className={cn("grid w-full grid-cols-7 rounded-2xl bg-muted p-1", className)}
      {...props}
    >
      {DIAS_SEMANA.map((dia, i) => (
        <ToggleGroupItem
          key={dia.curto}
          value={String(i)}
          aria-label={dia.nome}
          className="w-full px-0 text-muted-foreground hover:bg-card/60 hover:text-foreground data-[state=on]:bg-card data-[state=on]:font-semibold data-[state=on]:text-foreground data-[state=on]:shadow-cartao dark:data-[state=on]:bg-secondary"
        >
          {dia.curto}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
