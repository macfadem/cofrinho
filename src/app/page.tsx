import { CartaoCaixa } from "@/components/caixa/cartao-caixa";
import { PrimeiroUso } from "@/components/caixa/primeiro-uso";
import { SeusAlvos } from "@/components/plano/seus-alvos";
import { lerContextoDoPlano, lerDesejos, lerEstadoCaixa } from "@/lib/db/consultas";

export default function Inicio() {
  const caixa = lerEstadoCaixa();
  const desejos = lerDesejos();

  if (!caixa.configurado) return <PrimeiroUso hoje={caixa.hoje} desejos={desejos} />;

  return (
    <div className="space-y-8">
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Início</h1>
        <CartaoCaixa estado={caixa} />
      </div>
      <SeusAlvos desejos={desejos} ctx={lerContextoDoPlano()} />
    </div>
  );
}
