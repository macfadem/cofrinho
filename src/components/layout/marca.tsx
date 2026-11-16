import Link from "next/link";
import { PiggyBank } from "lucide-react";

/** Logo do Cofrinho (leva para o início). */
export function Marca() {
  return (
    <Link
      href="/"
      className="group flex items-center gap-2.5 rounded-xl outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      <span className="grid size-9 place-items-center rounded-[0.8rem] bg-rosa text-white shadow-[0_6px_14px_-8px_var(--rosa)] transition-transform duration-300 group-hover:-rotate-8 dark:text-background">
        <PiggyBank className="size-5" strokeWidth={2.2} aria-hidden />
      </span>
      <span className="font-display text-xl font-bold tracking-tight">
        Cofrinho
      </span>
    </Link>
  );
}
