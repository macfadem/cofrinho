"use client";

import { useEffect } from "react";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import { formatarBRL } from "@/lib/dinheiro";

/** Mostra um valor em reais; quando ele muda, conta até o novo valor. */
export function ValorAnimado({ centavos }: { centavos: number }) {
  const valor = useMotionValue(centavos);
  const texto = useTransform(valor, (v) => formatarBRL(Math.round(v)));
  const reduzirMovimento = useReducedMotion();

  useEffect(() => {
    if (reduzirMovimento) {
      valor.set(centavos);
      return;
    }
    const controle = animate(valor, centavos, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controle.stop();
  }, [centavos, reduzirMovimento, valor]);

  return <motion.span>{texto}</motion.span>;
}
