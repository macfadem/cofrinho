"use client";

import { useId, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { editarItem } from "@/actions/itens";
import { CampoValor } from "@/components/campo-valor";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Item } from "@/lib/db/schema";
import { formatarSemSimbolo, lerValor } from "@/lib/dinheiro";
import { ehUrl, enviarImagem } from "@/lib/transferencia";
import { CamposOpcionais, lerOpcionais, opcionaisDoItem } from "./campos-opcionais";
import { ImagemItem } from "./imagem-item";
import { SugestaoDoLink, usePreviewDoLink } from "./sugestao-do-link";

/** Editar um desejo com todos os campos. */
export function DialogoItem({
  item,
  aberto,
  onAbertoChange,
}: {
  item: Item | null;
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
}) {
  return (
    <Dialog open={aberto && item !== null} onOpenChange={onAbertoChange}>
      <DialogContent aria-describedby={undefined} className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {item ? <Formulario key={item.id} item={item} aoTerminar={() => onAbertoChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function Formulario({ item, aoTerminar }: { item: Item; aoTerminar: () => void }) {
  const id = useId();
  const [nome, setNome] = useState(item.nome);
  const [preco, setPreco] = useState(formatarSemSimbolo(item.preco));
  const [opcionais, setOpcionais] = useState(opcionaisDoItem(item));
  const [imagemDoLink, setImagemDoLink] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, iniciar] = useTransition();
  const preview = usePreviewDoLink();
  const linkBuscado = useRef<string | null>(item.link);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    const valor = lerValor(preco);
    if (!nome.trim()) return setErro("Dê um nome ao desejo.");
    if (valor === null || valor <= 0) return setErro("Informe um preço maior que zero.");
    const extras = lerOpcionais(opcionais);
    if (!extras.ok) return setErro(extras.erro);

    iniciar(async () => {
      const r = await editarItem({ id: item.id, nome: nome.trim(), preco: valor, ...extras.dados });
      if (!r.ok) return setErro(r.erro);
      if (imagemDoLink) {
        const comImagem = await enviarImagem(item.id, imagemDoLink);
        if (!comImagem.ok) {
          toast.warning("Desejo atualizado, mas sem a imagem nova.", { description: comImagem.erro });
          return aoTerminar();
        }
      }
      toast.success("Desejo atualizado.");
      aoTerminar();
    });
  }

  function buscarLink(url: string) {
    linkBuscado.current = url;
    preview.buscar(url);
  }

  return (
    <form
      onSubmit={enviar}
      onPaste={(e) => {
        const texto = e.clipboardData.getData("text/plain").trim();
        if ((e.target as HTMLElement).id === `${id}-link` && ehUrl(texto)) buscarLink(texto);
      }}
      className="grid gap-5"
    >
      <DialogHeader>
        <DialogTitle>Editar desejo</DialogTitle>
      </DialogHeader>

      <div className="grid gap-3 sm:grid-cols-[1fr_11rem]">
        <div className="grid gap-2">
          <Label htmlFor={`${id}-nome`}>Nome</Label>
          <Input
            id={`${id}-nome`}
            value={nome}
            maxLength={120}
            onChange={(e) => {
              setNome(e.target.value);
              setErro(null);
            }}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${id}-preco`}>Preço</Label>
          <CampoValor
            id={`${id}-preco`}
            value={preco}
            onChange={(t) => {
              setPreco(t);
              setErro(null);
            }}
          />
        </div>
      </div>

      <SugestaoDoLink
        estado={preview.estado}
        onFechar={preview.limpar}
        onUsar={(dados) => {
          if (dados.nome) setNome(dados.nome);
          if (dados.preco) setPreco(formatarSemSimbolo(dados.preco));
          setImagemDoLink(dados.imagemUrl);
          preview.limpar();
        }}
      />
      {imagemDoLink ? (
        <p className="flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
          <ImagemItem nome={nome} src={imagemDoLink} className="size-9 shrink-0 rounded-lg" tamanhoEmoji="text-base" />
          A imagem da página entra quando você salvar.
        </p>
      ) : null}

      <CamposOpcionais
        idBase={id}
        valor={opcionais}
        onChange={setOpcionais}
        onLinkBlur={(link) => {
          const url = link.trim();
          if (ehUrl(url) && url !== linkBuscado.current) buscarLink(url);
        }}
      />

      {erro ? (
        <p role="alert" className="text-sm font-medium text-destructive">
          {erro}
        </p>
      ) : null}

      <DialogFooter>
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </DialogClose>
        <Button type="submit" disabled={salvando}>
          {salvando ? "Salvando..." : "Salvar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
