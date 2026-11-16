"use client";

import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { ajustarSaldo } from "@/actions/movimentos";
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
import { formatarBRL, formatarComSinal, formatarSemSimbolo, lerValor } from "@/lib/dinheiro";
import { cn } from "@/lib/utils";

type Props = {
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  saldo: number;
};

/** "Ajustar saldo": informa o saldo certo e registra a diferença como ajuste. */
export function DialogoAjuste({ aberto, onAbertoChange, saldo }: Props) {
  return (
    <Dialog open={aberto} onOpenChange={onAbertoChange}>
      <DialogContent className="sm:max-w-md">
        <FormularioAjuste saldo={saldo} aoTerminar={() => onAbertoChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function FormularioAjuste({ saldo, aoTerminar }: { saldo: number; aoTerminar: () => void }) {
  const id = useId();
  const [texto, setTexto] = useState(formatarSemSimbolo(saldo));
  const [nota, setNota] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  const novoSaldo = lerValor(texto);
  const diferenca = novoSaldo === null ? null : novoSaldo - saldo;

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (novoSaldo === null) {
      setErro("Informe o saldo certo, por exemplo 1.250,00.");
      return;
    }
    if (diferenca === 0) {
      aoTerminar();
      return;
    }
    iniciar(async () => {
      const r = await ajustarSaldo({ saldoCorreto: novoSaldo, nota });
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      toast.success(`Saldo ajustado para ${formatarBRL(novoSaldo)}.`);
      aoTerminar();
    });
  }

  return (
    <form onSubmit={enviar} className="grid gap-5">
      <DialogHeader>
        <DialogTitle>Ajustar saldo</DialogTitle>
        <DialogDescription>
          Informe quanto há de verdade no caixa. A diferença entra no histórico como um ajuste.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-2">
        <Label htmlFor={`${id}-saldo`}>Saldo certo</Label>
        <CampoValor
          id={`${id}-saldo`}
          autoFocus
          value={texto}
          onChange={(t) => {
            setTexto(t);
            setErro(null);
          }}
          aria-describedby={`${id}-diferenca`}
        />
        <p id={`${id}-diferenca`} className="min-h-5 text-sm text-muted-foreground" aria-live="polite">
          {diferenca === null || diferenca === 0 ? (
            "Sem diferença para o saldo atual."
          ) : (
            <>
              Ajuste de{" "}
              <span className={cn("font-semibold", diferenca > 0 ? "text-verde" : "text-vermelho")}>
                {formatarComSinal(diferenca)}
              </span>
            </>
          )}
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor={`${id}-nota`}>Motivo (opcional)</Label>
        <Input
          id={`${id}-nota`}
          value={nota}
          maxLength={200}
          placeholder="Ex.: conferi o extrato"
          onChange={(e) => setNota(e.target.value)}
        />
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
        <Button type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar ajuste"}
        </Button>
      </DialogFooter>
    </form>
  );
}
