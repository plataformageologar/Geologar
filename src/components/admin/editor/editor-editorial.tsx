"use client";

import { CloudUpload, Eye, RotateCcw, Undo2, X } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";

import {
  discardEditorialDraft,
  getEditorialRevisionContent,
  listEditorialRevisions,
  publishEditorialDocuments,
  restoreEditorialRevision,
} from "@/lib/admin/editorial-actions";
import { hasPublishableDraft, OPERATION_LABELS, type AnyContent } from "@/lib/editorial/content";
import type { RevisionListItem } from "@/lib/queries/editorial";
import type { EditorUnit } from "@/lib/site/editor-document";
import { cn } from "@/lib/utils/cn";
import { formatAdminDateTime } from "@/lib/utils/format";

import { FailureAction } from "../save-bar";

/**
 * Fluxo editorial no editor visual (Etapa 9.6): publicar (uma transação para
 * todas as unidades marcadas), descartar rascunhos salvos e histórico de
 * versões com visualização na tela e restauração como rascunho.
 */

const CONNECTION_ERROR =
  "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente; nada foi alterado.";

const buttonClasses =
  "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border px-3 text-label transition-colors disabled:opacity-40";
const neutralButton = cn(buttonClasses, "border-border text-foreground hover:bg-surface-muted");
const primaryButton = cn(buttonClasses, "border-primary bg-primary font-semibold text-primary-foreground hover:bg-primary-hover");

type Failure = { text: string; reason?: string } | null;

