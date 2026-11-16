"use client";

import { useId, useState, useTransition } from "react";
import { PiggyBank } from "lucide-react";
import { toast } from "sonner";
import { concluirPrimeiroUso } from "@/actions/ajustes";
import { CampoValor } from "@/components/campo-valor";
import { SeletorDia } from "@/components/seletor-dia";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatarDataCurta } from "@/lib/datas";
import { lerValor } from "@/lib/dinheiro";
import { SeletorAlvos } from "@/components/plano/seletor-alvos";
import type { Item } from "@/lib/db/schema";
import { cicloAtual } from "@/lib/plano";
import { cn } from "@/lib/utils";

const TOTAL_PASSOS = 3;

/** Primeiro uso: quanto já está guardado; aporte semanal e dia; quais são os alvos. */
export function PrimeiroUso({ hoje, desejos }: { hoje: string; desejos: Item[] }) {
  const id = useId();
  const [passo, setPasso] = useState(1);
  const [saldoTexto, setSaldoTexto] = useState("");
  const [aporteTexto, setAporteTexto] = useState("");
  const [dia, setDia] = useState(3);
  const [jaGuardado, setJaGuardado] = useState<"sim" | "nao" | "">("");
  const [alvos, setAlvos] = useState<number[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  const saldo = saldoTexto.trim() === "" ? 0 : lerValor(saldoTexto);
  const aporte = aporteTexto.trim() === "" ? 0 : lerValor(aporteTexto);
  const ciclo = cicloAtual(hoje, dia);
  const quandoCiclo = ciclo === hoje ? "hoje" : formatarDataCurta(ciclo);

  function avancar(e: React.FormEvent) {
    e.preventDefault();
    if (saldo === null) {
      setErro("Não entendi esse valor. Use, por exemplo, 1.250,00.");
      return;
    }
    setErro(null);
    setPasso(2);
  }

  function irParaAlvos(e: React.FormEvent) {
    e.preventDefault();
    if (aporte === null) {
      setErro("Não entendi esse valor. Use, por exemplo, 150,00.");
      return;
    }
    if (aporte > 0 && !jaGuardado) {
      setErro("Conte se o aporte desta semana já está no saldo.");
      return;
    }
    setErro(null);
    setPasso(3);
  }

  function concluir(e: React.FormEvent) {
    e.preventDefault();
    if (aporte === null || saldo === null) return;
    iniciar(async () => {
      const r = await concluirPrimeiroUso({
        saldoInicial: saldo,
        aporteSemanal: aporte,
        diaAporte: dia,
        aporteDaSemanaJaGuardado: jaGuardado === "sim",
        alvos,
      });
      if (!r.ok) setErro(r.erro);
      else toast.success("Tudo pronto! Seu cofrinho está configurado.");
    });
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="rounded-3xl bg-card p-6 shadow-cartao sm:p-8">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-rosa-suave text-rosa-tinta">
            <PiggyBank className="size-5" aria-hidden />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold text-muted-foreground">
              Passo {passo} de {TOTAL_PASSOS}
            </p>
            <div className="mt-1.5 flex gap-1.5" aria-hidden>
              {Array.from({ length: TOTAL_PASSOS }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 flex-1 rounded-full transition-colors",
                    i < passo ? "bg-primary" : "bg-muted",
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        {passo === 1 ? (
          <form onSubmit={avancar} className="mt-6">
            <h1 className="text-3xl font-bold tracking-tight">Quanto você já tem guardado?</h1>
            <p id={`${id}-ajuda-saldo`} className="mt-2 text-muted-foreground">
              Boas-vindas! Conte quanto já está reservado para as compras da lista. Pode ser zero.
            </p>
            <CampoValor
              grande
              autoFocus
              className="mt-6"
              placeholder="0,00"
              aria-label="Quanto já está guardado"
              aria-describedby={`${id}-ajuda-saldo`}
              value={saldoTexto}
              onChange={(t) => {
                setSaldoTexto(t);
                setErro(null);
              }}
            />
            <Erro texto={erro} />
            <div className="mt-6 flex justify-end">
              <Button type="submit" size="lg">
                Continuar
              </Button>
            </div>
          </form>
        ) : passo === 2 ? (
          <form onSubmit={irParaAlvos} className="mt-6">
            <h1 className="text-3xl font-bold tracking-tight">Quanto vai guardar por semana?</h1>
            <p className="mt-2 text-muted-foreground">
              É o aporte fixo do cofrinho. Você pode mudar depois nos Ajustes.
            </p>
            <CampoValor
              grande
              autoFocus
              className="mt-6"
              placeholder="0,00"
              aria-label="Quanto vai guardar por semana"
              value={aporteTexto}
              onChange={(t) => {
                setAporteTexto(t);
                setErro(null);
              }}
            />

            <p id={`${id}-dia`} className="mt-6 mb-2 text-sm font-semibold">
              Em que dia da semana?
            </p>
            <SeletorDia value={dia} onChange={setDia} aria-labelledby={`${id}-dia`} />

            {aporte !== null && aporte > 0 ? (
              <>
                <p id={`${id}-ja`} className="mt-6 mb-2 text-sm font-semibold">
                  O aporte desta semana ({quandoCiclo}) já está no saldo que você informou?
                </p>
                <ToggleGroup
                  type="single"
                  spacing={1}
                  value={jaGuardado}
                  onValueChange={(v) => {
                    setJaGuardado(v as "sim" | "nao" | "");
                    setErro(null);
                  }}
                  aria-labelledby={`${id}-ja`}
                  className="grid w-full grid-cols-2 rounded-2xl bg-muted p-1"
                >
                  {[
                    ["sim", "Sim, já está"],
                    ["nao", "Ainda não"],
                  ].map(([valor, rotulo]) => (
                    <ToggleGroupItem
                      key={valor}
                      value={valor}
                      className="w-full text-muted-foreground hover:bg-card/60 hover:text-foreground data-[state=on]:bg-card data-[state=on]:font-semibold data-[state=on]:text-foreground data-[state=on]:shadow-cartao dark:data-[state=on]:bg-secondary"
                    >
                      {rotulo}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </>
            ) : null}

            <Erro texto={erro} />
            <div className="mt-6 flex justify-between gap-2">
              <Button
                type="button"
                size="lg"
                variant="ghost"
                onClick={() => {
                  setErro(null);
                  setPasso(1);
                }}
              >
                Voltar
              </Button>
              <Button type="submit" size="lg">
                Continuar
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={concluir} className="mt-6">
            <h1 className="text-3xl font-bold tracking-tight">Quais são seus alvos?</h1>
            <p className="mt-2 text-muted-foreground">
              Marque o que você quer comprar primeiro. Pode ser mais de um, e dá para mudar depois.
            </p>
            <div className="mt-6">
              {desejos.length > 0 ? (
                <SeletorAlvos desejos={desejos} valor={alvos} onChange={setAlvos} />
              ) : (
                <p className="rounded-2xl bg-muted px-4 py-3 text-sm text-muted-foreground">
                  Sua lista está vazia. Você escolhe os alvos depois de adicionar desejos.
                </p>
              )}
            </div>
            <Erro texto={erro} />
            <div className="mt-6 flex justify-between gap-2">
              <Button
                type="button"
                size="lg"
                variant="ghost"
                onClick={() => {
                  setErro(null);
                  setPasso(2);
                }}
              >
                Voltar
              </Button>
              <Button type="submit" size="lg" disabled={salvando}>
                {salvando ? "Salvando..." : "Concluir"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function Erro({ texto }: { texto: string | null }) {
  if (!texto) return null;
  return (
    <p role="alert" className="mt-3 text-sm font-medium text-destructive">
      {texto}
    </p>
  );
}
