"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { abrirSimulador } from "@/components/simulador/simulador";
import { pedirNovoDesejo } from "@/lib/atalhos";

// Onde as letras são texto ou navegação, e não atalho (inclui um card sendo arrastado pelo teclado).
const IGNORAR =
  "input, textarea, select, [contenteditable]:not([contenteditable=false]), [role=menu], [role=listbox], [role=dialog], [role=alertdialog], [aria-roledescription=sortable][aria-pressed=true]";

/** Atalhos de teclado: N = novo desejo, S = simular. */
export function AtalhosDeTeclado() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      if (e.defaultPrevented || e.repeat || e.isComposing || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.target instanceof Element && e.target.closest(IGNORAR)) return;
      if (document.querySelector("[role=dialog][data-state=open], [role=alertdialog][data-state=open]")) return;

      const tecla = e.key.toLowerCase();
      if (tecla === "n") {
        e.preventDefault();
        const naLista =
          pathname === "/desejos" && new URLSearchParams(window.location.search).get("aba") !== "conquistas";
        pedirNovoDesejo();
        if (!naLista) router.push("/desejos");
      } else if (tecla === "s") {
        e.preventDefault();
        abrirSimulador();
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [pathname, router]);

  return null;
}
