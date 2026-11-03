import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

type Tone = "neutral" | "green" | "blue" | "earth";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-muted text-foreground",
  green: "bg-secondary-soft text-secondary",
  blue: "bg-primary-soft text-primary",
  earth: "bg-earth-soft text-earth",
};

type BadgeProps = {
  children: ReactNode;
  tone?: Tone;
  /** Ponto colorido antes do texto (indicador discreto de estado). */
  withDot?: boolean;
  className?: string;
};

export function Badge({
  children,
  tone = "neutral",
  withDot = false,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold",
        tones[tone],
        className,
      )}
    >
      {withDot && (
        <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
      )}
      {children}
    </span>
  );
}
