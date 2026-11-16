"use client";

import { useEffect, useRef, useState } from "react";
import { formatarBRL, formatarSemSimbolo, lerValor } from "@/lib/dinheiro";
import { cn } from "@/lib/utils";

type Props = {
  /** Como o campo é lido por quem usa leitor de tela: "Nome", "Preço"… */
  rotulo: string;
  className?: string;
} & (
  | { tipo: "texto"; valor: string; onSalvar: (novo: string) => Promise<boolean> }
  | { tipo: "dinheiro"; valor: number; onSalvar: (novo: number) => Promise<boolean> }
);

/**
 * Texto do card que vira campo ao clicar: Enter ou sair do campo salva, Esc cancela.
 * Mostra o valor novo na hora e volta ao antigo se der erro.
 */
export function CampoNoCard(props: Props) {
  const { rotulo, className, tipo } = props;
  const [editando, setEditando] = useState(false);
  const [exibido, setExibido] = useState(props.valor);
  const [texto, setTexto] = useState("");
  const campo = useRef<HTMLInputElement>(null);
  const botao = useRef<HTMLButtonElement>(null);
  const cancelado = useRef(false);

  // Acompanha o valor que vem do servidor.
  useEffect(() => setExibido(props.valor), [props.valor]);

  useEffect(() => {
    if (editando) campo.current?.select();
  }, [editando]);

  const textoExibido = tipo === "dinheiro" ? formatarBRL(exibido as number) : (exibido as string);

  function abrir() {
    cancelado.current = false;
    setTexto(tipo === "dinheiro" ? formatarSemSimbolo(exibido as number) : (exibido as string));
    setEditando(true);
  }

  async function concluir() {
    setEditando(false);
    if (cancelado.current) return;
    const anterior = exibido;
    if (props.tipo === "dinheiro") {
      const novo = lerValor(texto);
      if (novo === null || novo <= 0 || novo === anterior) return;
      setExibido(novo);
      if (!(await props.onSalvar(novo))) setExibido(anterior);
    } else {
      const novo = texto.trim();
      if (!novo || novo === anterior) return;
      setExibido(novo);
      if (!(await props.onSalvar(novo))) setExibido(anterior);
    }
  }

  if (editando) {
    return (
      <input
        ref={campo}
        autoFocus
        value={texto}
        aria-label={rotulo}
        inputMode={tipo === "dinheiro" ? "decimal" : undefined}
        maxLength={tipo === "texto" ? 120 : 20}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            campo.current?.blur();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            cancelado.current = true;
            campo.current?.blur();
            requestAnimationFrame(() => botao.current?.focus());
          }
        }}
        onBlur={concluir}
        className={cn(
          "-mx-1.5 w-[calc(100%+0.75rem)] rounded-lg bg-muted px-1.5 outline-none ring-2 ring-ring/50",
          className,
        )}
      />
    );
  }

  return (
    <button
      ref={botao}
      type="button"
      onClick={abrir}
      title="Clique para editar"
      aria-label={`${rotulo}: ${textoExibido}. Editar`}
      className={cn(
        "-mx-1.5 rounded-lg px-1.5 text-left decoration-muted-foreground/50 decoration-dotted underline-offset-4 outline-none hover:underline focus-visible:ring-[3px] focus-visible:ring-ring/50",
        className,
      )}
    >
      {textoExibido}
    </button>
  );
}
