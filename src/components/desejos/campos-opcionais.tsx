"use client";

import { CampoValor } from "@/components/campo-valor";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatarSemSimbolo, lerValor } from "@/lib/dinheiro";

/** Campos opcionais de um desejo, como texto digitado. */
export type TextosOpcionais = {
  link: string;
  nota: string;
  dataDesejada: string;
  precoAlvo: string;
};

export const OPCIONAIS_VAZIOS: TextosOpcionais = { link: "", nota: "", dataDesejada: "", precoAlvo: "" };

export function opcionaisDoItem(item: {
  link: string | null;
  nota: string | null;
  dataDesejada: string | null;
  precoAlvo: number | null;
}): TextosOpcionais {
  return {
    link: item.link ?? "",
    nota: item.nota ?? "",
    dataDesejada: item.dataDesejada ?? "",
    precoAlvo: item.precoAlvo ? formatarSemSimbolo(item.precoAlvo) : "",
  };
}

export type Opcionais = {
  link: string | null;
  nota: string | null;
  dataDesejada: string | null;
  precoAlvo: number | null;
};

/** Lê os campos opcionais; link sem "https://" ganha o prefixo. */
export function lerOpcionais(t: TextosOpcionais): { ok: true; dados: Opcionais } | { ok: false; erro: string } {
  let link = t.link.trim() || null;
  if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`;
  const precoAlvo = t.precoAlvo.trim() === "" ? null : lerValor(t.precoAlvo);
  if (precoAlvo === null && t.precoAlvo.trim() !== "") {
    return { ok: false, erro: "Não entendi o preço-alvo. Use, por exemplo, 1.900,00." };
  }
  if (precoAlvo !== null && precoAlvo <= 0) {
    return { ok: false, erro: "O preço-alvo precisa ser maior que zero." };
  }
  return {
    ok: true,
    dados: { link, nota: t.nota.trim() || null, dataDesejada: t.dataDesejada || null, precoAlvo },
  };
}

export function CamposOpcionais({
  idBase,
  valor,
  onChange,
  onLinkBlur,
}: {
  idBase: string;
  valor: TextosOpcionais;
  onChange: (novo: TextosOpcionais) => void;
  /** Ao sair do campo de link (para buscar os dados da página). */
  onLinkBlur?: (link: string) => void;
}) {
  const mudar = (campo: keyof TextosOpcionais) => (texto: string) => onChange({ ...valor, [campo]: texto });

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor={`${idBase}-link`}>Link do produto</Label>
        <Input
          id={`${idBase}-link`}
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder="https://"
          value={valor.link}
          onChange={(e) => mudar("link")(e.target.value)}
          onBlur={(e) => onLinkBlur?.(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idBase}-data`}>Data desejada</Label>
        <Input
          id={`${idBase}-data`}
          type="date"
          value={valor.dataDesejada}
          onChange={(e) => mudar("dataDesejada")(e.target.value)}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${idBase}-alvo`}>Preço-alvo</Label>
        <CampoValor
          id={`${idBase}-alvo`}
          placeholder="0,00"
          value={valor.precoAlvo}
          onChange={mudar("precoAlvo")}
        />
      </div>
      <div className="grid gap-2 sm:col-span-2">
        <Label htmlFor={`${idBase}-nota`}>Nota</Label>
        <Textarea
          id={`${idBase}-nota`}
          rows={2}
          maxLength={500}
          placeholder="Onde comprar, modelo, tamanho…"
          value={valor.nota}
          onChange={(e) => mudar("nota")(e.target.value)}
        />
      </div>
    </div>
  );
}
