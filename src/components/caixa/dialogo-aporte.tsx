"use client";

import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { confirmarAporte } from "@/actions/movimentos";
import { CampoValor } from "@/components/campo-valor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatarDataCurta } from "@/lib/datas";
import { formatarBRL, formatarSemSimbolo, lerValor } from "@/lib/dinheiro";

export const EVENTO_APORTE = "cofrinho:aporte";

type Props = {
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  aporteSemanal: number;
  hoje: string;
  /** Data do aporte desta semana. */
  ciclo: string;
  pendente: boolean;
};

/** "Confirmar aporte": já vem com o valor semanal e a data do ciclo. */
export function DialogoAporte({ aberto, onAbertoChange, ...props }: Props) {
  return (
    <Dialog open={aberto} onOpenChange={onAbertoChange}>
      <DialogContent className="sm:max-w-md">
        {/* O formulário monta a cada abertura, então sempre começa preenchido. */}
        <FormularioAporte {...props} aoTerminar={() => onAbertoChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function FormularioAporte({
  aporteSemanal,
  hoje,
  ciclo,
  pendente,
  aoTerminar,
}: Omit<Props, "aberto" | "onAbertoChange"> & { aoTerminar: () => void }) {
  const id = useId();
  const [texto, setTexto] = useState(aporteSemanal > 0 ? formatarSemSimbolo(aporteSemanal) : "");
  const [data, setData] = useState(pendente ? ciclo : hoje);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const valor = lerValor(texto);
    if (valor === null || valor <= 0) {
      setErro("Informe um valor maior que zero.");
      return;
    }
    iniciar(async () => {
      const r = await confirmarAporte({ valor, data });
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      toast.success(`Aporte de ${formatarBRL(valor)} guardado.`);
      window.dispatchEvent(new CustomEvent(EVENTO_APORTE));
      aoTerminar();
    });
  }

  return (
    <form onSubmit={enviar} className="grid gap-5">
      <DialogHeader>
        <DialogTitle>Confirmar aporte</DialogTitle>
        <DialogDescription>
          {pendente
            ? `Aporte da semana de ${formatarDataCurta(ciclo)}.`
            : "O aporte desta semana já está guardado. Aqui você registra um valor extra."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="grid gap-2">
          <Label htmlFor={`${id}-valor`}>Valor</Label>
          <CampoValor
            id={`${id}-valor`}
            value={texto}
            onChange={(t) => {
              setTexto(t);
              setErro(null);
            }}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-data`}>Data</Label>
          <Input
            id={`${id}-data`}
            type="date"
            required
            max={hoje}
            value={data}
            onChange={(e) => {
              setData(e.target.value);
              setErro(null);
            }}
          />
        </div>
      </div>

      {erro ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {erro}
        </p>
      ) : null}

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" autoFocus disabled={salvando}>
          {salvando ? "Guardando..." : "Confirmar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
