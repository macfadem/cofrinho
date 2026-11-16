"use client";

import { useId, useState, useTransition } from "react";
import confetti from "canvas-confetti";
import { toast } from "sonner";
import { comprarItem, desfazerCompra } from "@/actions/itens";
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
import type { Item } from "@/lib/db/schema";
import { formatarBRL, formatarSemSimbolo, lerValor } from "@/lib/dinheiro";
import { cn } from "@/lib/utils";

/** Confete com as cores do Cofrinho (desligado se o sistema pede menos movimento). */
export function soltarConfete() {
  const cores = ["#127a55", "#3cc48e", "#d9587a", "#f2b632", "#ffe9a3"];
  const base = { colors: cores, disableForReducedMotion: true, zIndex: 100 };
  confetti({ ...base, particleCount: 90, spread: 70, startVelocity: 45, origin: { x: 0.5, y: 0.6 } });
  setTimeout(() => {
    confetti({ ...base, particleCount: 50, angle: 60, spread: 55, origin: { x: 0, y: 0.7 } });
    confetti({ ...base, particleCount: 50, angle: 120, spread: 55, origin: { x: 1, y: 0.7 } });
  }, 180);
}

/** "Comprei": valor pago (padrão = preço) e data; debita do caixa. */
export function DialogoComprei({
  item,
  aberto,
  onAbertoChange,
  saldo,
  hoje,
}: {
  item: Item | null;
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  saldo: number;
  hoje: string;
}) {
  return (
    <Dialog open={aberto && item !== null} onOpenChange={onAbertoChange}>
      <DialogContent className="sm:max-w-md">
        {item ? (
          <Formulario
            key={item.id}
            item={item}
            saldo={saldo}
            hoje={hoje}
            aoTerminar={() => onAbertoChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Formulario({
  item,
  saldo,
  hoje,
  aoTerminar,
}: {
  item: Item;
  saldo: number;
  hoje: string;
  aoTerminar: () => void;
}) {
  const id = useId();
  const [texto, setTexto] = useState(formatarSemSimbolo(item.preco));
  const [data, setData] = useState(hoje);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  const valorPago = lerValor(texto);
  const saldoDepois = valorPago === null ? null : saldo - valorPago;

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (valorPago === null || valorPago <= 0) return setErro("Informe quanto você pagou.");

    iniciar(async () => {
      const r = await comprarItem({ id: item.id, valorPago, data });
      if (!r.ok) return setErro(r.erro);
      aoTerminar();
      soltarConfete();
      toast.success("Nova conquista!", {
        description: `${item.nome}: ${formatarBRL(valorPago)} saíram do caixa.`,
        duration: 6000,
        action: {
          label: "Desfazer",
          onClick: async () => {
            const volta = await desfazerCompra(item.id);
            if (volta.ok) toast("Compra desfeita. O item voltou para a lista.");
            else toast.error(volta.erro);
          },
        },
      });
    });
  }

  return (
    <form onSubmit={enviar} className="grid gap-5">
      <DialogHeader>
        <DialogTitle>Comprei!</DialogTitle>
        <DialogDescription>{item.nome}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <div className="grid gap-2">
          <Label htmlFor={`${id}-valor`}>Valor pago</Label>
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
            onChange={(e) => setData(e.target.value)}
          />
        </div>
      </div>

      {saldoDepois !== null ? (
        <p
          aria-live="polite"
          className={cn(
            "rounded-2xl px-4 py-3 text-sm",
            saldoDepois < 0 ? "bg-amarelo-suave text-amarelo" : "bg-muted text-muted-foreground",
          )}
        >
          {saldoDepois < 0 ? (
            <>
              O caixa tem {formatarBRL(saldo)} e fica <strong>negativo em {formatarBRL(-saldoDepois)}</strong>.
            </>
          ) : (
            <>
              Saldo do caixa depois da compra:{" "}
              <strong className="numero text-foreground">{formatarBRL(saldoDepois)}</strong>
            </>
          )}
        </p>
      ) : null}

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
          {salvando ? "Registrando..." : "Confirmar compra"}
        </Button>
      </DialogFooter>
    </form>
  );
}
