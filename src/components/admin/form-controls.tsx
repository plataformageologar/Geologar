"use client";

import { AlertCircle, CheckCircle2, ChevronDown, Eye, EyeOff, Info } from "lucide-react";
import { useState, type ComponentProps, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

const inputClasses =
  "min-h-12 w-full rounded-xl border border-border bg-surface px-4 text-body text-foreground " +
  "placeholder:text-muted-foreground/70 aria-[invalid=true]:border-danger aria-[invalid=true]:ring-1 aria-[invalid=true]:ring-danger " +
  "disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted-foreground";

type FieldProps = {
  id: string;
  label: string;
  /** Texto de apoio abaixo do campo (ex.: requisitos da senha). */
  hint?: ReactNode;
  /** Mensagem de validação (associada ao campo por `id-error`). */
  error?: string;
  /** Exibe "Obrigatório" ao lado do rótulo. */
  required?: boolean;
  /** Contador de caracteres: valor atual e limite. */
  count?: { current: number; max: number };
  children: ReactNode;
};

/** Ids de texto de apoio e erro para o `aria-describedby` do campo. */
export function describedBy(id: string, { hint, error }: { hint?: unknown; error?: unknown }) {
  return [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
}

/** Rótulo visível associado ao campo, com texto de apoio e erro opcionais. */
export function Field({ id, label, hint, error, required, count, children }: FieldProps) {
  const over = count ? count.current > count.max : false;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-label">
          {label}
          {required && (
            <span className="ml-2 text-caption font-normal text-muted-foreground">Obrigatório</span>
          )}
        </label>
        {count && (
          <span
            aria-hidden="true"
            className={cn("shrink-0 text-caption tabular-nums", over ? "font-semibold text-danger" : "text-muted-foreground")}
          >
            {count.current}/{count.max}
          </span>
        )}
      </div>
      {children}
      {error && (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-caption font-semibold text-danger">
          <AlertCircle aria-hidden="true" className="mt-px size-3.5 shrink-0" />
          {error}
        </p>
      )}
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

/** Lista de opções nativa (acessível por teclado e leitores de tela). */
export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <div className="relative">
      <select className={cn(inputClasses, "appearance-none pr-11", className)} {...props}>
        {children}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-4 my-auto size-4 text-muted-foreground"
      />
    </div>
  );
}

/**
 * Caixa de seleção com rótulo e descrição clicáveis (área de toque ≥ 44px).
 * A descrição é associada por `aria-describedby`.
 */
export function Checkbox({
  id,
  label,
  description,
  className,
  ...props
}: Omit<ComponentProps<"input">, "type" | "id"> & {
  id: string;
  label: ReactNode;
  description?: ReactNode;
}) {
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <input
        id={id}
        type="checkbox"
        aria-describedby={description ? `${id}-description` : undefined}
        className="mt-0.5 size-5 shrink-0 cursor-pointer accent-primary disabled:cursor-not-allowed"
        {...props}
      />
      <div className="flex min-w-0 flex-col gap-0.5">
        <label htmlFor={id} className="cursor-pointer text-label">
          {label}
        </label>
        {description && (
          <p id={`${id}-description`} className="text-caption text-muted-foreground">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

/** Texto de múltiplas linhas (redimensionável na vertical). */
export function TextArea({ className, ...props }: ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(inputClasses, "min-h-32 resize-y py-3 leading-relaxed", className)}
      {...props}
    />
  );
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
  warning: { icon: AlertCircle, classes: "border-earth/30 bg-earth-soft text-earth" },
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

/** Bloco de um formulário do CMS: título, descrição e campos. */
export function FormSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      aria-labelledby={`${id}-title`}
      className="flex flex-col gap-6 rounded-2xl border border-border bg-surface p-5 sm:p-7"
    >
      <div className="flex flex-col gap-1">
        <h2 id={`${id}-title`} className="text-h4 font-sans">
          {title}
        </h2>
        {description && <p className="text-body-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}
