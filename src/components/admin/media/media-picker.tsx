"use client";

import { Check, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import type { MediaItem } from "@/lib/queries/admin-media";

import { MediaBrowser } from "./media-browser";
import { mediaNeutralButton, mediaPrimaryButton } from "./media-styles";

/**
 * Janela de seleção de imagem da biblioteca (com envio de novas imagens).
 * Nada é salvo aqui: a escolha só vale quando a pessoa confirma, e o
 * conteúdo só muda quando o formulário de origem é salvo.
 */
export function MediaPicker({
  title,
  currentName,
  canUpload,
  onConfirm,
  onClose,
}: {
  title: string;
  /** Imagem atual do campo (pré-selecionada). */
  currentName: string | null;
  canUpload: boolean;
  onConfirm: (item: MediaItem) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [chosen, setChosen] = useState<MediaItem | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const chosenName = chosen?.name ?? currentName;
  const changed = chosen !== null && chosen.name !== currentName;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      className="m-auto flex h-[calc(100dvh-2rem)] max-h-[56rem] w-[calc(100%-2rem)] max-w-5xl flex-col overflow-hidden rounded-2xl border border-border bg-background p-0 text-foreground shadow-xl backdrop:bg-deep/60 [&:not([open])]:hidden"
    >
      <div className="flex items-start justify-between gap-3 border-b border-border bg-surface px-5 py-4 sm:px-6">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 id={titleId} className="text-h4 font-sans">
            {title}
          </h2>
          <p className="text-body-sm text-muted-foreground">
            Escolha uma imagem da biblioteca ou envie uma nova. A mudança só é gravada quando você salvar o formulário.
          </p>
        </div>
        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-muted hover:text-foreground"
        >
          <X aria-hidden="true" className="size-5" />
          <span className="sr-only">Fechar sem alterar</span>
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
        <MediaBrowser
          initial={null}
          canUpload={canUpload}
          canDelete={false}
          mode="select"
          chosenName={chosenName}
          onChoose={setChosen}
        />
      </div>

      <div className="flex flex-col gap-3 border-t border-border bg-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="min-w-0 truncate text-body-sm text-muted-foreground" aria-live="polite">
          {chosen ? (
            <>
              Selecionada: <strong className="font-semibold text-foreground">{chosen.originalName ?? chosen.name}</strong>
            </>
          ) : currentName ? (
            "A imagem atual está marcada como selecionada."
          ) : (
            "Nenhuma imagem selecionada."
          )}
        </p>
        <div className="grid grid-cols-1 gap-3 sm:flex sm:shrink-0">
          <button type="button" onClick={() => dialogRef.current?.close()} className={mediaNeutralButton}>
            Cancelar
          </button>
          <button
            type="button"
            disabled={!changed}
            onClick={() => {
              if (!chosen) return;
              onConfirm(chosen);
              dialogRef.current?.close();
            }}
            className={mediaPrimaryButton}
          >
            <Check aria-hidden="true" className="size-4" />
            Usar imagem selecionada
          </button>
        </div>
      </div>
    </dialog>
  );
}
