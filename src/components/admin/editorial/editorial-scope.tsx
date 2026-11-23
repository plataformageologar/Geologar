"use client";

import Link from "next/link";
import { CheckCircle2, CircleAlert, CloudUpload, Eye, History, PencilLine, Undo2 } from "lucide-react";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import { discardEditorialDraft, publishEditorialDocuments } from "@/lib/admin/editorial-actions";
import { GLOBAL_SCOPE } from "@/lib/editorial/content";
import type { EditorialDocInfo } from "@/lib/queries/editorial";
import { cn } from "@/lib/utils/cn";
import { formatAdminDateTime } from "@/lib/utils/format";

import { FormMessage } from "../form-controls";
import { FailureAction } from "../save-bar";

/**
 * Fluxo editorial no CMS (Etapa 9.6). `EditorialScope` envolve uma tela de
 * edição de UMA unidade (homepage, pilares, menus…): guarda a versão atual do
 * documento (token de conflito), sabe se algum formulário tem alterações não
 * salvas e mostra a barra de situação com Publicar, Descartar rascunho,
 * Histórico e Visualizar. Os formulários salvam rascunho; publicar é sempre
 * uma ação separada e explícita.
 */

type EditorialContextValue = {
  documentId: string;
  version: number;
  token: string;
  setVersion: (version: number) => void;
  reportDirty: (key: string, dirty: boolean) => void;
};

const EditorialContext = createContext<EditorialContextValue | null>(null);

export function useEditorial(): EditorialContextValue {
  const value = use(EditorialContext);
  if (!value) throw new Error("useEditorial fora de EditorialScope");
  return value;
}

/** Escopo editorial, ou `null` em telas somente de consulta. */
export function useOptionalEditorial(): EditorialContextValue | null {
  return use(EditorialContext);
}

/** Informa ao escopo editorial (se houver) se o formulário tem alterações não salvas. */
export function useReportDirty(key: string, dirty: boolean) {
  const reportDirty = use(EditorialContext)?.reportDirty;
  useEffect(() => {
    if (!reportDirty) return;
    reportDirty(key, dirty);
    return () => reportDirty(key, false);
  }, [key, dirty, reportDirty]);
}

type Message = { tone: "error" | "success" | "info"; text: string; reason?: string } | null;

const CONNECTION_ERROR =
  "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente; nada foi perdido.";

