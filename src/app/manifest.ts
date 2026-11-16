import type { MetadataRoute } from "next";

/** Manifesto do app instalável (PWA): permite instalar o Cofrinho pelo Chrome ou Edge. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Cofrinho",
    short_name: "Cofrinho",
    description: "Lista de desejos com caixa e plano de compras.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#faf4f2",
    theme_color: "#faf4f2",
    icons: [
      { src: "/icones/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icones/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icones/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
