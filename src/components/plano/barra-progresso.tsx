import { cn } from "@/lib/utils";

/** Barra verde de progresso (valor entre 0 e total). */
export function BarraProgresso({
  valor,
  total,
  rotulo,
  className,
}: {
  valor: number;
  total: number;
  rotulo: string;
  className?: string;
}) {
  const porcento = total > 0 ? Math.min(100, Math.max(0, (valor / total) * 100)) : 0;
  return (
    <div
      role="progressbar"
      aria-label={rotulo}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(porcento)}
      className={cn("h-2.5 overflow-hidden rounded-full bg-verde-suave", className)}
    >
      <div
        className="h-full rounded-full bg-verde transition-[width] duration-700 ease-out motion-reduce:transition-none"
        style={{ width: `${porcento}%` }}
      />
    </div>
  );
}
