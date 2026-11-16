"use client";

import { EstadoVazio } from "@/components/estado-vazio";
import { Button } from "@/components/ui/button";

export default function Erro({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <EstadoVazio
      emoji="🛠️"
      titulo="Esta tela não carregou"
      acao={<Button onClick={reset}>Tentar de novo</Button>}
    >
      Tente de novo. Se continuar, feche a janela do Cofrinho e abra com{" "}
      <code className="rounded bg-muted px-1.5 py-0.5 text-sm">npm run app</code>.
      {error.digest ? (
        <span className="mt-2 block text-xs">Código do erro: {error.digest}</span>
      ) : null}
    </EstadoVazio>
  );
}
