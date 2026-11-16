/**
 * Script que roda antes da página aparecer: aplica a classe .dark no <html>
 * conforme o tema salvo (data-tema) e o tema do sistema, sem "piscar".
 * Também reage quando o tema do sistema muda ou quando data-tema é alterado.
 */
export const SCRIPT_TEMA = `(function(){try{var d=document.documentElement,m=window.matchMedia("(prefers-color-scheme: dark)");function a(){var t=d.getAttribute("data-tema");var e=t==="escuro"||(t!=="claro"&&m.matches);d.classList.toggle("dark",e);d.style.colorScheme=e?"dark":"light"}a();m.addEventListener("change",a);new MutationObserver(a).observe(d,{attributes:true,attributeFilter:["data-tema"]})}catch(e){}})();`;
