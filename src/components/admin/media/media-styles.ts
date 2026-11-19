import { cn } from "@/lib/utils/cn";

/** Botões compactos da biblioteca (mesmo padrão das ações das listagens). */
export const mediaButton =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border px-4 text-label transition-colors " +
  "disabled:pointer-events-none disabled:opacity-50";

export const mediaNeutralButton = cn(
  mediaButton,
  "border-border bg-surface text-foreground hover:border-primary/40 hover:text-primary",
);

export const mediaPrimaryButton = cn(
  mediaButton,
  "border-primary bg-primary font-semibold text-primary-foreground hover:bg-primary-hover",
);

export const mediaDangerButton = cn(mediaButton, "border-danger/40 text-danger hover:bg-danger-soft");

/** Fundo neutro das miniaturas: logotipos transparentes continuam legíveis. */
export const mediaThumbBackground = "bg-surface-muted";
