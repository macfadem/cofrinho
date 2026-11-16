import Link from "next/link";
import { cn } from "@/lib/utils";

/** Abas da tela Desejos: a lista e as conquistas (cada uma com seu endereço). */
export function AbasDesejos({
  ativa,
  totalLista,
  totalConquistas,
}: {
  ativa: "lista" | "conquistas";
  totalLista: number;
  totalConquistas: number;
}) {
  const abas = [
    { chave: "lista", href: "/desejos", rotulo: "Lista", total: totalLista },
    { chave: "conquistas", href: "/desejos?aba=conquistas", rotulo: "Conquistas", total: totalConquistas },
  ] as const;

  return (
    <nav aria-label="Abas de desejos" className="flex rounded-2xl bg-muted p-1">
      {abas.map((aba) => {
        const selecionada = aba.chave === ativa;
        return (
          <Link
            key={aba.chave}
            href={aba.href}
            aria-current={selecionada ? "page" : undefined}
            className={cn(
              "flex h-9 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              selecionada
                ? "bg-card text-foreground shadow-cartao dark:bg-secondary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {aba.rotulo}
            <span className="numero text-xs text-muted-foreground">{aba.total}</span>
          </Link>
        );
      })}
    </nav>
  );
}
