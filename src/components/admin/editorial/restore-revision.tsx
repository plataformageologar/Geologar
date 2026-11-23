"use client";

import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { useId, useRef, useState, useTransition } from "react";

import { restoreEditorialRevision } from "@/lib/admin/editorial-actions";
import { cn } from "@/lib/utils/cn";

import { FormMessage } from "../form-controls";
import { FailureAction } from "../save-bar";

const actionClasses =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border px-4 text-label transition-colors " +
  "disabled:pointer-events-none disabled:opacity-50";

/**
 * Restaurar uma revisão: o conteúdo dela vira o NOVO rascunho (a versão
 * publicada não muda). Pede confirmação quando já existe rascunho.
 */
export function RestoreRevisionButton({
  revisionId,
  revisionNumber,
  version,
  hasDraft,
  editHref,
  loginNext,
}: {
  revisionId: string;
  revisionNumber: number;
  version: number;
  hasDraft: boolean;
  editHref: string;
  loginNext: string;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string; reason?: string } | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();

  function restore() {
    startTransition(async () => {
      try {
        const result = await restoreEditorialRevision({ revisionId, version });
        setMessage(
          result.status === "success"
            ? { tone: "success", text: result.message }
            : { tone: "error", text: result.message, reason: result.reason },
        );
      } catch {
        setMessage({
          tone: "error",
          text: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente; nada foi alterado.",
        });
      }
      dialogRef.current?.close();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {message && (
        <FormMessage tone={message.tone}>
          {message.text}
          {message.reason && <FailureAction reason={message.reason} loginNext={loginNext} />}
          {message.tone === "success" && (
            <>
              {" "}
              <Link href={editHref} className="font-semibold underline underline-offset-2">
                Revisar o rascunho
              </Link>
            </>
          )}
        </FormMessage>
      )}
      {message?.tone !== "success" && (
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          disabled={pending}
          className={cn(actionClasses, "self-start border-primary text-primary hover:bg-primary-soft")}
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Restaurar esta versão como rascunho
        </button>
      )}
      <dialog
        ref={dialogRef}
        aria-labelledby={`${id}-title`}
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border bg-surface p-6 text-foreground shadow-xl backdrop:bg-deep/60"
      >
        <div className="flex flex-col gap-4">
          <h2 id={`${id}-title`} className="text-h4 font-sans">
            Restaurar a revisão {revisionNumber}?
          </h2>
          <div className="flex flex-col gap-2 text-body-sm">
            <p>
              O conteúdo desta revisão vira o novo rascunho. <strong>O site público não muda</strong> até alguém
              publicar.
            </p>
            {hasDraft && (
              <p className="font-semibold text-earth">
                O rascunho atual será substituído. Ele continua guardado no histórico.
              </p>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 pt-2 sm:flex sm:justify-end">
            <button
              type="button"
              autoFocus
              onClick={() => dialogRef.current?.close()}
              disabled={pending}
              className={cn(actionClasses, "border-border px-5 text-foreground hover:border-primary/40")}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={restore}
              disabled={pending}
              className={cn(actionClasses, "border-primary bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary-hover")}
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              {pending ? "Restaurando…" : "Restaurar como rascunho"}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
