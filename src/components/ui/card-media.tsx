import Image from "next/image";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils/cn";

type Tint = "green" | "earth" | "blue";

const tints: Record<Tint, string> = {
  green: "bg-secondary-soft text-secondary",
  earth: "bg-earth-soft text-earth",
  blue: "bg-primary-soft text-primary",
};

type CardMediaProps = {
  imagePath: string | null;
  imageAlt: string | null;
  /** Usado enquanto não houver fotografia. */
  fallbackIcon: LucideIcon;
  tint?: Tint;
  sizes: string;
  className?: string;
};

/**
 * Área de imagem dos cards. Sem fotografia, exibe um fundo neutro com curvas
 * de nível e ícone — decorativo, oculto para leitores de tela.
 */
export function CardMedia({
  imagePath,
  imageAlt,
  fallbackIcon: Icon,
  tint = "green",
  sizes,
  className,
}: CardMediaProps) {
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {imagePath ? (
        <Image
          src={imagePath}
          alt={imageAlt ?? ""}
          fill
          sizes={sizes}
          className="object-cover"
        />
      ) : (
        <div aria-hidden="true" className={cn("absolute inset-0", tints[tint])}>
          <div className="topo-pattern absolute inset-0 opacity-25" />
          <span className="absolute bottom-4 left-4 inline-flex size-12 items-center justify-center rounded-xl bg-surface/90">
            <Icon className="size-6" strokeWidth={1.75} />
          </span>
        </div>
      )}
    </div>
  );
}
