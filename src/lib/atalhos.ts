// Pedidos feitos pelos atalhos de teclado (só no navegador).

export const EVENTO_NOVO_DESEJO = "cofrinho:novo-desejo";

let novoDesejoPendente = false;

/** Pede o foco no campo de novo desejo (vale também depois de trocar de página). */
export function pedirNovoDesejo() {
  novoDesejoPendente = true;
  window.dispatchEvent(new CustomEvent(EVENTO_NOVO_DESEJO));
}

/** Diz se havia um pedido pendente e o marca como atendido. */
export function consumirNovoDesejo(): boolean {
  const pendente = novoDesejoPendente;
  novoDesejoPendente = false;
  return pendente;
}
