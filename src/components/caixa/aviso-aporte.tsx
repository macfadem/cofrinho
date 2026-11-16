"use client";

import { useState } from "react";
import { CalendarClock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatarDataCurta } from "@/lib/datas";
import type { EstadoCaixa } from "@/lib/db/consultas";
import { formatarBRL } from "@/lib/dinheiro";
import { DialogoAporte } from "./dialogo-aporte";

/** Aviso no topo de todas as telas quando o aporte da semana está pendente. */
export function AvisoAporte({ estado }: { estado: EstadoCaixa }) {
  const [aberto, setAberto] = useState(false);
  const { configurado, aporte, aporteSemanal, hoje } = estado;
  if (!configurado || !aporte.pendente) return null;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pt-2 md:pt-3">
      <div className="flex items-center gap-3 rounded-2xl bg-amarelo-suave py-2.5 pr-2.5 pl-4 text-amarelo">
        <CalendarClock className="size-5 shrink-0" aria-hidden />
        <p className="flex-1 text-sm font-semibold">
          Aporte de {formatarDataCurta(aporte.ciclo)} pendente
          <span className="font-normal">: {formatarBRL(aporteSemanal)}</span>
        </p>
        <Button
          size="sm"
          className="bg-amarelo text-amarelo-suave shadow-none hover:bg-amarelo/90"
          onClick={() => setAberto(true)}
        >
          Confirmar
        </Button>
      </div>
      <DialogoAporte
        aberto={aberto}
        onAbertoChange={setAberto}
        aporteSemanal={aporteSemanal}
        hoje={hoje}
        ciclo={aporte.ciclo}
        pendente={aporte.pendente}
      />
    </div>
  );
}
