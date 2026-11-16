import Link from "next/link";
import { EstadoVazio } from "@/components/estado-vazio";
import { Button } from "@/components/ui/button";

export default function NaoEncontrado() {
  return (
    <EstadoVazio
      emoji="🔎"
      titulo="Página não encontrada"
      acao={
        <Button asChild>
          <Link href="/">Voltar ao início</Link>
        </Button>
      }
    >
      Este endereço não existe no Cofrinho.
    </EstadoVazio>
  );
}
