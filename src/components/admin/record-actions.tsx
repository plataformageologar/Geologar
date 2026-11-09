"use client";

import Link from "next/link";
import { Eye, EyeOff, ExternalLink, Pencil, Trash2, X } from "lucide-react";
import {
  createContext,
  use,
  useEffect,
  useId,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";

import type { Entity, RecordActionState } from "@/lib/admin/action-results";
import { deleteProject, setProjectPublished } from "@/lib/admin/project-actions";
import { deleteResearchLine, setResearchLinePublished } from "@/lib/admin/research-line-actions";
import { cn } from "@/lib/utils/cn";

import { FormMessage } from "./form-controls";

const actions = {
  "research-line": { publish: setResearchLinePublished, remove: deleteResearchLine },
  project: { publish: setProjectPublished, remove: deleteProject },
} satisfies Record<Entity, Record<string, (state: RecordActionState, data: FormData) => Promise<RecordActionState>>>;

const connectionFailure: RecordActionState = {
  status: "error",
  reason: "connection",
  message: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
};

const FeedbackContext = createContext<(state: RecordActionState) => void>(() => {});

/**
 * Área de retorno das ações da listagem. Fica fora das linhas: uma linha
 * excluída some da tela, mas a confirmação continua visível.
 */
export function RecordFeedbackProvider({ children }: { children: ReactNode }) {
  const [feedback, setFeedback] = useState<RecordActionState>({ status: "idle" });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (feedback.status !== "idle") ref.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [feedback]);

  return (
    <FeedbackContext value={setFeedback}>
      <div ref={ref} className="scroll-mt-24 empty:hidden">
        {feedback.status !== "idle" && (
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <FormMessage tone={feedback.status === "success" ? "success" : "error"}>
                {feedback.message}
              </FormMessage>
            </div>
            <button
              type="button"
              onClick={() => setFeedback({ status: "idle" })}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            >
              <X aria-hidden="true" className="size-4" />
              <span className="sr-only">Fechar mensagem</span>
            </button>
          </div>
        )}
      </div>
      {children}
    </FeedbackContext>
  );
}

const buttonClasses =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border px-3.5 text-label transition-colors " +
  "disabled:pointer-events-none disabled:opacity-50";
const neutralButton = cn(buttonClasses, "border-border text-foreground hover:border-primary/40 hover:text-primary");

type RecordRowActionsProps = {
  entity: Entity;
  id: string;
  title: string;
  isPublished: boolean;
  editHref: string;
  /** Página pública (somente quando publicado). */
  publicHref: string;
  /** Exclusão: somente administradores e somente rascunhos. */
  canDelete: boolean;
};

/** Ações de um registro na listagem: editar, ver no site, publicar e excluir. */
export function RecordRowActions({
  entity,
  id,
  title,
  isPublished,
  editHref,
  publicHref,
  canDelete,
}: RecordRowActionsProps) {
  const report = use(FeedbackContext);
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState<"publish" | "delete" | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const dialogId = useId();

  function run(kind: "publish" | "delete") {
    const data = new FormData();
    data.set("id", id);
    if (kind === "publish") data.set("publish", String(!isPublished));
    setRunning(kind);
    startTransition(async () => {
      let result: RecordActionState;
      try {
        result =
          kind === "publish"
            ? await actions[entity].publish({ status: "idle" }, data)
            : await actions[entity].remove({ status: "idle" }, data);
      } catch {
        result = connectionFailure;
      }
      dialogRef.current?.close();
      setRunning(null);
      report(result);
    });
  }

  const label = <span className="sr-only">: {title}</span>;

  return (
    <div className="flex flex-wrap gap-2">
      <Link href={editHref} className={neutralButton}>
        <Pencil aria-hidden="true" className="size-4" />
        Editar{label}
      </Link>
      {isPublished && (
        <a href={publicHref} target="_blank" rel="noopener" className={neutralButton}>
          <ExternalLink aria-hidden="true" className="size-4" />
          Ver no site{label}
          <span className="sr-only"> (abre em nova aba)</span>
        </a>
      )}
      <button type="button" onClick={() => run("publish")} disabled={pending} className={neutralButton}>
        {isPublished ? (
          <EyeOff aria-hidden="true" className="size-4" />
        ) : (
          <Eye aria-hidden="true" className="size-4" />
        )}
        {running === "publish"
          ? isPublished
            ? "Despublicando…"
            : "Publicando…"
          : isPublished
            ? "Despublicar"
            : "Publicar"}
        {label}
      </button>
      {canDelete && (
        <>
          <button
            type="button"
            onClick={() => dialogRef.current?.showModal()}
            disabled={pending}
            className={cn(buttonClasses, "border-danger/40 text-danger hover:bg-danger-soft")}
          >
            <Trash2 aria-hidden="true" className="size-4" />
            Excluir{label}
          </button>
          <dialog
            ref={dialogRef}
            aria-labelledby={`${dialogId}-title`}
            aria-describedby={`${dialogId}-description`}
            onCancel={(event) => {
              if (pending) event.preventDefault();
            }}
            className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border bg-surface p-6 text-foreground shadow-xl backdrop:bg-deep/60"
          >
            <div className="flex flex-col gap-4">
              <h2 id={`${dialogId}-title`} className="text-h4 font-sans">
                Excluir permanentemente?
              </h2>
              <div id={`${dialogId}-description`} className="flex flex-col gap-2 text-body-sm">
                <p>
                  <strong className="font-semibold">“{title}”</strong> será {entity === "project" ? "apagado" : "apagada"} do banco de dados.
                </p>
                <p className="font-semibold text-danger">Esta ação não pode ser desfeita.</p>
                <p className="text-muted-foreground">
                  Se houver vínculos com projetos, linhas de pesquisa ou publicações, a exclusão será
                  recusada e os vínculos serão listados.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 pt-2 sm:flex sm:justify-end">
                <button
                  type="button"
                  autoFocus
                  onClick={() => dialogRef.current?.close()}
                  disabled={pending}
                  className={cn(neutralButton, "px-5")}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => run("delete")}
                  disabled={pending}
                  className={cn(buttonClasses, "border-danger bg-danger px-5 font-semibold text-white hover:bg-danger/90")}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  {running === "delete" ? "Excluindo…" : "Excluir permanentemente"}
                </button>
              </div>
            </div>
          </dialog>
        </>
      )}
    </div>
  );
}
