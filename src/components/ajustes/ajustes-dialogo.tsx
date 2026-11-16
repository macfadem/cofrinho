"use client";

import { useEffect, useId, useRef, useState, useTransition, type ChangeEvent } from "react";
import { Download, Moon, SlidersHorizontal, Sun, SunMoon, Upload } from "lucide-react";
import { toast } from "sonner";
import { exportarBackup, importarBackup, salvarAporte, salvarTema } from "@/actions/ajustes";
import { CampoValor } from "@/components/campo-valor";
import { SeletorDia } from "@/components/seletor-dia";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Tema } from "@/lib/db/schema";
import { formatarBRL, formatarSemSimbolo, lerValor } from "@/lib/dinheiro";

/** Dispare este evento para abrir os Ajustes de qualquer lugar. */
export const EVENTO_ABRIR_AJUSTES = "cofrinho:abrir-ajustes";

const OPCOES_TEMA: { valor: Tema; rotulo: string; Icone: typeof Sun }[] = [
  { valor: "claro", rotulo: "Claro", Icone: Sun },
  { valor: "escuro", rotulo: "Escuro", Icone: Moon },
  { valor: "auto", rotulo: "Automático", Icone: SunMoon },
];

type Props = {
  tema: Tema;
  aporteSemanal: number;
  diaAporte: number;
};

/** Botão de Ajustes no topo, que abre o modal de ajustes. */
export function AjustesDialogo(props: Props) {
  const [aberto, setAberto] = useState(false);

  useEffect(() => {
    const abrir = () => setAberto(true);
    window.addEventListener(EVENTO_ABRIR_AJUSTES, abrir);
    return () => window.removeEventListener(EVENTO_ABRIR_AJUSTES, abrir);
  }, []);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Ajustes">
          <SlidersHorizontal className="size-5" />
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby={undefined} className="max-h-[calc(100dvh-2rem)] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajustes</DialogTitle>
        </DialogHeader>
        <SecaoAporte aporteSemanal={props.aporteSemanal} diaAporte={props.diaAporte} />
        <hr className="border-border" />
        <SecaoTema tema={props.tema} />
        <hr className="border-border" />
        <SecaoBackup aoImportar={() => setAberto(false)} />
        <hr className="border-border" />
        <SecaoAtalhos />
      </DialogContent>
    </Dialog>
  );
}

function SecaoAporte({ aporteSemanal, diaAporte }: Omit<Props, "tema">) {
  const id = useId();
  const [texto, setTexto] = useState(aporteSemanal > 0 ? formatarSemSimbolo(aporteSemanal) : "");
  const [dia, setDia] = useState(diaAporte);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();

  const valor = texto.trim() === "" ? 0 : lerValor(texto);
  const mudou = valor !== aporteSemanal || dia !== diaAporte;

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (valor === null) {
      setErro("Informe um valor, por exemplo 150,00.");
      return;
    }
    iniciar(async () => {
      const r = await salvarAporte({ aporteSemanal: valor, diaAporte: dia });
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      toast.success(
        valor > 0 ? `Aporte semanal de ${formatarBRL(valor)} salvo.` : "Aporte semanal removido.",
      );
    });
  }

  return (
    <form onSubmit={salvar} aria-labelledby={`${id}-titulo`} className="grid gap-3">
      <h3 id={`${id}-titulo`} className="font-sans text-sm font-semibold">
        Aporte semanal
      </h3>
      <CampoValor
        value={texto}
        aria-labelledby={`${id}-titulo`}
        placeholder="0,00"
        onChange={(t) => {
          setTexto(t);
          setErro(null);
        }}
      />
      <p id={`${id}-dia`} className="text-sm text-muted-foreground">
        Dia do aporte
      </p>
      <SeletorDia value={dia} onChange={setDia} aria-labelledby={`${id}-dia`} />
      {erro ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {erro}
        </p>
      ) : null}
      <div className="flex justify-end">
        <Button type="submit" disabled={!mudou || salvando}>
          {salvando ? "Salvando..." : "Salvar aporte"}
        </Button>
      </div>
    </form>
  );
}

