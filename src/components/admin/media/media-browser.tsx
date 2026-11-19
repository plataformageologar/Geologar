"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, Copy, ImageOff, Info, Loader2, Search, Trash2, Upload, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import {
  deleteMedia,
  getMediaUsageAction,
  listMedia,
  type DeleteMediaState,
} from "@/lib/admin/media-actions";
import { formatBytes, formatMediaDate, mediaTypeLabels, mediaUsageHref } from "@/lib/media/config";
import type { MediaItem, MediaUsage } from "@/lib/queries/admin-media";
import { cn } from "@/lib/utils/cn";

import { FormMessage } from "../form-controls";
import { MediaUploader } from "./media-uploader";
import { mediaButton, mediaDangerButton, mediaNeutralButton, mediaPrimaryButton } from "./media-styles";

export type MediaPage = { items: MediaItem[]; total: number };

type Filters = { search: string; unusedOnly: boolean };

type Notice = { tone: "success" | "error"; text: string } | null;

const dialogClasses =
  "m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto rounded-2xl border border-border " +
  "bg-surface p-5 text-foreground shadow-xl backdrop:bg-deep/60 sm:p-6";

function displayName(item: MediaItem) {
  return item.originalName?.trim() || item.name.replace(/^uploads\//, "");
}

function describe(item: MediaItem) {
  const type = item.mimeType ? (mediaTypeLabels[item.mimeType] ?? item.mimeType) : "—";
  return `${type} · ${formatBytes(item.size)}`;
}

function dimensions(item: MediaItem) {
  return item.width && item.height ? `${item.width} × ${item.height} px` : "Dimensões não informadas";
}

/**
 * Grade da biblioteca de mídia, com busca, filtro de arquivos sem uso,
 * carregamento progressivo e envio de novas imagens. No modo "select" (dentro
 * do seletor de imagem), ativar um card escolhe a imagem; no modo "library",
 * abre os detalhes com cópia da URL e exclusão (somente admin).
 */
export function MediaBrowser({
  initial,
  canUpload,
  canDelete,
  mode = "library",
  chosenName,
  onChoose,
}: {
  initial: MediaPage | null;
  canUpload: boolean;
  canDelete: boolean;
  mode?: "library" | "select";
  chosenName?: string | null;
  onChoose?: (item: MediaItem) => void;
}) {
  const searchId = useId();
  const unusedId = useId();
  const uploadRegionId = useId();
  const [items, setItems] = useState<MediaItem[]>(initial?.items ?? []);
  const [total, setTotal] = useState(initial?.total ?? 0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>({ search: "", unusedOnly: false });
  const [searchDraft, setSearchDraft] = useState("");
  const [loading, setLoading] = useState<"replace" | "more" | null>(initial ? null : "replace");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [detail, setDetail] = useState<MediaItem | null>(null);
  const [showUploader, setShowUploader] = useState(mode === "library");
  const requestRef = useRef(0);

  async function load(next: Filters, nextPage: number, options: { chooseName?: string } = {}) {
    const request = ++requestRef.current;
    setLoading(nextPage === 1 ? "replace" : "more");
    setLoadError(null);
    await fetchPage(request, next, nextPage, options);
  }

  /** Busca uma página e aplica o resultado (ignora respostas superadas). */
  async function fetchPage(request: number, next: Filters, nextPage: number, options: { chooseName?: string }) {
    const result = await listMedia({ ...next, page: nextPage }).catch(() => null);
    if (request !== requestRef.current) return;
    setLoading(null);
    if (!result || result.status !== "ready") {
      setLoadError(result?.message ?? "Não foi possível carregar a biblioteca. Verifique sua conexão e tente novamente.");
      return;
    }
    setItems((current) => {
      if (nextPage === 1) return result.items;
      const known = new Set(current.map((item) => item.name));
      return [...current, ...result.items.filter((item) => !known.has(item.name))];
    });
    setTotal(result.total);
    setPage(nextPage);
    if (options.chooseName && onChoose) {
      const uploaded = result.items.find((item) => item.name === options.chooseName);
      if (uploaded) onChoose(uploaded);
    }
  }

  // Seletor aberto sem dados do servidor: carrega a primeira página.
  // (o estado inicial já é "carregando").
  useEffect(() => {
    if (!initial) void fetchPage(++requestRef.current, { search: "", unusedOnly: false }, 1, {});
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apenas na montagem
  }, []);

  function applyFilters(next: Filters) {
    setFilters(next);
    void load(next, 1);
  }

  function handleUploaded(paths: string[]) {
    setNotice({
      tone: "success",
      text:
        paths.length === 1
          ? "Imagem enviada para a biblioteca."
          : `${paths.length} imagens enviadas para a biblioteca.`,
    });
    // Mostra os envios no topo da grade (sem filtros).
    const reset = { search: "", unusedOnly: false };
    setSearchDraft("");
    setFilters(reset);
    void load(reset, 1, { chooseName: mode === "select" && paths.length === 1 ? paths[0] : undefined });
  }

  function handleDeleted(name: string) {
    setItems((current) => current.filter((item) => item.name !== name));
    setTotal((current) => Math.max(0, current - 1));
    setDetail(null);
    setNotice({ tone: "success", text: "Arquivo excluído permanentemente da biblioteca." });
  }

  const hasFilters = filters.search !== "" || filters.unusedOnly;
  const hasMore = items.length < total;

  return (
    <div className="flex flex-col gap-6">
      {canUpload && (
        <section aria-labelledby={`${uploadRegionId}-title`} className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id={`${uploadRegionId}-title`} className="text-h4 font-sans">
              Enviar imagens
            </h2>
            {mode === "select" && (
              <button
                type="button"
                aria-expanded={showUploader}
                aria-controls={uploadRegionId}
                onClick={() => setShowUploader((value) => !value)}
                className={mediaNeutralButton}
              >
                <Upload aria-hidden="true" className="size-4" />
                {showUploader ? "Ocultar envio" : "Enviar novas imagens"}
              </button>
            )}
          </div>
          <div id={uploadRegionId} hidden={!showUploader}>
            {showUploader && <MediaUploader onUploaded={handleUploaded} compact={mode === "select"} />}
          </div>
        </section>
      )}

      <section aria-label="Imagens da biblioteca" className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="flex w-full flex-col gap-1.5 md:max-w-md">
            <label htmlFor={searchId} className="text-label">
              Buscar pelo nome do arquivo
            </label>
            <div className="flex gap-2">
              <input
                id={searchId}
                type="search"
                value={searchDraft}
                maxLength={100}
                onChange={(event) => setSearchDraft(event.target.value)}
                onKeyDown={(event) => {
                  // Sem <form>: o campo pode estar dentro de um formulário do CMS.
                  if (event.key === "Enter") {
                    event.preventDefault();
                    applyFilters({ ...filters, search: searchDraft.trim() });
                  }
                }}
                placeholder="Ex.: campo-2024"
                className="min-h-11 w-full min-w-0 rounded-xl border border-border bg-surface px-4 text-body text-foreground placeholder:text-muted-foreground/70"
              />
              <button
                type="button"
                onClick={() => applyFilters({ ...filters, search: searchDraft.trim() })}
                className={cn(mediaNeutralButton, "shrink-0")}
              >
                <Search aria-hidden="true" className="size-4" />
                Buscar
              </button>
            </div>
          </div>
          <div className="flex min-h-11 items-center gap-3">
            <input
              id={unusedId}
              type="checkbox"
              checked={filters.unusedOnly}
              onChange={(event) => applyFilters({ ...filters, unusedOnly: event.target.checked })}
              className="size-5 shrink-0 cursor-pointer accent-primary"
            />
            <label htmlFor={unusedId} className="cursor-pointer text-label">
              Somente imagens sem uso
            </label>
          </div>
        </div>

        <div aria-live="polite" className="flex flex-col gap-3">
          {notice && <FormMessage tone={notice.tone}>{notice.text}</FormMessage>}
          <p className="text-body-sm text-muted-foreground">
            {loading === "replace"
              ? "Carregando imagens…"
              : total === 0
                ? hasFilters
                  ? "Nenhuma imagem encontrada com esses filtros."
                  : "Nenhuma imagem na biblioteca."
                : `Exibindo ${items.length} de ${total} ${total === 1 ? "imagem" : "imagens"}${hasFilters ? " (filtradas)" : ""}.`}
          </p>
        </div>

        {loadError && (
          <div className="flex flex-col items-start gap-3">
            <FormMessage tone="error">{loadError}</FormMessage>
            <button type="button" onClick={() => void load(filters, hasMore && items.length > 0 ? page + 1 : 1)} className={mediaNeutralButton}>
              Tentar novamente
            </button>
          </div>
        )}

        {loading === "replace" && items.length === 0 ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-surface py-12 text-body-sm text-muted-foreground">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            Carregando imagens…
          </div>
        ) : items.length === 0 && !loadError ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-surface px-4 py-12 text-center">
            <ImageOff aria-hidden="true" className="size-8 text-muted-foreground" />
            <p className="text-label">{hasFilters ? "Nenhum resultado" : "A biblioteca está vazia"}</p>
            <p className="max-w-sm text-body-sm text-muted-foreground">
              {hasFilters
                ? "Altere a busca ou desmarque o filtro para ver outras imagens."
                : canUpload
                  ? "Envie a primeira imagem usando a área acima."
                  : "Nenhuma imagem foi enviada ainda."}
            </p>
          </div>
        ) : (
          <ul
            className={cn(
              "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3",
              mode === "library" ? "xl:grid-cols-4" : "lg:grid-cols-4",
              loading === "replace" && "opacity-60",
            )}
            aria-busy={loading === "replace"}
          >
            {items.map((item) => {
              const chosen = mode === "select" && chosenName === item.name;
              return (
                <li key={item.name} className="min-w-0">
                  <MediaCard
                    item={item}
                    chosen={chosen}
                    mode={mode}
                    onActivate={() => (mode === "select" ? onChoose?.(item) : setDetail(item))}
                    onDetails={() => setDetail(item)}
                  />
                </li>
              );
            })}
          </ul>
        )}

        {hasMore && (
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => void load(filters, page + 1)}
              disabled={loading !== null}
              className={mediaNeutralButton}
            >
              {loading === "more" && <Loader2 aria-hidden="true" className="size-4 animate-spin" />}
              {loading === "more" ? "Carregando…" : "Carregar mais imagens"}
            </button>
          </div>
        )}
      </section>

      {detail && (
        <MediaDetailDialog
          item={detail}
          canDelete={canDelete && mode === "library"}
          onClose={() => setDetail(null)}
          onDeleted={handleDeleted}
          onChoose={
            mode === "select" && onChoose
              ? (item) => {
                  onChoose(item);
                  setDetail(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

function MediaCard({
  item,
  chosen,
  mode,
  onActivate,
  onDetails,
}: {
  item: MediaItem;
  chosen: boolean;
  mode: "library" | "select";
  onActivate: () => void;
  onDetails: () => void;
}) {
  const name = displayName(item);
  return (
    <div
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-2xl border bg-surface transition-colors",
        chosen ? "border-primary ring-2 ring-primary" : "border-border hover:border-primary/40",
      )}
    >
      <button
        type="button"
        onClick={onActivate}
        aria-pressed={mode === "select" ? chosen : undefined}
        aria-label={mode === "select" ? `Selecionar ${name}` : `Ver detalhes de ${name}`}
        className="flex flex-1 flex-col text-left"
      >
        <span className="relative block aspect-[4/3] w-full bg-surface-muted">
          <Image
            src={item.url}
            alt=""
            fill
            sizes="(min-width: 1280px) 260px, (min-width: 768px) 30vw, 50vw"
            className="object-contain p-2"
          />
          {chosen && (
            <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-caption font-semibold text-primary-foreground">
              <Check aria-hidden="true" className="size-3.5" />
              Selecionada
            </span>
          )}
        </span>
        <span className="flex min-w-0 flex-col gap-0.5 p-3">
          <span className="truncate text-body-sm font-semibold" title={name}>
            {name}
          </span>
          <span className="text-caption text-muted-foreground">{describe(item)}</span>
          <span className="text-caption text-muted-foreground">{dimensions(item)}</span>
          <span className="text-caption text-muted-foreground">Enviada em {formatMediaDate(item.createdAt)}</span>
        </span>
      </button>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-3">
        <span
          className={cn(
            "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-caption font-semibold",
            item.usageCount > 0 ? "bg-secondary-soft text-secondary" : "bg-surface-muted text-muted-foreground",
          )}
        >
          <span aria-hidden="true" className="size-1.5 rounded-full bg-current" />
          {item.usageCount > 0 ? `Em uso (${item.usageCount})` : "Sem uso"}
        </span>
        {mode === "select" && (
          <button
            type="button"
            onClick={onDetails}
            className="inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-caption font-semibold text-primary hover:underline"
          >
            <Info aria-hidden="true" className="size-3.5" />
            Detalhes<span className="sr-only"> de {name}</span>
          </button>
        )}
      </div>
    </div>
  );
}

type UsageState = { status: "loading" } | { status: "ready"; usage: MediaUsage[] } | { status: "error"; message: string };

function MediaDetailDialog({
  item,
  canDelete,
  onClose,
  onDeleted,
  onChoose,
}: {
  item: MediaItem;
  canDelete: boolean;
  onClose: () => void;
  onDeleted: (name: string) => void;
  onChoose?: (item: MediaItem) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const urlId = useId();
  const [usage, setUsage] = useState<UsageState>({ status: "loading" });
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteResult, setDeleteResult] = useState<DeleteMediaState | null>(null);
  const name = displayName(item);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
    let active = true;
    getMediaUsageAction(item.name)
      .then((result) => {
        if (!active) return;
        setUsage(
          result.status === "ready"
            ? { status: "ready", usage: result.usage }
            : { status: "error", message: result.message },
        );
      })
      .catch(() => active && setUsage({ status: "error", message: "Não foi possível verificar onde a imagem é usada." }));
    return () => {
      active = false;
    };
  }, [item.name]);

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopied("ok");
    } catch {
      setCopied("fail");
    }
  }

  async function confirmDelete() {
    if (deleting) return;
    setDeleting(true);
    setDeleteResult(null);
    const result = await deleteMedia(item.name).catch(
      (): DeleteMediaState => ({
        status: "error",
        reason: "connection",
        message: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.",
      }),
    );
    setDeleting(false);
    if (result.status === "success") {
      dialogRef.current?.close();
      onDeleted(item.name);
      return;
    }
    setDeleteResult(result);
    setConfirming(false);
    if ("usage" in result && result.usage) setUsage({ status: "ready", usage: result.usage });
  }

  const inUse = usage.status === "ready" ? usage.usage.length > 0 : item.usageCount > 0;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={onClose}
      onCancel={(event) => {
        if (deleting) event.preventDefault();
      }}
      className={dialogClasses}
    >
      {confirming ? (
        <div className="flex flex-col gap-4">
          <h2 id={titleId} className="text-h4 font-sans">
            Excluir permanentemente?
          </h2>
          <div className="flex items-center gap-4">
            <div className="relative size-20 shrink-0 overflow-hidden rounded-xl border border-border bg-surface-muted">
              <Image src={item.url} alt="" fill sizes="80px" className="object-contain p-1" />
            </div>
            <p className="min-w-0 break-words text-body-sm">
              <strong className="font-semibold">“{name}”</strong> será apagada da biblioteca e a URL pública deixará de funcionar.
            </p>
          </div>
          <p className="text-body-sm font-semibold text-danger">Esta ação não pode ser desfeita.</p>
          <div className="grid grid-cols-1 gap-3 pt-2 sm:flex sm:justify-end">
            <button
              type="button"
              autoFocus
              onClick={() => setConfirming(false)}
              disabled={deleting}
              className={cn(mediaNeutralButton, "px-5")}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={() => void confirmDelete()}
              disabled={deleting}
              className={cn(mediaButton, "border-danger bg-danger px-5 font-semibold text-white hover:bg-danger/90")}
            >
              {deleting ? (
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
              ) : (
                <Trash2 aria-hidden="true" className="size-4" />
              )}
              {deleting ? "Excluindo…" : "Excluir permanentemente"}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="flex items-start justify-between gap-3">
            <h2 id={titleId} className="min-w-0 break-words text-h4 font-sans">
              {name}
            </h2>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-muted hover:text-foreground"
            >
              <X aria-hidden="true" className="size-5" />
              <span className="sr-only">Fechar detalhes</span>
            </button>
          </div>

          <div className="flex justify-center rounded-xl border border-border bg-surface-muted p-3">
            {item.width && item.height ? (
              <Image
                src={item.url}
                alt={`Pré-visualização de ${name}`}
                width={item.width}
                height={item.height}
                sizes="(min-width: 768px) 640px, 100vw"
                className="h-auto max-h-[45vh] w-auto max-w-full object-contain"
              />
            ) : (
              <div className="relative h-[45vh] w-full">
                <Image src={item.url} alt={`Pré-visualização de ${name}`} fill sizes="(min-width: 768px) 640px, 100vw" className="object-contain" />
              </div>
            )}
          </div>

          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 text-body-sm sm:grid-cols-2">
            <div className="flex flex-col gap-0.5">
              <dt className="text-caption text-muted-foreground">Tipo e tamanho</dt>
              <dd>{describe(item)}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-caption text-muted-foreground">Dimensões</dt>
              <dd>{dimensions(item)}</dd>
            </div>
            <div className="flex flex-col gap-0.5">
              <dt className="text-caption text-muted-foreground">Enviada em</dt>
              <dd>{formatMediaDate(item.createdAt)}</dd>
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <dt className="text-caption text-muted-foreground">Caminho no bucket</dt>
              <dd className="break-all font-mono text-caption">{item.name}</dd>
            </div>
          </dl>

          <div className="flex flex-col gap-1.5">
            <label htmlFor={urlId} className="text-caption text-muted-foreground">
              URL pública
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id={urlId}
                readOnly
                value={item.url}
                onFocus={(event) => event.currentTarget.select()}
                className="min-h-11 w-full min-w-0 rounded-xl border border-border bg-surface-muted px-3 font-mono text-caption text-foreground"
              />
              <button type="button" onClick={() => void copyUrl()} className={cn(mediaNeutralButton, "shrink-0")}>
                <Copy aria-hidden="true" className="size-4" />
                Copiar URL
              </button>
            </div>
            <p aria-live="polite" className="text-caption text-muted-foreground">
              {copied === "ok"
                ? "URL copiada para a área de transferência."
                : copied === "fail"
                  ? "Não foi possível copiar automaticamente. Selecione o campo e copie manualmente."
                  : ""}
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-label">Onde é utilizada</h3>
            {usage.status === "loading" ? (
              <p className="flex items-center gap-2 text-body-sm text-muted-foreground">
                <Loader2 aria-hidden="true" className="size-4 animate-spin" />
                Verificando uso…
              </p>
            ) : usage.status === "error" ? (
              <p className="text-body-sm text-danger">{usage.message}</p>
            ) : usage.usage.length === 0 ? (
              <p className="text-body-sm text-muted-foreground">Não é utilizada por nenhum conteúdo.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-body-sm">
                {usage.usage.map((use) => {
                  const href = mediaUsageHref(use.entity, use.recordId);
                  return (
                    <li key={`${use.entity}-${use.recordId}`}>
                      {href ? (
                        <Link href={href} className="font-semibold text-primary underline-offset-2 hover:underline">
                          {use.label}
                        </Link>
                      ) : (
                        use.label
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {deleteResult && deleteResult.status === "error" && <FormMessage tone="error">{deleteResult.message}</FormMessage>}

          <div className="flex flex-col-reverse gap-3 border-t border-border pt-4 sm:flex-row sm:justify-between">
            {canDelete ? (
              <div className="flex flex-col gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteResult(null);
                    setConfirming(true);
                  }}
                  disabled={inUse || usage.status === "loading"}
                  aria-describedby={inUse ? `${titleId}-in-use` : undefined}
                  className={mediaDangerButton}
                >
                  <Trash2 aria-hidden="true" className="size-4" />
                  Excluir
                </button>
                {inUse && (
                  <p id={`${titleId}-in-use`} className="max-w-xs text-caption text-muted-foreground">
                    Esta imagem está sendo utilizada por um ou mais conteúdos. Remova suas associações antes de excluí-la.
                  </p>
                )}
              </div>
            ) : (
              <span />
            )}
            <div className="grid grid-cols-1 gap-3 sm:flex">
              {onChoose && (
                <button type="button" onClick={() => onChoose(item)} className={mediaPrimaryButton}>
                  <Check aria-hidden="true" className="size-4" />
                  Selecionar esta imagem
                </button>
              )}
              <button type="button" onClick={() => dialogRef.current?.close()} className={mediaNeutralButton}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </dialog>
  );
}
