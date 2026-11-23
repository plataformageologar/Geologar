"use client";

import { Archive, ArchiveRestore, EyeOff, FilePlus2 } from "lucide-react";
import { useId, useRef, useState, useTransition } from "react";

import {
  saveEditorialDrafts,
  setCustomPageStatus,
  updateCustomPageSlug,
} from "@/lib/admin/editorial-actions";
import type { CustomPageStatus } from "@/lib/queries/editorial";
import { cn } from "@/lib/utils/cn";

import { FormMessage } from "../form-controls";
import { FailureAction } from "../save-bar";
import { SlugField } from "../slug-field";
import { useEditorial } from "./editorial-scope";

/** Painéis da tela de uma página personalizada (endereço, situação, republicar). */

type Message = { tone: "success" | "error"; text: string; reason?: string } | null;

const CONNECTION_ERROR =
  "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente; nada foi alterado.";

const actionClasses =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border px-4 text-label transition-colors " +
  "disabled:pointer-events-none disabled:opacity-50";
const neutralAction = cn(actionClasses, "border-border text-foreground hover:border-primary/40 hover:text-primary");

function Feedback({ message, loginNext }: { message: Message; loginNext: string }) {
  if (!message) return null;
  return (
    <FormMessage tone={message.tone}>
      {message.text}
      {message.reason && <FailureAction reason={message.reason} loginNext={loginNext} />}
    </FormMessage>
  );
}

