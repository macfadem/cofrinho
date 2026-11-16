import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { AjustesDialogo } from "@/components/ajustes/ajustes-dialogo";
import { AvisoAporte } from "@/components/caixa/aviso-aporte";
import { Marca } from "@/components/layout/marca";
import {
  NavegacaoInferior,
  NavegacaoTopo,
} from "@/components/layout/navegacao";
import { AtalhosDeTeclado } from "@/components/layout/atalhos";
import { Simulador } from "@/components/simulador/simulador";
import { Toaster } from "@/components/ui/sonner";
import { lerAjustes, lerDesejos, lerEstadoCaixa } from "@/lib/db/consultas";
import { SCRIPT_TEMA } from "@/lib/tema";
import "./globals.css";

// Os dados mudam a cada clique e moram no banco local: sempre renderiza na hora.
export const dynamic = "force-dynamic";

const figtree = localFont({
  src: "./fonts/figtree.woff2",
  variable: "--font-figtree",
  weight: "300 900",
  display: "swap",
});

const bricolage = localFont({
  src: "./fonts/bricolage-grotesque.woff2",
  variable: "--font-bricolage",
  weight: "200 800",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Cofrinho", template: "%s | Cofrinho" },
  applicationName: "Cofrinho",
  description: "Lista de desejos com caixa e plano de compras.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#faf4f2" },
    { media: "(prefers-color-scheme: dark)", color: "#181215" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  const { tema, aporteSemanal, diaAporte } = lerAjustes();
  const caixa = lerEstadoCaixa();

  return (
    <html
      lang="pt-BR"
      data-tema={tema}
      className={`${figtree.variable} ${bricolage.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_TEMA }} />
      </head>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#conteudo"
          className="sr-only rounded-full bg-primary font-semibold text-primary-foreground shadow-flutuante focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[60] focus:px-4 focus:py-2"
        >
          Pular para o conteúdo
        </a>
        <header className="sticky top-0 z-40 bg-background/85 backdrop-blur-md">
          <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-2 px-4">
            <Marca />
            <NavegacaoTopo className="ml-6 hidden md:block" />
            <div className="ml-auto">
              <AjustesDialogo tema={tema} aporteSemanal={aporteSemanal} diaAporte={diaAporte} />
            </div>
          </div>
        </header>

        <AvisoAporte estado={caixa} />

        <main
          id="conteudo"
          tabIndex={-1}
          className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-28 outline-none md:pt-8 md:pb-16"
        >
          {children}
        </main>

        <NavegacaoInferior />
        {caixa.configurado ? (
          <>
            <Simulador desejos={lerDesejos()} saldo={caixa.saldo} entrada={caixa.entrada} />
            <AtalhosDeTeclado />
          </>
        ) : null}
        <Toaster tema={tema} position="bottom-right" mobileOffset={{ bottom: 88 }} />
      </body>
    </html>
  );
}
