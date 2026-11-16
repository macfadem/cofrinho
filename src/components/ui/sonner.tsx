"use client"

import {
  CircleCheckIcon,
  InfoIcon,
  Loader2Icon,
  OctagonXIcon,
  TriangleAlertIcon,
} from "lucide-react"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import type { Tema } from "@/lib/db/schema"

const TEMA_SONNER: Record<Tema, ToasterProps["theme"]> = {
  claro: "light",
  escuro: "dark",
  auto: "system",
}

/** Toasts do app. Adaptado do shadcn/ui: o tema vem dos Ajustes (banco), não do next-themes. */
const Toaster = ({ tema = "auto", ...props }: ToasterProps & { tema?: Tema }) => {
  return (
    <Sonner
      theme={TEMA_SONNER[tema]}
      className="toaster group"
      icons={{
        success: <CircleCheckIcon className="size-4" />,
        info: <InfoIcon className="size-4" />,
        warning: <TriangleAlertIcon className="size-4" />,
        error: <OctagonXIcon className="size-4" />,
        loading: <Loader2Icon className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "1rem",
          fontFamily: "var(--font-sans)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