function Modal({
  open,
  onClose,
  title,
  busy,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  busy: boolean;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  return (
    <dialog
      ref={ref}
      role="dialog"
      aria-labelledby={`${id}-title`}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      className={cn(
        "m-auto max-h-[90dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl border border-border bg-surface p-5 text-foreground shadow-xl backdrop:bg-deep/60 sm:p-6",
        wide ? "max-w-2xl" : "max-w-lg",
      )}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <h2 id={`${id}-title`} className="text-h4 font-sans">
            {title}
          </h2>
          <button type="button" onClick={onClose} disabled={busy} aria-label="Fechar" className={cn(neutralButton, "border-transparent px-2")}>
            <X aria-hidden="true" className="size-4" />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

function ErrorLine({ failure, loginNext }: { failure: Failure; loginNext: string }) {
  if (!failure) return null;
  return (
    <p role="alert" className="rounded-xl border border-danger/40 p-3 text-body-sm text-danger">
      {failure.text}
      {failure.reason && <FailureAction reason={failure.reason} loginNext={loginNext} />}
    </p>
  );
}

function unitState(unit: EditorUnit) {
  if (!unit.hasPublished) return "Nunca publicado";
  if (unit.hasDraft && unit.differs) return "Rascunho diferente da versão publicada";
  if (unit.hasDraft) return "Rascunho igual à versão publicada";
  return "Publicado, sem rascunho";
}

// Publicar -------------------------------------------------------------------------------

export function PublishDialog({
  open,
  onClose,
  units,
  versionOf,
  dirty,
  loginNext,
  onPublished,
}: {
  open: boolean;
  onClose: () => void;
  units: EditorUnit[];
  versionOf: (id: string) => number;
  dirty: boolean;
  loginNext: string;
  onPublished: (versions: Record<string, number>, message: string) => void;
}) {
  const candidates = units.filter(hasPublishableDraft);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [note, setNote] = useState("");
  const [failure, setFailure] = useState<Failure>(null);
  const [pending, startTransition] = useTransition();

  // Ao abrir: marca tudo o que o usuário pode publicar.
  const [wasOpen, setWasOpen] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setSelected(new Set(candidates.filter((unit) => unit.canPublish).map((unit) => unit.id)));
      setFailure(null);
    }
  }

  const chosen = candidates.filter((unit) => selected.has(unit.id));
  const warnings = chosen.flatMap((unit) => (unit.scope ? [`${unit.label}: ${unit.scope}`] : []));

  function publish() {
    startTransition(async () => {
      try {
        const result = await publishEditorialDocuments({
          documents: chosen.map((unit) => ({ documentId: unit.id, version: versionOf(unit.id) })),
          note,
        });
        if (result.status === "success") {
          setNote("");
          onPublished(result.versions, result.message);
        } else {
          setFailure({ text: result.message, reason: result.reason });
        }
      } catch {
        setFailure({ text: CONNECTION_ERROR });
      }
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Publicar alterações" busy={pending}>
      {dirty ? (
        <p className="rounded-xl border border-earth/40 p-3 text-body-sm font-semibold text-earth">
          Há alterações não salvas. Salve o rascunho (ou descarte as alterações) antes de publicar.
        </p>
      ) : candidates.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">Não há rascunho salvo para publicar nesta página.</p>
      ) : (
        <>
          <p className="text-body-sm">
            Escolha o que publicar. Tudo o que estiver marcado é publicado junto, numa única operação: ou tudo vai
            para o site, ou nada muda.
          </p>
          <fieldset className="flex flex-col gap-2" disabled={pending}>
            <legend className="sr-only">Conteúdos com rascunho</legend>
            {candidates.map((unit) => (
              <label
                key={unit.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border border-border p-3",
                  !unit.canPublish && "opacity-60",
                )}
              >
                <input
                  type="checkbox"
                  className="mt-1 size-4"
                  checked={selected.has(unit.id)}
                  disabled={!unit.canPublish}
                  onChange={(event) =>
                    setSelected((current) => {
                      const next = new Set(current);
                      if (event.target.checked) next.add(unit.id);
                      else next.delete(unit.id);
                      return next;
                    })
                  }
                />
                <span className="flex min-w-0 flex-col gap-0.5">
                  <span className="text-label">{unit.label}</span>
                  <span className="text-caption text-muted-foreground">{unitState(unit)}</span>
                  {!unit.canPublish && <span className="text-caption">Somente administradores publicam este conteúdo.</span>}
                </span>
              </label>
            ))}
          </fieldset>
          {warnings.length > 0 && (
            <div className="rounded-xl border border-earth/40 p-3 text-body-sm">
              <p className="font-semibold text-earth">Atenção: publicação com efeito em várias páginas</p>
              <ul className="mt-1 list-disc pl-5">
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
          <label className="flex flex-col gap-1.5 text-body-sm">
            <span className="font-semibold">Observação (opcional)</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={300}
              rows={2}
              disabled={pending}
              className="rounded-xl border border-border bg-background px-3 py-2 text-body-sm"
            />
          </label>
          <ErrorLine failure={failure} loginNext={loginNext} />
          <div className="grid grid-cols-1 gap-2 sm:flex sm:justify-end">
            <button type="button" onClick={onClose} disabled={pending} className={neutralButton}>
              Cancelar
            </button>
            <button type="button" onClick={publish} disabled={pending || chosen.length === 0} className={primaryButton}>
              <CloudUpload aria-hidden="true" className="size-4" />
              {pending ? "Publicando…" : `Publicar ${chosen.length === 1 ? "1 conteúdo" : `${chosen.length} conteúdos`}`}
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

// Descartar rascunho salvo ----------------------------------------------------------------

export function DiscardDraftDialog({
  open,
  onClose,
  units,
  versionOf,
  dirty,
  loginNext,
}: {
  open: boolean;
  onClose: () => void;
  units: EditorUnit[];
  versionOf: (id: string) => number;
  dirty: boolean;
  loginNext: string;
}) {
  const candidates = units.filter((unit) => unit.hasDraft && unit.hasPublished);
  const [failure, setFailure] = useState<Failure>(null);
  const [running, setRunning] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function discard(unit: EditorUnit) {
    setRunning(unit.id);
    startTransition(async () => {
      try {
        const result = await discardEditorialDraft({ documentId: unit.id, version: versionOf(unit.id) });
        if (result.status === "success") {
          // O conteúdo da tela muda por fora do histórico de edição: recarrega.
          window.location.reload();
          return;
        }
        setFailure({ text: result.message, reason: result.reason });
      } catch {
        setFailure({ text: CONNECTION_ERROR });
      }
      setRunning(null);
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Descartar rascunho salvo" busy={pending}>
      <p className="text-body-sm">
        O conteúdo volta a ser exatamente a versão publicada. O site público não muda. Os rascunhos salvos continuam
        no histórico de versões.
      </p>
      {dirty ? (
        <p className="rounded-xl border border-earth/40 p-3 text-body-sm font-semibold text-earth">
          Há alterações não salvas na tela. Salve-as ou use “Descartar alterações não salvas” antes.
        </p>
      ) : candidates.length === 0 ? (
        <p className="text-body-sm text-muted-foreground">Não há rascunho salvo que possa ser descartado nesta página.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {candidates.map((unit) => (
            <li key={unit.id} className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex min-w-0 flex-col">
                <span className="text-label">{unit.label}</span>
                <span className="text-caption text-muted-foreground">{unitState(unit)}</span>
              </span>
              <button
                type="button"
                onClick={() => discard(unit)}
                disabled={pending}
                className={cn(buttonClasses, "shrink-0 border-danger text-danger hover:bg-danger-soft")}
              >
                <Undo2 aria-hidden="true" className="size-4" />
                {running === unit.id ? "Descartando…" : "Descartar rascunho"}
              </button>
            </li>
          ))}
        </ul>
      )}
      <ErrorLine failure={failure} loginNext={loginNext} />
    </Modal>
  );
}

// Histórico ------------------------------------------------------------------------------

export type RevisionPreviewState = { unitId: string; revisionId: string; number: number; label: string; content: AnyContent };

export function HistoryDialog({
  open,
  onClose,
  units,
  versionOf,
  dirty,
  loginNext,
  onPreview,
}: {
  open: boolean;
  onClose: () => void;
  units: EditorUnit[];
  versionOf: (id: string) => number;
  dirty: boolean;
  loginNext: string;
  onPreview: (preview: RevisionPreviewState) => void;
}) {
  const [unitId, setUnitId] = useState(units[0]?.id ?? "");
  const [items, setItems] = useState<RevisionListItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);
  const [failure, setFailure] = useState<Failure>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const unit = units.find((item) => item.id === unitId) ?? units[0];

  function load(documentId: string, nextPage: number, append: boolean) {
    setBusy("list");
    startTransition(async () => {
      try {
        const result = await listEditorialRevisions({ documentId, page: nextPage });
        if (result.status === "success") {
          setItems((current) => (append ? [...current, ...result.items] : result.items));
          setPage(result.page);
          setPageCount(result.pageCount);
          setFailure(null);
        } else {
          setFailure({ text: result.message, reason: result.reason });
        }
      } catch {
        setFailure({ text: CONNECTION_ERROR });
      }
      setBusy(null);
    });
  }

  // Carrega a primeira página ao abrir e ao trocar de conteúdo (busca no servidor).
  const wanted = open && unit ? unit.id : null;
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });
  useEffect(() => {
    if (wanted) loadRef.current(wanted, 1, false);
  }, [wanted]);

  function preview(item: RevisionListItem) {
    if (!unit) return;
    setBusy(`ver:${item.id}`);
    startTransition(async () => {
      try {
        const result = await getEditorialRevisionContent({ revisionId: item.id });
        if (result.status === "success") {
          onPreview({ unitId: unit.id, revisionId: item.id, number: item.number, label: unit.label, content: result.content });
        } else {
          setFailure({ text: result.message, reason: result.reason });
        }
      } catch {
        setFailure({ text: CONNECTION_ERROR });
      }
      setBusy(null);
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Histórico de versões" busy={false} wide>
      {units.length > 1 && (
        <label className="flex flex-col gap-1.5 text-body-sm">
          <span className="font-semibold">Conteúdo</span>
          <select
            value={unit?.id ?? ""}
            onChange={(event) => setUnitId(event.target.value)}
            className="min-h-10 rounded-lg border border-border bg-surface px-2 text-label"
          >
            {units.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
      )}
      {unit && (
        <p className="text-caption text-muted-foreground">
          {unitState(unit)}
          {unit.publishedRevision ? ` · versão publicada: revisão ${unit.publishedRevision}` : ""}.{" "}
          <a href={`/admin/historico?documento=${unit.id}`} className="font-semibold text-primary underline underline-offset-2">
            Comparar versões no CMS
          </a>
        </p>
      )}
      <ErrorLine failure={failure} loginNext={loginNext} />
      <ol className="flex flex-col gap-2" aria-busy={busy === "list"}>
        {items.map((item) => (
          <li key={item.id} className="flex flex-col gap-2 rounded-xl border border-border p-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-label">
                Revisão {item.number} · {OPERATION_LABELS[item.operation] ?? item.operation}
                {unit?.publishedRevision === item.number && (
                  <span className="ml-2 text-caption font-semibold text-secondary">(publicada atualmente)</span>
                )}
              </span>
              <span className="text-caption text-muted-foreground">
                {formatAdminDateTime(item.createdAt)}
                {item.authorEmail ? ` · ${item.authorEmail}` : ""}
                {item.restoredFrom ? ` · restaurada da revisão ${item.restoredFrom}` : ""}
              </span>
              {item.note && <span className="break-words text-caption">{item.note}</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => preview(item)} disabled={pending} className={neutralButton}>
                <Eye aria-hidden="true" className="size-4" />
                {busy === `ver:${item.id}` ? "Abrindo…" : "Ver na tela"}
              </button>
              {unit && (
                <RestoreButton
                  revisionId={item.id}
                  number={item.number}
                  version={versionOf(unit.id)}
                  dirty={dirty}
                  hasDraft={unit.hasDraft}
                  loginNext={loginNext}
                />
              )}
            </div>
          </li>
        ))}
      </ol>
      {busy === "list" && <p className="text-body-sm text-muted-foreground">Carregando…</p>}
      {page < pageCount && unit && (
        <button type="button" onClick={() => load(unit.id, page + 1, true)} disabled={pending} className={cn(neutralButton, "self-start")}>
          Carregar versões mais antigas
        </button>
      )}
    </Modal>
  );
}

/** Restaura a revisão como rascunho (confirmação em linha). */
export function RestoreButton({
  revisionId,
  number,
  version,
  dirty,
  hasDraft,
  loginNext,
}: {
  revisionId: string;
  number: number;
  version: number;
  dirty: boolean;
  hasDraft: boolean;
  loginNext: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [failure, setFailure] = useState<Failure>(null);
  const [pending, startTransition] = useTransition();

  function restore() {
    startTransition(async () => {
      try {
        const result = await restoreEditorialRevision({ revisionId, version });
        if (result.status === "success") {
          window.location.reload();
          return;
        }
        setFailure({ text: result.message, reason: result.reason });
      } catch {
        setFailure({ text: CONNECTION_ERROR });
      }
      setConfirming(false);
    });
  }

  if (dirty) {
    return (
      <span className="self-center text-caption text-muted-foreground">
        Salve ou descarte as alterações não salvas para restaurar.
      </span>
    );
  }
  return (
    <div className="flex flex-col gap-2">
      {confirming ? (
        <span role="group" aria-label={`Confirmar restauração da revisão ${number}`} className="flex flex-wrap items-center gap-2">
          <span className="text-caption font-semibold">
            Vira o novo rascunho{hasDraft ? " (o rascunho atual fica no histórico)" : ""}. O site não muda.
          </span>
          <button type="button" onClick={restore} disabled={pending} className={primaryButton}>
            {pending ? "Restaurando…" : "Restaurar"}
          </button>
          <button type="button" autoFocus onClick={() => setConfirming(false)} disabled={pending} className={neutralButton}>
            Cancelar
          </button>
        </span>
      ) : (
        <button type="button" onClick={() => setConfirming(true)} className={neutralButton}>
          <RotateCcw aria-hidden="true" className="size-4" />
          Restaurar como rascunho
        </button>
      )}
      <ErrorLine failure={failure} loginNext={loginNext} />
    </div>
  );
}
