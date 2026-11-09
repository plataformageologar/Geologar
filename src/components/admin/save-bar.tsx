"use client";

import { useEffect, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

import { FormMessage } from "./form-controls";

/**
 * Monta o envio a partir do estado do formulário (fonte da verdade), e não
 * do DOM. Com `<form action>`, o React 19 reinicia o formulário após o envio
 * e caixas de seleção controladas voltam ao estado da primeira renderização,
 * divergindo do estado; enviando por aqui, isso não acontece.
 */
export function buildFormData(entries: Record<string, string | boolean | string[]>) {
  const data = new FormData();
  for (const [name, value] of Object.entries(entries)) {
    if (Array.isArray(value)) value.forEach((item) => data.append(name, item));
    else if (typeof value === "boolean") {
      if (value) data.set(name, "on");
    } else data.set(name, value);
  }
  return data;
}

/** Aviso do navegador ao recarregar ou fechar a aba com alterações pendentes. */
export function useUnsavedChangesWarning(dirty: boolean) {
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
}

type SaveBarProps = {
  /** Retorno do último envio (validação, erro do servidor ou sucesso). */
  message: { tone: "error" | "success"; text: string } | null;
  /** Ação complementar exibida dentro da mensagem (ex.: link para entrar). */
  messageAction?: ReactNode;
  pending: boolean;
  dirty: boolean;
  onCancel: () => void;
  /** Texto do botão principal (ex.: "Criar linha de pesquisa"). */
  submitLabel?: string;
  /** Texto do estado sem alterações. */
  idleLabel?: string;
};

/**
 * Barra fixa no fim dos formulários do CMS: estado (salvando, alterações não
 * salvas), retorno do envio e os botões Cancelar/Salvar.
 */
export function SaveBar({
  message,
  messageAction,
  pending,
  dirty,
  onCancel,
  submitLabel = "Salvar alterações",
  idleLabel = "Nenhuma alteração pendente",
}: SaveBarProps) {
  return (
    <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-3 border-t border-border bg-background/95 px-4 py-4 backdrop-blur-sm sm:mx-0 sm:rounded-2xl sm:border sm:px-5">
      {message && (
        <FormMessage tone={message.tone}>
          {message.text}
          {messageAction}
        </FormMessage>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-body-sm text-muted-foreground" aria-live="polite">
          {pending ? (
            "Salvando alterações…"
          ) : dirty ? (
            <span className="inline-flex items-center gap-2 font-semibold text-earth">
              <span aria-hidden="true" className="size-2 rounded-full bg-earth" />
              Alterações não salvas
            </span>
          ) : (
            idleLabel
          )}
        </p>
        <div className="grid grid-cols-2 gap-3 sm:flex">
          {/* Em telas estreitas os dois botões dividem a linha (barra fixa mais baixa). */}
          <Button type="button" variant="secondary" onClick={onCancel} disabled={!dirty || pending}>
            Cancelar alterações
          </Button>
          <Button type="submit" disabled={!dirty || pending}>
            {pending ? "Salvando…" : submitLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Links/ações exibidos junto da mensagem de erro, conforme o motivo. */
export function FailureAction({ reason, loginNext }: { reason: string; loginNext: string }) {
  if (reason === "session") {
    return (
      <>
        {" "}
        <a
          href={`/admin/login?next=${encodeURIComponent(loginNext)}`}
          target="_blank"
          rel="noopener"
          className="font-semibold underline underline-offset-2"
        >
          Entrar em nova aba
        </a>
      </>
    );
  }
  if (reason === "conflict") {
    return (
      <>
        {" "}
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="font-semibold underline underline-offset-2"
        >
          Recarregar página
        </button>
      </>
    );
  }
  return null;
}