/** Endereço: editável somente enquanto a página nunca foi publicada. */
export function SlugPanel({
  pageId,
  slug,
  title,
  locked,
}: {
  pageId: string;
  slug: string;
  title: string;
  locked: boolean;
}) {
  const [value, setValue] = useState(slug);
  const [error, setError] = useState<string | undefined>();
  const [message, setMessage] = useState<Message>(null);
  const [pending, startTransition] = useTransition();
  const loginNext = `/admin/paginas/${pageId}`;

  if (locked) {
    return (
      <div className="flex flex-col gap-1">
        <p className="text-label">Endereço</p>
        <code className="break-all text-body-sm">/paginas/{slug}</code>
        <p className="text-caption text-muted-foreground">
          Fixo: a página já foi publicada e mudar o endereço quebraria links já divulgados.
        </p>
      </div>
    );
  }

  function save() {
    startTransition(async () => {
      try {
        const result = await updateCustomPageSlug({ pageId, slug: value });
        if (result.status === "success") {
          setError(undefined);
          setMessage({ tone: "success", text: result.message });
        } else {
          setError(result.fieldErrors?.slug);
          setMessage(result.fieldErrors?.slug ? null : { tone: "error", text: result.message, reason: result.reason });
        }
      } catch {
        setMessage({ tone: "error", text: CONNECTION_ERROR });
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <SlugField
        value={value}
        title={title}
        error={error}
        publicPrefix="/paginas/"
        publishedSlug={null}
        label="Endereço"
        onChange={(next) => {
          setValue(next.slice(0, 100));
          setMessage(null);
        }}
      />
      <p className="text-caption text-muted-foreground">
        Pode ser alterado até a primeira publicação. Depois disso fica fixo.
      </p>
      <Feedback message={message} loginNext={loginNext} />
      <button
        type="button"
        onClick={save}
        disabled={pending || value.trim() === slug}
        className={cn(neutralAction, "self-start")}
      >
        {pending ? "Salvando endereço…" : "Salvar endereço"}
      </button>
    </div>
  );
}

type StatusAction = "unpublish" | "archive" | "unarchive";

const ACTIONS: Record<StatusAction, { label: string; running: string; title: string; text: string; icon: typeof Archive }> = {
  unpublish: {
    label: "Despublicar",
    running: "Despublicando…",
    title: "Despublicar a página?",
    text: "A página sai do site público (o endereço passa a mostrar “página não encontrada”). O conteúdo, os blocos e o histórico continuam no CMS e ela pode ser publicada de novo.",
    icon: EyeOff,
  },
  archive: {
    label: "Arquivar",
    running: "Arquivando…",
    title: "Arquivar a página?",
    text: "A página sai do site público e da lista de trabalho. Nada é excluído: título, blocos e histórico ficam guardados e ela pode ser reativada.",
    icon: Archive,
  },
  unarchive: {
    label: "Reativar",
    running: "Reativando…",
    title: "Reativar a página?",
    text: "A página volta a ser editável como rascunho. Ela só aparece no site depois de publicada.",
    icon: ArchiveRestore,
  },
};

/** Despublicar, arquivar e reativar (sem exclusão física). */
export function StatusActions({
  pageId,
  status,
  isAdmin,
  everPublished,
}: {
  pageId: string;
  status: CustomPageStatus;
  isAdmin: boolean;
  everPublished: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<Message>(null);
  const [current, setCurrent] = useState<StatusAction | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const id = useId();

  // As mesmas regras do banco (que confere de novo): editores só mexem em páginas nunca publicadas.
  const canManage = isAdmin || !everPublished;
  const available: StatusAction[] = [];
  if (status === "published" && isAdmin) available.push("unpublish");
  if (status !== "archived" && canManage) available.push("archive");
  if (status === "archived" && canManage) available.push("unarchive");

  function run(action: StatusAction) {
    startTransition(async () => {
      try {
        const result = await setCustomPageStatus({ pageId, action });
        setMessage(
          result.status === "success"
            ? { tone: "success", text: result.message }
            : { tone: "error", text: result.message, reason: result.reason },
        );
      } catch {
        setMessage({ tone: "error", text: CONNECTION_ERROR });
      }
      dialogRef.current?.close();
    });
  }

  if (available.length === 0) {
    return (
      <p className="text-caption text-muted-foreground">
        Despublicar, arquivar ou reativar esta página é feito por um administrador.
      </p>
    );
  }

  const info = current ? ACTIONS[current] : null;
  return (
    <div className="flex flex-col gap-3">
      <Feedback message={message} loginNext={`/admin/paginas/${pageId}`} />
      <div className="flex flex-wrap gap-2">
        {available.map((action) => {
          const Icon = ACTIONS[action].icon;
          return (
            <button
              key={action}
              type="button"
              disabled={pending}
              onClick={() => {
                setCurrent(action);
                dialogRef.current?.showModal();
              }}
              className={neutralAction}
            >
              <Icon aria-hidden="true" className="size-4" />
              {pending && current === action ? ACTIONS[action].running : ACTIONS[action].label}
            </button>
          );
        })}
      </div>
      <dialog
        ref={dialogRef}
        aria-labelledby={`${id}-title`}
        onCancel={(event) => {
          if (pending) event.preventDefault();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-border bg-surface p-6 text-foreground shadow-xl backdrop:bg-deep/60"
      >
        {info && current && (
          <div className="flex flex-col gap-4">
            <h2 id={`${id}-title`} className="text-h4 font-sans">
              {info.title}
            </h2>
            <p className="text-body-sm">{info.text}</p>
            <div className="grid grid-cols-1 gap-3 pt-2 sm:flex sm:justify-end">
              <button
                type="button"
                autoFocus
                onClick={() => dialogRef.current?.close()}
                disabled={pending}
                className={cn(neutralAction, "px-5")}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => run(current)}
                disabled={pending}
                className={cn(actionClasses, "border-primary bg-primary px-5 font-semibold text-primary-foreground hover:bg-primary-hover")}
              >
                {pending ? info.running : info.label}
              </button>
            </div>
          </div>
        )}
      </dialog>
    </div>
  );
}

/**
 * Página fora do site e sem rascunho (despublicada ou reativada): para
 * publicar de novo é preciso um rascunho. Este botão cria o rascunho a partir
 * da última versão publicada — uma ação separada e visível, não um atalho.
 */
export function PrepareRepublish() {
  const editorial = useEditorial();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<Message>(null);

  function prepare() {
    startTransition(async () => {
      try {
        const result = await saveEditorialDrafts({
          documents: [{ documentId: editorial.documentId, version: editorial.version, parts: {} }],
        });
        if (result.status === "success") {
          editorial.setVersion(result.documents[0].version);
          setMessage({ tone: "success", text: "Rascunho criado a partir da última versão publicada. Revise e clique em “Publicar alterações”." });
        } else {
          setMessage({ tone: "error", text: result.message, reason: result.reason });
        }
      } catch {
        setMessage({ tone: "error", text: CONNECTION_ERROR });
      }
    });
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-dashed border-border p-4">
      <p className="text-body-sm">
        Esta página está fora do site e não tem rascunho. Para publicá-la de novo, crie um rascunho a partir da
        última versão publicada (ou edite os campos abaixo e salve).
      </p>
      <Feedback message={message} loginNext="/admin/paginas" />
      {message?.tone !== "success" && (
        <button type="button" onClick={prepare} disabled={pending} className={cn(neutralAction, "self-start")}>
          <FilePlus2 aria-hidden="true" className="size-4" />
          {pending ? "Criando rascunho…" : "Preparar para publicar de novo"}
        </button>
      )}
    </div>
  );
}
