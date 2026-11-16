"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gift, House, ReceiptText, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Destino = { href: string; rotulo: string; Icone: LucideIcon };

const DESTINOS: Destino[] = [
  { href: "/", rotulo: "Início", Icone: House },
  { href: "/desejos", rotulo: "Desejos", Icone: Gift },
  { href: "/historico", rotulo: "Histórico", Icone: ReceiptText },
];

function estaAtivo(caminho: string, href: string) {
  return href === "/" ? caminho === "/" : caminho.startsWith(href);
}

/** Navegação no topo (telas largas). */
export function NavegacaoTopo({ className }: { className?: string }) {
  const caminho = usePathname();
  return (
    <nav aria-label="Navegação principal" className={className}>
      <ul className="flex items-center gap-1">
        {DESTINOS.map(({ href, rotulo, Icone }) => {
          const ativo = estaAtivo(caminho, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  ativo
                    ? "bg-card text-foreground shadow-cartao"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icone className="size-4" aria-hidden />
                {rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Barra de abas fixa embaixo (telas estreitas). */
export function NavegacaoInferior() {
  const caminho = usePathname();
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {DESTINOS.map(({ href, rotulo, Icone }) => {
          const ativo = estaAtivo(caminho, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={ativo ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-1 pt-2 pb-2.5 text-xs font-semibold outline-none focus-visible:bg-accent",
                  ativo ? "text-foreground" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "grid h-8 w-14 place-items-center rounded-full transition-colors",
                    ativo && "bg-rosa-suave text-rosa-tinta",
                  )}
                >
                  <Icone className="size-5" aria-hidden />
                </span>
                {rotulo}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
