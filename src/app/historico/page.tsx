import type { Metadata } from "next";
import { EstadoVazio } from "@/components/estado-vazio";
import { ListaMovimentos, type GrupoDoMes } from "@/components/historico/lista-movimentos";
import { formatarMesAno } from "@/lib/datas";
import { lerEstadoCaixa, lerMovimentos, type MovimentoComItem } from "@/lib/db/consultas";
import { formatarBRL } from "@/lib/dinheiro";

export const metadata: Metadata = { title: "Histórico" };

/** Agrupa as movimentações (já da mais nova para a mais antiga) por mês. */
function agruparPorMes(movimentos: MovimentoComItem[]): GrupoDoMes[] {
  const grupos: GrupoDoMes[] = [];
  for (const m of movimentos) {
    const chave = m.data.slice(0, 7);
    let grupo = grupos.at(-1);
    if (!grupo || grupo.chave !== chave) {
      grupo = { chave, titulo: formatarMesAno(m.data), total: 0, movimentos: [] };
      grupos.push(grupo);
    }
    grupo.total += m.valor;
    grupo.movimentos.push(m);
  }
  return grupos;
}

export default function Historico() {
  const { saldo, hoje } = lerEstadoCaixa();
  const grupos = agruparPorMes(lerMovimentos());

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h1 className="text-3xl font-bold tracking-tight">Histórico</h1>
        <p className="text-sm text-muted-foreground">
          Saldo atual{" "}
          <span className="numero text-base font-semibold text-foreground">{formatarBRL(saldo)}</span>
        </p>
      </div>
      {grupos.length === 0 ? (
        <EstadoVazio emoji="🧾" titulo="Nenhuma movimentação ainda">
          Aportes, compras e ajustes vão aparecer aqui, agrupados por mês.
        </EstadoVazio>
      ) : (
        <ListaMovimentos grupos={grupos} hoje={hoje} />
      )}
    </div>
  );
}
