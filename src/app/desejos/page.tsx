import type { Metadata } from "next";
import { AbasDesejos } from "@/components/desejos/abas-desejos";
import { BarraAdicionar } from "@/components/desejos/barra-adicionar";
import { GradeDesejos } from "@/components/desejos/grade-desejos";
import { ListaConquistas } from "@/components/desejos/lista-conquistas";
import { lerConquistas, lerContextoDoPlano, lerDesejos } from "@/lib/db/consultas";

export const metadata: Metadata = { title: "Desejos" };

export default async function Desejos({ searchParams }: PageProps<"/desejos">) {
  const { aba } = await searchParams;
  const verConquistas = aba === "conquistas";
  const desejos = lerDesejos();
  const conquistas = lerConquistas();
  const ctx = lerContextoDoPlano();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-bold tracking-tight">Desejos</h1>
        <AbasDesejos
          ativa={verConquistas ? "conquistas" : "lista"}
          totalLista={desejos.length}
          totalConquistas={conquistas.length}
        />
      </div>

      {verConquistas ? (
        <ListaConquistas itens={conquistas} />
      ) : (
        <>
          <BarraAdicionar />
          <GradeDesejos itens={desejos} ctx={ctx} />
        </>
      )}
    </div>
  );
}
