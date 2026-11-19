"use client";

import Image from "next/image";
import { AlertCircle, CheckCircle2, ImagePlus, Loader2, Upload, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { prepareMediaUpload } from "@/lib/admin/media-actions";
import { MEDIA_ACCEPT, MEDIA_BUCKET, MEDIA_MAX_BYTES, formatBytes } from "@/lib/media/config";
import { checkImageFile, type CheckedFile } from "@/lib/media/file-check";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

import { mediaNeutralButton, mediaPrimaryButton } from "./media-styles";

type EntryStatus = "checking" | "ready" | "invalid" | "uploading" | "done" | "error";

type Entry = {
  key: string;
  file: File;
  previewUrl: string;
  status: EntryStatus;
  message?: string;
  checked?: CheckedFile;
  path?: string;
};

const statusText: Record<EntryStatus, string> = {
  checking: "Verificando…",
  ready: "Pronto para enviar",
  invalid: "Arquivo recusado",
  uploading: "Enviando…",
  done: "Enviado",
  error: "Falha no envio",
};

/** Mensagem para o erro devolvido pelo Storage no envio direto. */
function uploadErrorMessage(error: { message?: string; statusCode?: string; status?: number }) {
  const text = `${error.message ?? ""}`.toLowerCase();
  const status = Number(error.statusCode ?? error.status);
  if (status === 413 || text.includes("size")) return "O arquivo excede o limite de 5 MB.";
  if (status === 415 || text.includes("mime")) return "Formato não permitido pelo servidor. Envie JPEG, PNG ou WebP.";
  if (status === 403 || status === 401 || text.includes("signature") || text.includes("policy")) {
    return "O envio não foi autorizado. Recarregue a página e tente de novo.";
  }
  if (status === 409 || text.includes("exists")) return "Já existe um arquivo com este identificador. Tente enviar de novo.";
  return "Não foi possível enviar o arquivo. Verifique a conexão e tente de novo.";
}

/**
 * Seleção (botão ou arrastar e soltar), verificação e envio de imagens. O
 * envio só começa quando a pessoa confirma; cada arquivo mostra o resultado
 * real devolvido pelo Storage (sem barra de progresso simulada).
 */
export function MediaUploader({
  onUploaded,
  compact = false,
}: {
  /** Caminhos enviados com sucesso nesta rodada. */
  onUploaded: (paths: string[]) => void;
  compact?: boolean;
}) {
  const inputId = useId();
  const statusId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [dragging, setDragging] = useState(false);
  const [sending, setSending] = useState(false);
  const entriesRef = useRef(entries);
  useEffect(() => {
    entriesRef.current = entries;
  }, [entries]);

  // Libera as pré-visualizações locais ao sair.
  useEffect(() => () => entriesRef.current.forEach((entry) => URL.revokeObjectURL(entry.previewUrl)), []);

  function patch(key: string, changes: Partial<Entry>) {
    setEntries((current) => current.map((entry) => (entry.key === key ? { ...entry, ...changes } : entry)));
  }

  function addFiles(list: FileList | File[]) {
    const files = Array.from(list).slice(0, 20);
    const added = files.map((file) => ({
      key: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: "checking" as const,
    }));
    setEntries((current) => [...current.filter((entry) => entry.status !== "done"), ...added]);
    for (const entry of added) {
      void checkImageFile(entry.file).then((result) =>
        result.ok
          ? patch(entry.key, { status: "ready", checked: result.file, message: undefined })
          : patch(entry.key, { status: "invalid", message: result.error }),
      );
    }
  }

  function remove(key: string) {
    setEntries((current) => {
      const entry = current.find((item) => item.key === key);
      if (entry) URL.revokeObjectURL(entry.previewUrl);
      return current.filter((item) => item.key !== key);
    });
  }

  async function sendAll() {
    if (sending) return;
    const queue = entriesRef.current.filter((entry) => entry.status === "ready" || entry.status === "error");
    if (queue.length === 0) return;
    setSending(true);
    const supabase = createClient();
    const uploaded: string[] = [];

    for (const entry of queue) {
      const checked = entry.checked;
      if (!checked) continue;
      patch(entry.key, { status: "uploading", message: undefined });
      try {
        const prepared = await prepareMediaUpload({
          mimeType: checked.mimeType,
          size: entry.file.size,
          width: checked.width,
          height: checked.height,
        });
        if (prepared.status !== "ready") {
          patch(entry.key, { status: "error", message: prepared.message });
          continue;
        }
        const { error } = await supabase.storage
          .from(MEDIA_BUCKET)
          .uploadToSignedUrl(prepared.path, prepared.token, entry.file, {
            contentType: checked.mimeType,
            // Arquivos nunca são sobrescritos (nome único); 1 dia limita por quanto
            // tempo caches ainda servem um arquivo depois de excluído.
            cacheControl: "86400",
            upsert: false,
            metadata: {
              originalName: entry.file.name.slice(0, 200),
              width: checked.width,
              height: checked.height,
            },
          });
        if (error) {
          patch(entry.key, { status: "error", message: uploadErrorMessage(error as never) });
          continue;
        }
        patch(entry.key, { status: "done", path: prepared.path });
        uploaded.push(prepared.path);
      } catch {
        patch(entry.key, { status: "error", message: "Sem conexão com o servidor. Tente de novo." });
      }
    }

    setSending(false);
    if (uploaded.length > 0) onUploaded(uploaded);
  }

  const pendingCount = entries.filter((entry) => entry.status === "ready" || entry.status === "error").length;
  const checking = entries.some((entry) => entry.status === "checking");
  const doneCount = entries.filter((entry) => entry.status === "done").length;

  return (
    <div className="flex flex-col gap-4">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          if (!sending && event.dataTransfer.files.length > 0) addFiles(event.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-4 text-center transition-colors",
          compact ? "py-5" : "py-8",
          dragging ? "border-primary bg-primary-soft" : "border-border bg-surface",
        )}
      >
        <ImagePlus aria-hidden="true" className="size-8 text-primary" />
        <div className="flex flex-col gap-1">
          <p className="text-label">Arraste imagens para cá ou escolha no dispositivo</p>
          <p className="text-caption text-muted-foreground">
            JPEG, PNG ou WebP, até {formatBytes(MEDIA_MAX_BYTES)} cada. As imagens ficam acessíveis por URL pública.
          </p>
        </div>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={MEDIA_ACCEPT}
          multiple
          className="sr-only"
          disabled={sending}
          onChange={(event) => {
            if (event.target.files?.length) addFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={sending}
          className={mediaNeutralButton}
        >
          <Upload aria-hidden="true" className="size-4" />
          Escolher arquivos
        </button>
      </div>

      {entries.length > 0 && (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col gap-2" aria-describedby={statusId}>
            {entries.map((entry) => (
              <li
                key={entry.key}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2.5"
              >
                <div className="relative size-14 shrink-0 overflow-hidden rounded-lg bg-surface-muted">
                  {entry.status !== "invalid" && (
                    <Image src={entry.previewUrl} alt="" fill unoptimized sizes="56px" className="object-contain" />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="truncate text-body-sm font-semibold" title={entry.file.name}>
                    {entry.file.name}
                  </p>
                  <p className="text-caption text-muted-foreground">
                    {formatBytes(entry.file.size)}
                    {entry.checked ? ` · ${entry.checked.width} × ${entry.checked.height} px` : ""}
                  </p>
                  <p
                    className={cn(
                      "flex items-start gap-1.5 text-caption",
                      entry.status === "invalid" || entry.status === "error"
                        ? "text-danger"
                        : entry.status === "done"
                          ? "text-secondary"
                          : "text-muted-foreground",
                    )}
                  >
                    {entry.status === "uploading" || entry.status === "checking" ? (
                      <Loader2 aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 animate-spin" />
                    ) : entry.status === "done" ? (
                      <CheckCircle2 aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                    ) : entry.status === "invalid" || entry.status === "error" ? (
                      <AlertCircle aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                    ) : null}
                    <span>
                      {statusText[entry.status]}
                      {entry.message ? `: ${entry.message}` : ""}
                    </span>
                  </p>
                </div>
                {entry.status !== "uploading" && entry.status !== "done" && (
                  <button
                    type="button"
                    onClick={() => remove(entry.key)}
                    disabled={sending}
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-muted hover:text-foreground"
                  >
                    <X aria-hidden="true" className="size-4" />
                    <span className="sr-only">Remover {entry.file.name} da lista</span>
                  </button>
                )}
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p id={statusId} className="text-body-sm text-muted-foreground" aria-live="polite">
              {sending
                ? "Enviando imagens…"
                : checking
                  ? "Verificando arquivos…"
                  : doneCount > 0 && pendingCount === 0
                    ? `${doneCount === 1 ? "1 imagem enviada" : `${doneCount} imagens enviadas`} para a biblioteca.`
                    : pendingCount > 0
                      ? `${pendingCount === 1 ? "1 imagem pronta" : `${pendingCount} imagens prontas`} para enviar.`
                      : "Nenhuma imagem válida para enviar."}
            </p>
            <button
              type="button"
              onClick={() => void sendAll()}
              disabled={sending || checking || pendingCount === 0}
              className={mediaPrimaryButton}
            >
              {sending ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <Upload aria-hidden="true" className="size-4" />
              )}
              {sending ? "Enviando…" : pendingCount > 1 ? `Enviar ${pendingCount} imagens` : "Enviar imagem"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
