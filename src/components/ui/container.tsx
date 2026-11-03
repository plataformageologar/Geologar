import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type ContainerProps = {
  children: ReactNode;
  className?: string;
};

/**
 * Limita a largura do conteúdo (80rem) e aplica os gutters responsivos.
 */
export function Container({ children, className }: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-[80rem] px-[clamp(1rem,4vw,2.5rem)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