export function EditorialScope({
  doc,
  canPublish,
  previewHref,
  loginNext,
  children,
}: {
  doc: EditorialDocInfo;
  /** Papel do usuário permite publicar esta unidade (o servidor confere de novo). */
  canPublish: boolean;
  /** Onde ver o rascunho (editor visual), quando houver. */
  previewHref?: string | null;
  loginNext: string;
  children: ReactNode;
}) {
  // Versão: a maior entre a do servidor (após refresh) e a devolvida pelas ações.
  const [localVersion, setLocalVersion] = useState(doc.version);
  const version = Math.max(localVersion, doc.version);
  const [dirtyKeys, setDirtyKeys] = useState<ReadonlySet<string>>(new Set());
  // Remonta os formulários quando o conteúdo muda por fora deles (descarte).
  const [resetKey, setResetKey] = useState(0);

  const reportDirty = useCallback((key: string, dirty: boolean) => {
    setDirtyKeys((current) => {
      if (current.has(key) === dirty) return current;
      const next = new Set(current);
      if (dirty) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);

  const setVersion = useCallback((next: number) => setLocalVersion((current) => Math.max(current, next)), []);

  const context = useMemo<EditorialContextValue>(
    () => ({
      documentId: doc.id,
      version,
      token: `${doc.id}:${version}`,
      setVersion,
      reportDirty,
    }),
    [doc.id, version, setVersion, reportDirty],
  );

  return (
    <EditorialContext value={context}>
      <EditorialBar
        doc={doc}
        version={version}
        dirty={dirtyKeys.size > 0}
        canPublish={canPublish}
        previewHref={previewHref ?? null}
        loginNext={loginNext}
        onVersion={(next) => setLocalVersion((current) => Math.max(current, next))}
        onReset={() => setResetKey((key) => key + 1)}
      />
      <div key={resetKey} className="contents">
        {children}
      </div>
    </EditorialContext>
  );
}

function StatusLine({ doc, dirty }: { doc: EditorialDocInfo; dirty: boolean }) {
  if (dirty) {
    return (
      <span className="inline-flex items-center gap-2 font-semibold text-earth">
        <PencilLine aria-hidden="true" className="size-4" />
        Alterações não salvas — salve o rascunho antes de publicar
      </span>
    );
  }
  if (doc.hasDraft && !doc.hasPublished) {
    return (
      <span className="inline-flex items-center gap-2 font-semibold text-earth">
        <PencilLine aria-hidden="true" className="size-4" />
        Rascunho salvo — ainda não publicado
      </span>
    );
  }
  if (doc.hasDraft && doc.differs) {
    return (
      <span className="inline-flex items-center gap-2 font-semibold text-earth">
        <CircleAlert aria-hidden="true" className="size-4" />
        Rascunho salvo, diferente da versão publicada
      </span>
    );
  }
  if (doc.hasDraft) {
    return (
      <span className="inline-flex items-center gap-2 font-semibold text-foreground">
        <PencilLine aria-hidden="true" className="size-4" />
        Rascunho salvo, igual à versão publicada
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-2 font-semibold text-secondary">
      <CheckCircle2 aria-hidden="true" className="size-4" />
      Publicado — sem rascunho pendente
    </span>
  );
}

const actionClasses =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border px-4 text-label transition-colors " +
  "disabled:pointer-events-none disabled:opacity-50";
const neutralAction = cn(actionClasses, "border-border text-foreground hover:border-primary/40 hover:text-primary");

function EditorialBar({
  doc,
  version,
  dirty,
  canPublish,
  previewHref,
  loginNext,
  onVersion,
  onReset,
}: {
  doc: EditorialDocInfo;
  version: number;
  dirty: boolean;
  canPublish: boolean;
  previewHref: string | null;
  loginNext: string;
  onVersion: (version: number) => void;
  onReset: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState<"publish" | "discard" | null>(null);
  const [message, setMessage] = useState<Message>(null);
  const [note, setNote] = useState("");
  const publishRef = useRef<HTMLDialogElement>(null);
  const discardRef = useRef<HTMLDialogElement>(null);
  const id = useId();
  const scope = GLOBAL_SCOPE[doc.type];

  const canPublishNow = canPublish && doc.hasDraft && !dirty && !pending;
  const canDiscardNow = doc.hasDraft && doc.hasPublished && !pending;

  function publish() {
    setRunning("publish");
    startTransition(async () => {
      try {
        const result = await publishEditorialDocuments({ documents: [{ documentId: doc.id, version }], note });
        if (result.status === "success") {
          onVersion(result.versions[doc.id] ?? version);
          setNote("");
          setMessage({ tone: "success", text: result.message });
        } else {
          setMessage({ tone: "error", text: result.message, reason: result.reason });
        }
      } catch {
        setMessage({ tone: "error", text: CONNECTION_ERROR });
      }
      publishRef.current?.close();
      setRunning(null);
    });
  }

  function discard() {
    setRunning("discard");
    startTransition(async () => {
      try {
        const result = await discardEditorialDraft({ documentId: doc.id, version });
        if (result.status === "success") {
          onVersion(result.versions[doc.id] ?? version);
          onReset();
          setMessage({ tone: "success", text: result.message });
        } else {
          setMessage({ tone: "error", text: result.message, reason: result.reason });
        }
      } catch {
        setMessage({ tone: "error", text: CONNECTION_ERROR });
      }
      discardRef.current?.close();
      setRunning(null);
    });
  }

  return (
    <section
      aria-label={`Situação editorial: ${doc.label}`}
      className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 sm:p-5"
    >
      <div className="flex flex-col gap-1">
        <p className="text-body-sm" aria-live="polite">
          {pending ? (running === "publish" ? "Publicando…" : "Descartando rascunho…") : <StatusLine doc={doc} dirty={dirty} />}
        </p>
        <p className="text-caption text-muted-foreground">
          {doc.hasDraft && doc.draftUpdatedAt
            ? `Rascunho salvo em ${formatAdminDateTime(doc.draftUpdatedAt)}${doc.draftUpdatedBy ? ` por ${doc.draftUpdatedBy}` : ""}. `
            : ""}
          {doc.publishedAt
            ? `Versão publicada${doc.publishedRevision ? ` (revisão ${doc.publishedRevision})` : ""} em ${formatAdminDateTime(doc.publishedAt)}${doc.publishedBy ? ` por ${doc.publishedBy}` : ""}.`
            : doc.hasPublished
              ? "Versão publicada anterior ao fluxo editorial."
              : "Nunca publicado."}
        </p>
        {scope && <p className="text-caption font-semibold text-muted-foreground">Abrangência: {scope}</p>}
      </div>

      {message && (
        <FormMessage tone={message.tone}>
          {message.text}
          {message.reason && <FailureAction reason={message.reason} loginNext={loginNext} />}
        </FormMessage>
      )}

      <div className="flex flex-wrap gap-2">
        {canPublish && (
          <button
            type="button"
            onClick={() => publishRef.current?.showModal()}
            disabled={!canPublishNow}
            className={cn(actionClasses, "border-primary bg-primary font-semibold text-primary-foreground hover:bg-primary-hover")}
          >
            <CloudUpload aria-hidden="true" className="size-4" />
            Publicar alterações
          </button>
        )}
        {previewHref && (
          <Link href={previewHref} className={neutralAction}>
            <Eye aria-hidden="true" className="size-4" />
            Visualizar rascunho
          </Link>
        )}
        <Link href={`/admin/historico?documento=${doc.id}`} className={neutralAction}>
          <History aria-hidden="true" className="size-4" />
          Histórico de versões
        </Link>
        {doc.hasPublished && (
          <button
            type="button"
            onClick={() => discardRef.current?.showModal()}
            disabled={!canDiscardNow}
            className={cn(actionClasses, "border-danger/40 text-danger hover:bg-danger-soft")}
          >
            <Undo2 aria-hidden="true" className="size-4" />
            Descartar rascunho
          </button>
        )}
      </div>
      {!canPublish && doc.hasDraft && (
        <p className="text-caption text-muted-foreground">
          Sua conta salva rascunhos desta área, mas a publicação é feita por um administrador.
        </p>
      )}

      <dialog
        ref={publishRef}
        aria-labelledby={`${id}-publish-title`}
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border bg-surface p-6 text-foreground shadow-xl backdrop:bg-deep/60"
      >
        <div className="flex flex-col gap-4">
          <h2 id={`${id}-publish-title`} className="text-h4 font-sans">
            Publicar alterações?
          </h2>
          <div className="flex flex-col gap-2 text-body-sm">
            <p>
              O rascunho de <strong className="font-semibold">{doc.label}</strong> passa a ser a versão do site
              público. A versão atual fica guardada no histórico e pode ser restaurada.
            </p>
            {scope && <p className="font-semibold text-earth">Atenção: {scope}</p>}
          </div>
          <label className="flex flex-col gap-1.5 text-body-sm">
            <span className="font-semibold">Observação (opcional)</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={300}
              rows={2}
              className="rounded-xl border border-border bg-background px-3 py-2 text-body-sm"
            />
            <span className="text-caption text-muted-foreground">Aparece no histórico. Até 300 caracteres.</span>
          </label>
          <div className="grid grid-cols-1 gap-3 pt-2 sm:flex sm:justify-end">
            <button
              type="button"
              autoFocus
              onClick={() => publishRef.current?.close()}
              disabled={pending}
              className={cn(neutralAction, "px-5")}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={publish}
              disabled={pending}
              className={cn(actionClasses, "border-primary bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary-hover")}
            >
              <CloudUpload aria-hidden="true" className="size-4" />
              {running === "publish" ? "Publicando…" : "Publicar agora"}
            </button>
          </div>
        </div>
      </dialog>

      <dialog
        ref={discardRef}
        aria-labelledby={`${id}-discard-title`}
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border bg-surface p-6 text-foreground shadow-xl backdrop:bg-deep/60"
      >
        <div className="flex flex-col gap-4">
          <h2 id={`${id}-discard-title`} className="text-h4 font-sans">
            Descartar o rascunho?
          </h2>
          <div className="flex flex-col gap-2 text-body-sm">
            <p>
              O conteúdo de <strong className="font-semibold">{doc.label}</strong> volta a ser exatamente a versão
              publicada. O site público não muda.
            </p>
            <p className="text-muted-foreground">
              Os rascunhos salvos continuam no histórico de versões e podem ser restaurados depois.
            </p>
            {dirty && (
              <p className="font-semibold text-danger">As alterações ainda não salvas neste formulário também serão perdidas.</p>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 pt-2 sm:flex sm:justify-end">
            <button
              type="button"
              autoFocus
              onClick={() => discardRef.current?.close()}
              disabled={pending}
              className={cn(neutralAction, "px-5")}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={discard}
              disabled={pending}
              className={cn(actionClasses, "border-danger bg-danger px-5 font-semibold text-white hover:bg-danger/90")}
            >
              <Undo2 aria-hidden="true" className="size-4" />
              {running === "discard" ? "Descartando…" : "Descartar rascunho"}
            </button>
          </div>
        </div>
      </dialog>
    </section>
  );
}

