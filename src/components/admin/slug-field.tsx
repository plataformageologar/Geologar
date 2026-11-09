"use client";

import { RefreshCw } from "lucide-react";

import { SLUG_MAX_LENGTH, slugify } from "@/lib/admin/validation";

import { describedBy, Field, FormMessage, TextInput } from "./form-controls";

type SlugFieldProps = {
  value: string;
  title: string;
  error?: string;
  /** Prefixo do endereço público (ex.: "/pesquisa/"). */
  publicPrefix: string;
  /** Slug publicado atualmente; mudar o slug de um conteúdo publicado gera aviso. */
  publishedSlug: string | null;
  onChange: (value: string, manual: boolean) => void;
};

/**
 * Slug com sugestão automática a partir do título (controlada pelo
 * formulário) e opção de gerar novamente. Mostra o endereço público
 * resultante e avisa quando a mudança quebra links de um conteúdo publicado.
 */
export function SlugField({ value, title, error, publicPrefix, publishedSlug, onChange }: SlugFieldProps) {
  const hint = (
    <>
      Endereço público: <span className="break-all font-semibold">{publicPrefix}{value || "…"}</span>. Use
      letras minúsculas sem acento, números e hífens.
    </>
  );
  const changedPublished = publishedSlug !== null && value.trim() !== publishedSlug;
  const suggestion = slugify(title);

  return (
    <div className="flex flex-col gap-3">
      <Field id="slug" label="Slug (endereço)" required hint={hint} error={error}>
        <div className="flex flex-col gap-2 sm:flex-row">
          <TextInput
            id="slug"
            name="slug"
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value, true)}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={SLUG_MAX_LENGTH}
            aria-invalid={error ? true : undefined}
            aria-required
            aria-describedby={describedBy("slug", { hint, error })}
            className="sm:flex-1"
          />
          <button
            type="button"
            onClick={() => onChange(suggestion, false)}
            disabled={!suggestion || suggestion === value}
            className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl border border-border px-4 text-label text-foreground transition-colors hover:border-primary/40 hover:text-primary disabled:pointer-events-none disabled:opacity-50"
          >
            <RefreshCw aria-hidden="true" className="size-4" />
            Gerar do título
          </button>
        </div>
      </Field>
      {changedPublished && (
        <FormMessage tone="warning">
          Este conteúdo está publicado em{" "}
          <span className="break-all font-semibold">{publicPrefix}{publishedSlug}</span>. Ao salvar um novo
          slug, o endereço muda e links antigos (compartilhados ou de buscadores) deixarão de funcionar.
        </FormMessage>
      )}
    </div>
  );
}
