import { PiggyBank, Scale, ShoppingBag, type LucideIcon } from "lucide-react";
import type { MovimentoComItem } from "@/lib/db/consultas";

type Info = { titulo: string; detalhe: string | null; Icone: LucideIcon; fundo: string };

/** Título, detalhe e ícone de cada movimentação, para listas e diálogos. */
export function infoDoMovimento(m: MovimentoComItem): Info {
  switch (m.tipo) {
    case "aporte":
      return { titulo: "Aporte", detalhe: m.nota, Icone: PiggyBank, fundo: "bg-verde-suave text-verde" };
    case "compra":
      return {
        titulo: m.itemNome ? `Compra: ${m.itemNome}` : "Compra",
        detalhe: m.nota,
        Icone: ShoppingBag,
        fundo: "bg-rosa-suave text-rosa-tinta",
      };
    case "ajuste":
      return { titulo: "Ajuste de saldo", detalhe: m.nota, Icone: Scale, fundo: "bg-muted text-muted-foreground" };
  }
}