function SecaoTema({ tema }: { tema: Tema }) {
  const id = useId();
  const [temaAtual, setTemaAtual] = useState<Tema>(tema);
  const [, iniciar] = useTransition();

  function escolherTema(valor: string) {
    if (!valor) return; // clicar de novo na opção marcada não desmarca
    const novo = valor as Tema;
    setTemaAtual(novo);
    // Aplica na hora; o script de tema no <html> troca as cores.
    document.documentElement.setAttribute("data-tema", novo);
    iniciar(async () => {
      const r = await salvarTema(novo);
      if (!r.ok) toast.error(r.erro);
    });
  }

  return (
    <section aria-labelledby={`${id}-tema`} className="grid gap-3">
      <h3 id={`${id}-tema`} className="font-sans text-sm font-semibold">
        Tema
      </h3>
      <ToggleGroup
        type="single"
        spacing={1}
        value={temaAtual}
        onValueChange={escolherTema}
        aria-labelledby={`${id}-tema`}
        className="grid w-full grid-cols-3 rounded-2xl bg-muted p-1"
      >
        {OPCOES_TEMA.map(({ valor, rotulo, Icone }) => (
          <ToggleGroupItem
            key={valor}
            value={valor}
            className="w-full text-muted-foreground hover:bg-card/60 hover:text-foreground data-[state=on]:bg-card data-[state=on]:text-foreground data-[state=on]:shadow-cartao dark:data-[state=on]:bg-secondary"
          >
            <Icone aria-hidden />
            {rotulo}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <p className="text-sm text-muted-foreground">
        Automático acompanha o modo claro ou escuro do computador.
      </p>
    </section>
  );
}

const quandoFoiExportado = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  dateStyle: "short",
  timeStyle: "short",
});

/** Resumo do arquivo para confirmar antes de importar (a validação de verdade é no servidor). */
function resumirArquivo(json: unknown): string | null {
  if (typeof json !== "object" || json === null) return null;
  const b = json as { app?: unknown; exportadoEm?: unknown; itens?: unknown; movimentos?: unknown };
  if (b.app !== "cofrinho" || !Array.isArray(b.itens) || !Array.isArray(b.movimentos)) return null;
  const desejos = b.itens.filter(
    (i: { status?: unknown; excluidoEm?: unknown }) => i?.status === "desejo" && !i?.excluidoEm,
  ).length;
  const data = typeof b.exportadoEm === "string" ? new Date(b.exportadoEm) : null;
  const quando = data && !Number.isNaN(data.getTime()) ? `, de ${quandoFoiExportado.format(data)}` : "";
  return `Backup com ${desejos} ${desejos === 1 ? "desejo" : "desejos"} e ${b.movimentos.length} ${
    b.movimentos.length === 1 ? "movimentação" : "movimentações"
  }${quando}.`;
}

function SecaoBackup({ aoImportar }: { aoImportar: () => void }) {
  const id = useId();
  const seletor = useRef<HTMLInputElement>(null);
  const [exportando, iniciarExportacao] = useTransition();
  const [importando, iniciarImportacao] = useTransition();
  const [escolhido, setEscolhido] = useState<{ arquivo: File; resumo: string } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  function exportar() {
    setErro(null);
    iniciarExportacao(async () => {
      const r = await exportarBackup();
      if (!r.ok) return void toast.error(r.erro);
      const url = URL.createObjectURL(new Blob([r.dados.conteudo], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = r.dados.nome;
      document.body.append(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      toast.success(`Backup salvo como ${r.dados.nome} (na pasta de downloads).`);
    });
  }

  async function escolher(e: ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = ""; // permite escolher o mesmo arquivo de novo
    if (!arquivo) return;
    setErro(null);
    setEscolhido(null);
    let resumo: string | null = null;
    try {
      resumo = resumirArquivo(JSON.parse(await arquivo.text()));
    } catch {
      resumo = null;
    }
    if (!resumo) return setErro("Esse arquivo não é um backup do Cofrinho.");
    setEscolhido({ arquivo, resumo });
  }

  function importar() {
    if (!escolhido) return;
    const formulario = new FormData();
    formulario.set("arquivo", escolhido.arquivo);
    iniciarImportacao(async () => {
      const r = await importarBackup(formulario);
      if (!r.ok) return void setErro(r.erro);
      setEscolhido(null);
      toast.success("Backup importado.", {
        description: `Os dados de antes ficaram guardados em data/backups/${r.dados.copia}.`,
      });
      aoImportar();
    });
  }

  return (
    <section aria-labelledby={`${id}-backup`} className="grid gap-3">
      <div>
        <h3 id={`${id}-backup`} className="font-sans text-sm font-semibold">
          Backup
        </h3>
        <p className="text-sm text-pretty text-muted-foreground">
          Guarde tudo (desejos com imagens, histórico e ajustes) num arquivo JSON, ou volte de um arquivo guardado.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={exportar} disabled={exportando}>
          <Download />
          {exportando ? "Exportando..." : "Exportar backup"}
        </Button>
        <Button variant="outline" onClick={() => seletor.current?.click()} disabled={importando}>
          <Upload />
          Importar backup
        </Button>
        <input
          ref={seletor}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          onChange={escolher}
        />
      </div>

      {escolhido ? (
        <div className="grid gap-3 rounded-2xl bg-amarelo-suave p-4 text-sm text-foreground">
          <div>
            <p className="font-semibold">Trocar todos os dados por este backup?</p>
            <p className="mt-1 text-pretty">
              {escolhido.resumo} O que está no app agora é substituído pelo arquivo. Antes, o app guarda uma cópia
              dos dados de agora na pasta data/backups.
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setEscolhido(null)} disabled={importando}>
              Cancelar
            </Button>
            <Button onClick={importar} disabled={importando}>
              {importando ? "Importando..." : "Importar e substituir"}
            </Button>
          </div>
        </div>
      ) : null}

      {erro ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {erro}
        </p>
      ) : null}
    </section>
  );
}

const ATALHOS = [
  { tecla: "N", acao: "Novo desejo" },
  { tecla: "S", acao: "Simular" },
];

function SecaoAtalhos() {
  const id = useId();
  return (
    <section aria-labelledby={`${id}-atalhos`} className="grid gap-2">
      <h3 id={`${id}-atalhos`} className="font-sans text-sm font-semibold">
        Atalhos de teclado
      </h3>
      <dl className="grid gap-1.5 text-sm">
        {ATALHOS.map(({ tecla, acao }) => (
          <div key={tecla} className="flex items-center gap-3">
            <dt>
              <kbd className="numero inline-flex min-w-7 items-center justify-center rounded-lg border border-b-2 bg-muted px-2 py-0.5 text-xs font-bold">
                {tecla}
              </kbd>
            </dt>
            <dd className="text-muted-foreground">{acao}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
