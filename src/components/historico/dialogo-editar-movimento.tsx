"use client";

import { useId, useState, useTransition } from "react";
import { toast } from "sonner";
import { editarMovimento } from "@/actions/movimentos";
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
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { MovimentoComItem } from "@/lib/db/consultas";
import { formatarSemSimbolo, lerValor } from "@/lib/dinheiro";
import { infoDoMovimento } from "./movimento-info";

type Props = {
  movimento: MovimentoComItem | null;
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  hoje: string;
};

export function DialogoEditarMovimento({ movimento, aberto, onAbertoChange, hoje }: Props) {
  return (
    <Dialog open={aberto && movimento !== null} onOpenChange={onAbertoChange}>
      <DialogContent className="sm:max-w-md">
        {movimento ? (
          <FormularioEdicao
            key={movimento.id}
            movimento={movimento}
            hoje={hoje}
            aoTerminar={() => onAbertoChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function FormularioEdicao({
  movimento: m,
  hoje,
  aoTerminar,
}: {
  movimento: MovimentoComItem;
  hoje: string;
  aoTerminar: () => void;
}) {
  const id = useId();
  const [texto, setTexto] = useState(formatarSemSimbolo(Math.abs(m.valor)));
  const [sentido, setSentido] = useState<"entrada" | "saida">(m.valor >= 0 ? "entrada" : "saida");
  const [data, setData] = useState(m.data);
  const [nota, setNota] = useState(m.nota ?? "");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();
  const { titulo } = infoDoMovimento(m);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const absoluto = lerValor(texto);
    if (absoluto === null || absoluto === 0) {
      setErro("Informe um valor maior que zero.");
      return;
    }
    const valor =
      m.tipo === "aporte" ? absoluto : m.tipo === "compra" ? -absoluto : sentido === "entrada" ? absoluto : -absoluto;

    iniciar(async () => {
      const r = await editarMovimento({ id: m.id, valor, data, nota });
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      toast.success("Movimentação atualizada.");
      aoTerminar();
    });
  }

  return (
    <form onSubmit={enviar} className="grid gap-5">
      <DialogHeader>
        <DialogTitle>Editar {m.tipo}</DialogTitle>
        <DialogDescription>{titulo}</DialogDescription>
      </DialogHeader>

      {m.tipo === "ajuste" ? (
        <div className="grid gap-2">
          <p id={`${id}-sentido`} className="text-sm font-medium">
            O ajuste
          </p>
          <ToggleGroup
            type="single"
            spacing={1}
            value={sentido}
            onValueChange={(v) => v && setSentido(v as "entrada" | "saida")}
            aria-labelledby={`${id}-sentido`}
            className="grid w-full grid-cols-2 rounded-2xl bg-muted p-1"
          >
            {[
              ["entrada", "Aumentou o saldo"],
              ["saida", "Diminuiu o saldo"],
            ].map(([valor, rotulo]) => (
              <ToggleGroupItem
                key={valor}
                value={valor}
                className="w-full text-muted-foreground hover:bg-card/60 hover:text-foreground data-[state=on]:bg-card data-[state=on]:font-semibold data-[state=on]:text-foreground data-[state=on]:shadow-cartao dark:data-[state=on]:bg-secondary"
              >
                {rotulo}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      ) : null}

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

      <div className="grid gap-2">
        <Label htmlFor={`${id}-nota`}>Nota (opcional)</Label>
        <Input id={`${id}-nota`} value={nota} maxLength={200} onChange={(e) => setNota(e.target.value)} />
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
          {salvando ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
