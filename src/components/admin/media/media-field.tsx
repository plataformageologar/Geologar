"use client";

import Image from "next/image";
import { AlertCircle, ImageIcon, ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import { useState, type ReactNode } from "react";

import { isLocalImagePath, isMediaObjectName, mediaPublicUrl } from "@/lib/media/config";
import { cn } from "@/lib/utils/cn";

import { MediaPicker } from "./media-picker";
import { mediaNeutralButton } from "./media-styles";

/** Endereço da pré-visualização: caminho local do site ou objeto da biblioteca. */
function previewSrc(reference: string): string | null {
  if (!reference) return null;
  if (isLocalImagePath(reference)) return reference;
  if (isMediaObjectName(reference)) return mediaPublicUrl(reference);
  return null;
}

/**
 * Campo de imagem dos formulários do CMS. Guarda apenas a referência ao
 * arquivo da biblioteca; selecionar, substituir ou remover só altera o
 * formulário (o banco muda ao salvar). Remover nunca apaga o arquivo.
 */
export function MediaField({
  id,
  name,
  label,
  value,
  onChange,
  error,
  hint,
  emptyText,
  fit = "cover",
  aspect = "aspect-[16/9] max-w-2xl",
  canUpload,
  disabled,
  children,
}: {
  /** Também é o id do botão principal (foco no primeiro erro). */
  id: string;
  /** Nome do campo oculto, para formulários enviados com FormData nativo. */
  name?: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: ReactNode;
  emptyText: string;
  /** "contain" para logotipos: sem corte, sem distorção. */
  fit?: "cover" | "contain";
  aspect?: string;
  canUpload: boolean;
  disabled?: boolean;
  /** Campos dependentes da imagem (ex.: texto alternativo). */
  children?: ReactNode;
}) {
  const [picking, setPicking] = useState(false);
  const src = previewSrc(value);
  const labelId = `${id}-label`;
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null, `${id}-notice`]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col gap-3" role="group" aria-labelledby={labelId}>
      {name && <input type="hidden" name={name} value={value} />}
      <p id={labelId} className="text-label">
        {label}
      </p>

      {value ? (
        <div
          className={cn(
            "relative w-full overflow-hidden rounded-xl border",
            // Logotipos sobre fundo branco, como aparecem no site.
            fit === "contain" ? "bg-white" : "bg-surface-muted",
            aspect,
            error ? "border-danger" : "border-border",
          )}
        >
          {src ? (
            <Image
              src={src}
              alt={`Pré-visualização: ${label.toLowerCase()}`}
              fill
              sizes="(min-width: 768px) 42rem, 100vw"
              className={fit === "contain" ? "object-contain p-4" : "object-cover"}
            />
          ) : (
            <p className="flex h-full items-center justify-center p-4 text-center text-body-sm text-muted-foreground">
              Referência de imagem inválida. Selecione outra imagem.
            </p>
          )}
        </div>
      ) : (
        <div className="flex max-w-2xl items-start gap-3 rounded-xl border border-dashed border-border bg-surface-muted/60 p-4 text-body-sm text-muted-foreground">
          <ImageIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
          <p>{emptyText}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <button
          id={id}
          type="button"
          onClick={() => setPicking(true)}
          disabled={disabled}
          aria-describedby={describedBy}
          className={mediaNeutralButton}
        >
          {value ? (
            <RefreshCw aria-hidden="true" className="size-4" />
          ) : (
            <ImagePlus aria-hidden="true" className="size-4" />
          )}
          {value ? "Substituir imagem" : "Selecionar imagem"}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            disabled={disabled}
            className={cn(mediaNeutralButton, "hover:border-danger/40 hover:text-danger")}
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Remover imagem
          </button>
        )}
      </div>

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
      <p id={`${id}-notice`} className="text-caption text-muted-foreground">
        Remover apenas desfaz a associação; o arquivo continua na biblioteca. As imagens da biblioteca são públicas.
      </p>

      {value && children}

      {picking && (
        <MediaPicker
          title={`Selecionar ${label.toLowerCase()}`}
          currentName={isMediaObjectName(value) ? value : null}
          canUpload={canUpload}
          onConfirm={(item) => onChange(item.name)}
          onClose={() => setPicking(false)}
        />
      )}
    </div>
  );
}
