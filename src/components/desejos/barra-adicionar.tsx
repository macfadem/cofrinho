"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { flushSync } from "react-dom";
import { ChevronDown, Plus } from "lucide-react";
import { toast } from "sonner";
import { adicionarItem } from "@/actions/itens";
import { CampoValor } from "@/components/campo-valor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { consumirNovoDesejo, EVENTO_NOVO_DESEJO } from "@/lib/atalhos";
import { formatarSemSimbolo, lerValor } from "@/lib/dinheiro";
import {
  arquivoDeImagem,
  ehUrl,
  enviarImagem,
  pareceImagem,
  problemaNoArquivo,
  urlDeImagem,
} from "@/lib/transferencia";
import { cn } from "@/lib/utils";
import { CampoImagem, imagemDeArquivo, imagemDeUrl, type ImagemPendente } from "./campo-imagem";
import { CamposOpcionais, lerOpcionais, OPCIONAIS_VAZIOS } from "./campos-opcionais";
import { SugestaoDoLink, usePreviewDoLink } from "./sugestao-do-link";

/**
 * Adicionar em segundos: nome + valor + Enter. O resto fica em "Mais opções".
 * Colar um link (no nome ou no campo de link) busca nome, preço e imagem da página.
 */
export function BarraAdicionar() {
  const id = useId();
  const campoNome = useRef<HTMLInputElement>(null);
  const [nome, setNome] = useState("");
  const [preco, setPreco] = useState("");
  const [maisOpcoes, setMaisOpcoes] = useState(false);
  const [opcionais, setOpcionais] = useState(OPCIONAIS_VAZIOS);
  const [imagem, setImagem] = useState<ImagemPendente | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();
  const preview = usePreviewDoLink();
  const linkBuscado = useRef<string | null>(null);

  // Atalho N: foca o campo de nome (também quando o atalho veio de outra página).
  useEffect(() => {
    const focar = () => {
      consumirNovoDesejo();
      campoNome.current?.focus();
    };
    if (consumirNovoDesejo()) campoNome.current?.focus();
    window.addEventListener(EVENTO_NOVO_DESEJO, focar);
    return () => window.removeEventListener(EVENTO_NOVO_DESEJO, focar);
  }, []);

  function buscarLink(url: string) {
    linkBuscado.current = url;
    setMaisOpcoes(true);
    preview.buscar(url);
  }

  function usarArquivo(arquivo: File) {
    const problema = problemaNoArquivo(arquivo);
    if (problema) return setErro(problema);
    setErro(null);
    setImagem(imagemDeArquivo(arquivo));
    setMaisOpcoes(true);
  }

  function colar(e: React.ClipboardEvent<HTMLFormElement>) {
    const arquivo = arquivoDeImagem(e.clipboardData);
    if (arquivo) {
      e.preventDefault();
      return usarArquivo(arquivo);
    }
    const texto = e.clipboardData.getData("text/plain").trim();
    if (!ehUrl(texto)) return;
    const alvo = e.target as HTMLElement;
    // Link colado no nome (vazio): vira o link do produto e busca a página.
    if (alvo === campoNome.current && !nome.trim()) {
      e.preventDefault();
      setOpcionais((o) => ({ ...o, link: texto }));
      buscarLink(texto);
    } else if (alvo.id === `${id}-link`) {
      buscarLink(texto);
    }
  }

  function soltar(e: React.DragEvent<HTMLFormElement>) {
    setArrastando(false);
    const arquivo = arquivoDeImagem(e.dataTransfer);
    const url = arquivo ? null : urlDeImagem(e.dataTransfer);
    if (!arquivo && !url) return;
    e.preventDefault();
    if (arquivo) usarArquivo(arquivo);
    else if (url) {
      setImagem(imagemDeUrl(url));
      setMaisOpcoes(true);
    }
  }

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const valor = lerValor(preco);
    if (!nome.trim()) {
      setErro("Escreva o nome do desejo.");
      campoNome.current?.focus();
      return;
    }
    if (valor === null || valor <= 0) {
      setErro("Informe o valor, por exemplo 199,90.");
      document.getElementById(`${id}-preco`)?.focus();
      return;
    }
    const extras = lerOpcionais(opcionais);
    if (!extras.ok) return setErro(extras.erro);
    const imagemEscolhida = imagem;

    iniciar(async () => {
      const r = await adicionarItem({ nome: nome.trim(), preco: valor, ...extras.dados });
      if (!r.ok) return setErro(r.erro);

      // Limpa já (antes de mudar o foco), para o campo de valor não se repreencher ao perder o foco.
      flushSync(() => {
        setNome("");
        setPreco("");
        setOpcionais(OPCIONAIS_VAZIOS);
        setImagem(null);
        setMaisOpcoes(false);
      });
      preview.limpar();
      linkBuscado.current = null;
      campoNome.current?.focus();

      if (imagemEscolhida) {
        const origem = imagemEscolhida.tipo === "arquivo" ? imagemEscolhida.arquivo : imagemEscolhida.url;
        const comImagem = await enviarImagem(r.dados.id, origem);
        if (!comImagem.ok) {
          toast.warning(`${nome.trim()} entrou na lista, mas sem a imagem.`, { description: comImagem.erro });
          return;
        }
      }
      toast.success(`${nome.trim()} entrou na lista.`);
    });
  }

  return (
    <form
      onSubmit={enviar}
      onPaste={colar}
      onDragOver={(e) => {
        if (!pareceImagem(e.dataTransfer)) return;
        e.preventDefault();
        setArrastando(true);
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setArrastando(false);
      }}
      onDrop={soltar}
      aria-label="Adicionar desejo"
      className={cn(
        "rounded-3xl bg-card p-3 shadow-cartao ring-2 ring-transparent transition-shadow sm:p-4",
        arrastando && "ring-primary",
      )}
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          ref={campoNome}
          id="campo-novo-desejo"
          value={nome}
          maxLength={120}
          autoComplete="off"
          placeholder="O que você quer comprar? (ou cole um link)"
          aria-label="Nome do desejo"
          aria-keyshortcuts="N"
          onChange={(e) => {
            setNome(e.target.value);
            setErro(null);
          }}
          className="h-12 flex-1 text-base md:text-base"
        />
        <CampoValor
          id={`${id}-preco`}
          value={preco}
          placeholder="0,00"
          aria-label="Valor"
          onChange={(t) => {
            setPreco(t);
            setErro(null);
          }}
          className="sm:w-44"
          classeCampo="h-12"
        />
        <Button type="submit" size="lg" disabled={salvando} className="h-12">
          <Plus />
          Adicionar
        </Button>
      </div>

      <button
        type="button"
        aria-expanded={maisOpcoes}
        aria-controls={`${id}-opcoes`}
        onClick={() => setMaisOpcoes((v) => !v)}
        className="mt-2 inline-flex items-center gap-1 rounded-lg px-1 py-1 text-sm font-semibold text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        Mais opções
        <ChevronDown className={cn("size-4 transition-transform", maisOpcoes && "rotate-180")} aria-hidden />
      </button>

      {maisOpcoes ? (
        <div id={`${id}-opcoes`} className="mt-3 grid gap-4 border-t pt-4">
          <SugestaoDoLink
            estado={preview.estado}
            onFechar={preview.limpar}
            onUsar={(dados) => {
              if (dados.nome) setNome(dados.nome);
              if (dados.preco) setPreco(formatarSemSimbolo(dados.preco));
              if (dados.imagemUrl) setImagem(imagemDeUrl(dados.imagemUrl));
              preview.limpar();
              setErro(null);
            }}
          />
          <CamposOpcionais
            idBase={id}
            valor={opcionais}
            onChange={setOpcionais}
            onLinkBlur={(link) => {
              const url = link.trim();
              if (ehUrl(url) && url !== linkBuscado.current) buscarLink(url);
            }}
          />
          <div className="grid gap-2">
            <p className="text-sm font-medium">Imagem</p>
            <CampoImagem valor={imagem} onChange={setImagem} nome={nome} onArquivo={usarArquivo} />
          </div>
        </div>
      ) : null}

      {erro ? (
        <p role="alert" className="mt-2 px-1 text-sm font-medium text-destructive">
          {erro}
        </p>
      ) : null}
    </form>
  );
}
