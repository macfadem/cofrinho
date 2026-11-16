// Peças do plano usadas no Início e nos cards: previsão, selos e aviso de data desejada.

import type { ReactNode } from "react";
import { CalendarCheck, CalendarX, CircleCheck, Hourglass, Tag, TriangleAlert } from "lucide-react";
import { formatarData, formatarDataPrevista } from "@/lib/datas";
import { formatarBRL } from "@/lib/dinheiro";
import { formatarPrazo, type PrazoDaData } from "@/lib/plano";
import { cn } from "@/lib/utils";

/** "≈ 1 mês e meio · qua, 09/12" ou "Dá para comprar agora". */
export function TextoDaPrevisao({
  semanas,
  data,
  hoje,
}: {
  semanas: number | null;
  data: string | null;
  hoje: string;
}) {
  if (semanas === null || data === null) {
    return <span className="text-muted-foreground">Sem previsão: falta o aporte semanal</span>;
  }
  if (semanas === 0) return <span className="font-semibold text-verde">Dá para comprar agora</span>;
  return (
    <span>
      <span className="whitespace-nowrap text-muted-foreground">{formatarPrazo(semanas)} · </span>
      <span className="font-semibold whitespace-nowrap">{formatarDataPrevista(data, hoje)}</span>
    </span>
  );
}

export type Tom = "verde" | "amarelo" | "vermelho" | "rosa";

const TONS: Record<Tom, string> = {
  verde: "bg-verde-suave text-verde",
  amarelo: "bg-amarelo-suave text-amarelo",
  vermelho: "bg-vermelho-suave text-vermelho",
  rosa: "bg-rosa-suave text-rosa-tinta",
};

/** Selo colorido com ícone; quebra a linha se precisar. */
export function Selo({ tom, icone, children }: { tom: Tom; icone: ReactNode; children: ReactNode }) {
  return (
    <p
      className={cn(
        "flex w-fit items-start gap-1.5 rounded-xl px-2 py-1 text-xs leading-snug font-semibold text-pretty sm:text-[0.8125rem] [&_svg]:mt-px [&_svg]:size-3.5 [&_svg]:shrink-0",
        TONS[tom],
      )}
    >
      {icone}
      <span>{children}</span>
    </p>
  );
}

/** Verde se 0, amarelo se 1, vermelho se 2 ou mais. */
export function tomDoImpacto(semanas: number): Tom {
  return semanas <= 0 ? "verde" : semanas === 1 ? "amarelo" : "vermelho";
}

export function textoDoImpacto(semanas: number): string {
  if (semanas <= 0) return "Comprar agora não atrasa seus alvos";
  return `Comprar agora atrasa seus alvos em ${semanas} ${semanas === 1 ? "semana" : "semanas"}`;
}

export function SeloDoImpacto({ semanas }: { semanas: number }) {
  const tom = tomDoImpacto(semanas);
  const icone = tom === "verde" ? <CircleCheck aria-hidden /> : tom === "amarelo" ? <Hourglass aria-hidden /> : <TriangleAlert aria-hidden />;
  return (
    <Selo tom={tom} icone={icone}>
      {textoDoImpacto(semanas)}
    </Selo>
  );
}

export function SeloCabeNoCaixa() {
  return (
    <Selo tom="verde" icone={<CircleCheck aria-hidden />}>
      Cabe no caixa agora
    </Selo>
  );
}

export function SeloPrecoAlvo() {
  return (
    <Selo tom="rosa" icone={<Tag aria-hidden />}>
      Bateu o preço-alvo
    </Selo>
  );
}

/** Aviso quando o plano passa da data desejada: quanto guardar por semana para chegar a tempo. */
export function textoDoPrazoPerdido(prazo: PrazoDaData): string {
  const data = formatarData(prazo.data);
  if (prazo.aporteNecessario === null) return `Passa de ${data}, e até lá não há mais aportes.`;
  return `Passa de ${data}. Para chegar a tempo, guarde ${formatarBRL(prazo.aporteNecessario)} por semana.`;
}

/** Data desejada: avisa se o plano passa dela; senão, confirma que chega a tempo. */
export function AvisoDoPrazo({ prazo }: { prazo: PrazoDaData & { passa: boolean } }) {
  if (prazo.passa) {
    return (
      <Selo tom="amarelo" icone={<CalendarX aria-hidden />}>
        {textoDoPrazoPerdido(prazo)}
      </Selo>
    );
  }
  return (
    <p className="flex items-center gap-1.5 text-xs text-verde sm:text-sm">
      <CalendarCheck className="size-3.5 shrink-0" aria-hidden />
      Chega a tempo: quero até {formatarData(prazo.data)}
    </p>
  );
}

/** "Tudo em 22 semanas" (ou "Dá para comprar tudo agora"). */
export function textoDoTotal(semanas: number): string {
  if (semanas === 0) return "Dá para comprar tudo agora";
  return `Tudo em ${semanas} ${semanas === 1 ? "semana" : "semanas"}`;
}
