"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { EVENTO_ABRIR_AJUSTES } from "@/components/ajustes/ajustes-dialogo";
import { Button } from "@/components/ui/button";
import { ValorAnimado } from "@/components/valor-animado";
import { formatarDataCurta } from "@/lib/datas";
import type { EstadoCaixa } from "@/lib/db/consultas";
import { formatarBRL } from "@/lib/dinheiro";
import { DialogoAjuste } from "./dialogo-ajuste";
import { DialogoAporte, EVENTO_APORTE } from "./dialogo-aporte";

/** Card principal do Início: saldo do caixa, aporte semanal e ações. */
export function CartaoCaixa({ estado }: { estado: EstadoCaixa }) {
  const [dialogo, setDialogo] = useState<"aporte" | "ajuste" | null>(null);
  const [moedas, setMoedas] = useState(0);
  const { saldo, aporteSemanal, aporte, hoje } = estado;

  // Cada aporte confirmado (aqui ou no aviso do topo) derruba uma moeda na fenda.
  useEffect(() => {
    const cair = () => setMoedas((m) => m + 1);
    window.addEventListener(EVENTO_APORTE, cair);
    return () => window.removeEventListener(EVENTO_APORTE, cair);
  }, []);

  return (
    <section
      aria-labelledby="titulo-caixa"
      className="relative rounded-3xl bg-card p-6 pt-8 shadow-cartao sm:p-8 sm:pt-10"
    >
      <Fenda moedas={moedas} />

      <h2 id="titulo-caixa" className="font-sans text-sm font-semibold text-muted-foreground">
        Caixa
      </h2>
      <p className="numero mt-1 text-5xl leading-tight font-bold sm:text-6xl">
        <ValorAnimado centavos={saldo} />
      </p>

      <p className="mt-2 text-sm sm:text-base">
        {aporteSemanal > 0 ? (
          <>
            <span className="font-semibold text-verde">+{formatarBRL(aporteSemanal)}/semana</span>
            <span className="text-muted-foreground"> · </span>
            {aporte.pendente ? (
              <span className="font-semibold text-amarelo">
                aporte de {formatarDataCurta(aporte.ciclo)} pendente
              </span>
            ) : (
              <span className="text-muted-foreground">
                próximo aporte {formatarDataCurta(aporte.proximo)}
              </span>
            )}
          </>
        ) : (
          <span className="text-muted-foreground">
            Sem aporte semanal definido.{" "}
            <button
              type="button"
              className="font-semibold text-foreground underline underline-offset-4"
              onClick={() => window.dispatchEvent(new CustomEvent(EVENTO_ABRIR_AJUSTES))}
            >
              Definir aporte
            </button>
          </span>
        )}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        <Button
          size="lg"
          variant={aporte.pendente ? "default" : "secondary"}
          onClick={() => setDialogo("aporte")}
        >
          Confirmar aporte
        </Button>
        <Button size="lg" variant="outline" onClick={() => setDialogo("ajuste")}>
          Ajustar
        </Button>
      </div>

      <DialogoAporte
        aberto={dialogo === "aporte"}
        onAbertoChange={(v) => setDialogo(v ? "aporte" : null)}
        aporteSemanal={aporteSemanal}
        hoje={hoje}
        ciclo={aporte.ciclo}
        pendente={aporte.pendente}
      />
      <DialogoAjuste
        aberto={dialogo === "ajuste"}
        onAbertoChange={(v) => setDialogo(v ? "ajuste" : null)}
        saldo={saldo}
      />
    </section>
  );
}

/** A fenda do cofrinho no topo do card; a moeda cai nela a cada aporte. */
function Fenda({ moedas }: { moedas: number }) {
  const reduzirMovimento = useReducedMotion();
  return (
    <div aria-hidden className="pointer-events-none absolute top-3.5 left-1/2 -translate-x-1/2">
      <div className="h-1.5 w-14 rounded-full bg-foreground/15 shadow-[inset_0_1px_2px_rgb(0_0_0/0.3)]" />
      <AnimatePresence>
        {moedas > 0 && !reduzirMovimento ? (
          <motion.span
            key={moedas}
            className="absolute top-0 left-1/2 -mt-3 -ml-3.5 size-7 rounded-full bg-[radial-gradient(circle_at_35%_30%,#ffe9a3,#f2b632_55%,#c98a12)] shadow-[inset_0_0_0_2px_rgb(255_255_255/0.35),0_4px_10px_-4px_rgb(150_100_10/0.6)]"
            initial={{ y: -64, opacity: 0, scaleX: 1 }}
            animate={{ y: [-64, -14, 4], scaleX: [1, 1, 0.15], opacity: [0, 1, 1, 0] }}
            transition={{
              duration: 0.8,
              ease: "easeIn",
              times: [0, 0.55, 1],
              opacity: { duration: 0.8, times: [0, 0.15, 0.85, 1] },
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}
