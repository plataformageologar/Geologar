"use client";

import { AlertCircle, CheckCircle2, Eye, EyeOff, Info } from "lucide-react";
import { useState, type ComponentProps, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

const inputClasses =
  "min-h-12 w-full rounded-xl border border-border bg-surface px-4 text-body text-foreground " +
  "placeholder:text-muted-foreground/70 aria-[invalid=true]:border-danger";

type FieldProps = {
  id: string;
  label: string;
  /** Texto de apoio abaixo do campo (ex.: requisitos da senha). */
  hint?: string;
  children: ReactNode;
};

/** Rótulo visível associado ao campo, com texto de apoio opcional. */
export function Field({ id, label, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-label">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-caption text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

export function TextInput({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(inputClasses, className)} {...props} />;
}

/** Campo de senha com botão para mostrar/ocultar o texto digitado. */
export function PasswordInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <input
        type={visible ? "text" : "password"}
        className={cn(inputClasses, "pr-14", className)}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((value) => !value)}
        aria-pressed={visible}
        aria-controls={props.id}
        className="absolute inset-y-0 right-1 my-auto inline-flex size-11 items-center justify-center rounded-lg text-muted-foreground hover:text-primary"
      >
        {visible ? (
          <EyeOff aria-hidden="true" className="size-5" />
        ) : (
          <Eye aria-hidden="true" className="size-5" />
        )}
        <span className="sr-only">{visible ? "Ocultar senha" : "Mostrar senha"}</span>
      </button>
    </div>
  );
}

const tones = {
  error: { icon: AlertCircle, classes: "border-danger/30 bg-danger-soft text-danger" },
  success: { icon: CheckCircle2, classes: "border-secondary/30 bg-secondary-soft text-secondary" },
  info: { icon: Info, classes: "border-primary/20 bg-primary-soft text-primary" },
} as const;

/**
 * Mensagem de retorno do formulário. Erros usam `role="alert"` (anunciados
 * imediatamente); confirmações, `role="status"`.
 */
export function FormMessage({
  tone,
  id,
  children,
}: {
  tone: keyof typeof tones;
  id?: string;
  children: ReactNode;
}) {
  const { icon: Icon, classes } = tones[tone];
  return (
    <div
      id={id}
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-xl border px-4 py-3 text-body-sm", classes)}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <p>{children}</p>
    </div>
  );
}
