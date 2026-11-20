"use client";

import {
  Check,
  CircleAlert,
  LoaderCircle,
  LogOut,
  Monitor,
  PanelRight,
  Redo2,
  Smartphone,
  Tablet,
  Undo2,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useReducer, useRef, useState, type ReactNode } from "react";

import { saveHomepage } from "@/lib/admin/actions";
import {
  saveAppearance,
  saveNavigation,
  savePageContent,
  savePageSections,
  savePillars,
} from "@/lib/admin/site-config-actions";
import { saveSiteSettings } from "@/lib/admin/site-settings-actions";
import {
  DRAFT_SLICES,
  EDITOR_MESSAGE,
  editorKey,
  homepageFieldSection,
  parseCanvasMessage,
  sectionTarget,
  targetSectionKey,
  type CanvasState,
  type DraftSlice,
  type EditorDocument,
  type EditorDraft,
  type EditorErrors,
  type EditorKey,
  type EditorTarget,
  type EditorVersions,
  type RecordRef,
  type ToCanvasMessage,
} from "@/lib/site/editor-document";
import { EDITOR_PAGES } from "@/lib/site/editor-pages";
import { cn } from "@/lib/utils/cn";

import { buildFormData, FailureAction, useUnsavedChangesWarning } from "../save-bar";
import { historyReducer, initHistory } from "./editor-history";
import { cmsHrefFor, PropertiesPanel } from "./properties-panel";

/**
 * Editor visual: barra de ferramentas, tela (iframe com os componentes
 * públicos) e painel de propriedades. Grava pelas mesmas Server Actions das
 * telas do CMS, que conferem sessão, papel, validação e conflitos.
 */

type Device = "desktop" | "tablet" | "mobile";

const DEVICES: { id: Device; label: string; width: number | null; icon: typeof Monitor }[] = [
  { id: "desktop", label: "Computador", width: null, icon: Monitor },
  { id: "tablet", label: "Tablet (768 px)", width: 768, icon: Tablet },
  { id: "mobile", label: "Celular (390 px)", width: 390, icon: Smartphone },
];

const CONNECTION_ERROR =
  "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente; nada foi perdido.";

const SAVE_ORDER: DraftSlice[] = [
  "homepage",
  "pillars",
  "sections",
  "pageContent",
  "settings",
  "navHeader",
  "navFooter",
  "appearance",
];

const HEADER_SETTINGS = new Set(["site_name", "institutional_name", "logo_path", "header_style", "favicon_path", "tagline", "short_description"]);

type Status =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved" }
  | { kind: "error"; message: string; reason?: string };

type SliceResult =
  | { ok: true; patch: Partial<EditorDraft>; versions: Partial<EditorVersions> }
  | { ok: false; message: string; reason: string; errors: EditorErrors };

function same(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function ToolbarButton({
  ref,
  label,
  onClick,
  disabled,
  pressed,
  children,
  showLabel,
  className,
}: {
  ref?: React.Ref<HTMLButtonElement>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  children: ReactNode;
  showLabel?: boolean;
  className?: string;
}) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={pressed}
      aria-label={showLabel ? undefined : label}
      title={label}
      className={cn(
        "inline-flex min-h-10 min-w-10 items-center justify-center gap-2 rounded-lg px-2.5 text-label transition-colors disabled:opacity-40",
        pressed ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-surface-muted",
        className,
      )}
    >
      {children}
      {showLabel && <span>{label}</span>}
    </button>
  );
}

export function VisualEditor({ doc }: { doc: EditorDocument }) {
  const router = useRouter();
  const [history, dispatch] = useReducer(historyReducer, doc.draft, initHistory);
  const draft = history.present;
  const [saved, setSaved] = useState<EditorDraft>(doc.draft);
  const [versions, setVersions] = useState<EditorVersions>(doc.versions);
  const [errors, setErrors] = useState<EditorErrors>({});
  const [selected, setSelected] = useState<EditorTarget | null>(null);
  const [record, setRecord] = useState<RecordRef | null>(null);
  const [scroll, setScroll] = useState(false);
  const [device, setDevice] = useState<Device>("desktop");
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [panelOpen, setPanelOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [canvasReady, setCanvasReady] = useState(0);

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const panelToggleRef = useRef<HTMLButtonElement>(null);

  const isDetail = doc.page.kind === "project" || doc.page.kind === "research-line";
  const saving = status.kind === "saving";
  const dirtySlices = DRAFT_SLICES.filter((slice) => doc.editable[slice] && !same(draft[slice], saved[slice]));
  const dirty = dirtySlices.length > 0;
  useUnsavedChangesWarning(dirty);

  const select = useCallback((target: EditorTarget | null, options: { scroll?: boolean; record?: RecordRef | null } = {}) => {
    setSelected(target);
    setRecord(options.record ?? null);
    setScroll(options.scroll ?? false);
    setPanelOpen(true);
    // Leva o foco ao título do painel (anúncio do elemento selecionado).
    requestAnimationFrame(() => headingRef.current?.focus({ preventScroll: true }));
  }, []);

  const change = useCallback(<S extends DraftSlice>(slice: S, value: EditorDraft[S], group: string) => {
    dispatch({ type: "change", slice, value, group: `${slice}:${group}`, at: Date.now() });
    setStatus((current) => (current.kind === "saved" ? { kind: "idle" } : current));
  }, []);

  // Seleção ao clicar na tela; atalhos de teclado vindos de dentro dela.
  const commandRef = useRef<(key: EditorKey) => void>(() => {});
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== iframeRef.current?.contentWindow) return;
      const message = parseCanvasMessage(event.data);
      if (!message) return;
      if (message.type === "ready") setCanvasReady((count) => count + 1);
      else if (message.type === "select") select(message.target, { record: message.record });
      else if (message.type === "key") commandRef.current(message.key);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [select]);

  // Envia o rascunho para a tela sempre que algo muda.
  useEffect(() => {
    if (!canvasReady || isDetail) return;
    const state: CanvasState = {
      page: doc.page,
      sectionPage: doc.sectionPage,
      draft,
      render: doc.render,
      selected,
      scroll,
    };
    const message: ToCanvasMessage = { source: EDITOR_MESSAGE, type: "state", state };
    iframeRef.current?.contentWindow?.postMessage(message, window.location.origin);
  }, [canvasReady, draft, selected, scroll, doc, isDetail]);

  async function saveSlice(slice: DraftSlice): Promise<SliceResult> {
    const failure = (result: { message: string; reason: string }, errors: EditorErrors): SliceResult => ({
      ok: false,
      message: result.message,
      reason: result.reason,
      errors,
    });
    switch (slice) {
      case "homepage": {
        if (!draft.homepage || !versions.homepage) break;
        const result = await saveHomepage(
          { status: "idle" },
          buildFormData({ ...draft.homepage, updated_at: versions.homepage }),
        );
        if (result.status === "success") {
          return { ok: true, patch: { homepage: result.values }, versions: { homepage: result.updatedAt } };
        }
        if (result.status === "error") return failure(result, { homepage: result.fieldErrors });
        break;
      }
      case "settings": {
        if (!draft.settings || !versions.settings) break;
        const result = await saveSiteSettings(
          { status: "idle" },
          buildFormData({ ...draft.settings, updated_at: versions.settings }),
        );
        if (result.status === "success") {
          return { ok: true, patch: { settings: result.values }, versions: { settings: result.updatedAt } };
        }
        if (result.status === "error") return failure(result, { settings: result.fieldErrors });
        break;
      }
      case "pillars": {
        const result = await savePillars({ versions: versions.pillars, items: draft.pillars });
        return result.status === "success"
          ? { ok: true, patch: { pillars: result.items }, versions: { pillars: result.versions } }
          : failure(result, { pillars: result.itemErrors });
      }
      case "sections": {
        if (!doc.sectionPage) break;
        const result = await savePageSections({ page: doc.sectionPage, versions: versions.sections, items: draft.sections });
        return result.status === "success"
          ? { ok: true, patch: { sections: result.items }, versions: { sections: result.versions } }
          : failure(result, { sections: result.itemErrors });
      }
      case "pageContent": {
        if (!doc.pageContentKey || !versions.pageContent) break;
        const result = await savePageContent({
          page: doc.pageContentKey,
          values: draft.pageContent,
          updatedAt: versions.pageContent,
        });
        return result.status === "success"
          ? { ok: true, patch: { pageContent: result.values }, versions: { pageContent: result.updatedAt } }
          : failure(result, { pageContent: result.fieldErrors });
      }
      case "navHeader":
      case "navFooter": {
        const location = slice === "navHeader" ? "header" : "footer";
        const result = await saveNavigation({ location, versions: versions[slice], items: draft[slice] });
        return result.status === "success"
          ? { ok: true, patch: { [slice]: result.items }, versions: { [slice]: result.versions } }
          : failure(result, { [slice]: result.itemErrors });
      }
      case "appearance": {
        if (!versions.appearance) break;
        const result = await saveAppearance({ values: draft.appearance, updatedAt: versions.appearance });
        return result.status === "success"
          ? { ok: true, patch: { appearance: result.values }, versions: { appearance: result.updatedAt } }
          : failure(result, { appearance: result.fieldErrors });
      }
    }
    return { ok: false, message: "Esta parte não pôde ser salva. Recarregue a página.", reason: "unexpected", errors: {} };
  }

  function firstErrorTarget(found: EditorErrors, sections: EditorDraft["sections"]): EditorTarget | null {
    const sectionOf = (type: string) => {
      const section = sections?.find((item) => item.section_type === type);
      return section ? sectionTarget(section.key) : null;
    };
    if (found.homepage) {
      const field = Object.keys(found.homepage)[0];
      const type = field ? homepageFieldSection(field) : null;
      if (type) return sectionOf(type);
    }
    if (found.pillars) return sectionOf("about") ?? sectionOf("pillars");
    if (found.sections) {
      const key = Object.keys(found.sections)[0];
      if (key) return sectionTarget(key);
    }
    if (found.pageContent) return "page-header";
    if (found.settings) {
      const field = Object.keys(found.settings)[0];
      return field && HEADER_SETTINGS.has(field) ? "header" : "footer";
    }
    if (found.navHeader) return "header";
    if (found.navFooter) return "footer";
    if (found.appearance) return "appearance";
    return null;
  }

  async function save() {
    if (!dirty || saving) return;
    setStatus({ kind: "saving" });
    setConfirmDiscard(false);
    const before = draft;
    const patch: Partial<EditorDraft> = {};
    let nextVersions = versions;
    const nextErrors: EditorErrors = {};
    let failure: { message: string; reason: string } | null = null;

    for (const slice of SAVE_ORDER) {
      if (!dirtySlices.includes(slice)) continue;
      try {
        const result = await saveSlice(slice);
        if (result.ok) {
          Object.assign(patch, result.patch);
          nextVersions = { ...nextVersions, ...result.versions };
        } else {
          Object.assign(nextErrors, result.errors);
          failure ??= { message: result.message, reason: result.reason };
        }
      } catch {
        failure ??= { message: CONNECTION_ERROR, reason: "connection" };
      }
    }

    // Seções novas recebem o id do banco como chave: mantém a seleção.
    let nextSelected = selected;
    const selectedKey = targetSectionKey(selected);
    if (selectedKey && patch.sections && before.sections) {
      const index = before.sections.findIndex((item) => item.key === selectedKey);
      const item = index >= 0 ? patch.sections[index] : undefined;
      nextSelected = item ? sectionTarget(item.key) : null;
    }

    setSaved((current) => ({ ...current, ...patch }));
    setVersions(nextVersions);
    setErrors(nextErrors);
    dispatch({ type: "saved", patch });

    if (failure) {
      setStatus({ kind: "error", message: failure.message, reason: failure.reason });
      const target = firstErrorTarget(nextErrors, { ...before, ...patch }.sections);
      if (target) select(target, { scroll: true });
      else setSelected(nextSelected);
    } else {
      setStatus({ kind: "saved" });
      setSelected(nextSelected);
    }
  }

  function discard() {
    dispatch({ type: "reset", draft: saved });
    setErrors({});
    setConfirmDiscard(false);
    setStatus({ kind: "idle" });
    const key = targetSectionKey(selected);
    if (key && !saved.sections?.some((item) => item.key === key)) setSelected(null);
  }

  function command(key: EditorKey) {
    if (key === "save") void save();
    else if (key === "undo" && !saving) dispatch({ type: "undo" });
    else if (key === "redo" && !saving) dispatch({ type: "redo" });
    else if (key === "escape") {
      if (confirmDiscard) setConfirmDiscard(false);
      else if (panelOpen && window.matchMedia("(max-width: 1279px)").matches) {
        setPanelOpen(false);
        panelToggleRef.current?.focus();
      } else if (selected) {
        setSelected(null);
        setRecord(null);
      }
    }
  }
  useEffect(() => {
    commandRef.current = command;
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const key = editorKey(event);
      if (!key) return;
      // Esc dentro de listas de opções/diálogos nativos segue o padrão do navegador.
      if (key === "escape" && target?.closest("[role=dialog]")) return;
      event.preventDefault();
      commandRef.current(key);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const deviceWidth = DEVICES.find((item) => item.id === device)?.width ?? null;
  const statusView =
    status.kind === "saving" ? (
      <>
        <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
        Salvando…
      </>
    ) : status.kind === "error" ? (
      <span className="inline-flex items-center gap-1.5 text-danger">
        <CircleAlert aria-hidden="true" className="size-4" />
        Não foi possível salvar
      </span>
    ) : dirty ? (
      <span className="inline-flex items-center gap-1.5 text-earth">
        <span aria-hidden="true" className="size-2 rounded-full bg-earth" />
        Alterações não salvas
      </span>
    ) : status.kind === "saved" ? (
      <span className="inline-flex items-center gap-1.5 text-secondary">
        <Check aria-hidden="true" className="size-4" />
        Salvo com sucesso
      </span>
    ) : (
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
        <Check aria-hidden="true" className="size-4" />
        Tudo salvo
      </span>
    );

  const linkClasses = "min-h-10 items-center gap-2 rounded-lg px-3 text-label text-foreground hover:bg-surface-muted";

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="z-40 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border bg-surface px-3 py-2">
        <div className="order-1 flex min-w-0 flex-1 items-center gap-3 md:flex-none">
          <p className="hidden text-label font-semibold whitespace-nowrap lg:block">Editor Visual GeoLogar</p>
          <label htmlFor="editor-pagina" className="sr-only">
            Página em edição
          </label>
          <select
            id="editor-pagina"
            value={EDITOR_PAGES.some((item) => item.path === doc.page.path) ? doc.page.path : ""}
            onChange={(event) => {
              const path = event.target.value;
              if (!path) return;
              if (dirty && !window.confirm("Há alterações não salvas. Trocar de página e descartá-las?")) return;
              router.push(`/admin/editor?pagina=${encodeURIComponent(path)}`);
            }}
            className="min-h-10 w-full min-w-0 rounded-lg border border-border bg-surface px-2 text-label md:w-auto md:max-w-[12rem]"
          >
            {!EDITOR_PAGES.some((item) => item.path === doc.page.path) && (
              <option value="">
                {doc.page.label}: {doc.page.path}
              </option>
            )}
            {EDITOR_PAGES.map((item) => (
              <option key={item.path} value={item.path}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {/* Celular: salvar, painel e sair ficam na primeira linha. */}
        <div className="order-2 flex items-center gap-1.5 md:order-9">
          <button
            type="button"
            onClick={() => void save()}
            disabled={!dirty || saving}
            title="Salvar (Ctrl+S)"
            className="inline-flex min-h-10 items-center rounded-lg bg-primary px-4 text-label text-primary-foreground hover:bg-primary-hover disabled:opacity-40"
          >
            {saving ? "Salvando…" : "Salvar"}
          </button>
          <ToolbarButton
            ref={panelToggleRef}
            label="Propriedades"
            pressed={panelOpen}
            onClick={() => setPanelOpen((open) => !open)}
            className="xl:hidden"
          >
            <PanelRight aria-hidden="true" className="size-4" />
          </ToolbarButton>
          <a
            href={doc.page.path}
            className={cn(linkClasses, "inline-flex")}
            aria-label="Sair do editor e ver a página no site"
            title="Sair"
          >
            <LogOut aria-hidden="true" className="size-4" />
            <span className="hidden sm:inline">Sair</span>
          </a>
        </div>

        <div aria-hidden="true" className="order-3 h-0 basis-full md:hidden" />

        <div
          role="group"
          aria-label="Largura da tela"
          className="order-4 hidden items-center gap-1 rounded-xl border border-border p-0.5 md:flex"
        >
          {DEVICES.map((item) => (
            <ToolbarButton key={item.id} label={item.label} pressed={device === item.id} onClick={() => setDevice(item.id)}>
              <item.icon aria-hidden="true" className="size-4" />
            </ToolbarButton>
          ))}
        </div>

        <div role="group" aria-label="Histórico" className="order-4 flex items-center gap-1">
          <ToolbarButton
            label="Desfazer (Ctrl+Z)"
            onClick={() => dispatch({ type: "undo" })}
            disabled={saving || history.past.length === 0}
          >
            <Undo2 aria-hidden="true" className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label="Refazer (Ctrl+Shift+Z)"
            onClick={() => dispatch({ type: "redo" })}
            disabled={saving || history.future.length === 0}
          >
            <Redo2 aria-hidden="true" className="size-4" />
          </ToolbarButton>
        </div>

        <p className="order-4 flex min-h-10 items-center gap-2 text-body-sm" role="status" aria-live="polite">
          {statusView}
        </p>

        <div className="order-4 ml-auto flex items-center gap-1.5">
          <a href={cmsHrefFor(doc, selected, draft.sections)} className={cn(linkClasses, "hidden md:inline-flex")}>
            Abrir no CMS
          </a>
          <a href="/admin" className={cn(linkClasses, "hidden lg:inline-flex")}>
            Voltar ao CMS
          </a>
          {confirmDiscard ? (
            <span role="group" aria-label="Confirmar descarte" className="flex items-center gap-1.5">
              <span className="text-caption font-semibold">Descartar tudo?</span>
              <button
                type="button"
                onClick={discard}
                className="inline-flex min-h-10 items-center rounded-lg border border-danger px-3 text-label text-danger"
              >
                Descartar
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => setConfirmDiscard(false)}
                className="inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-label"
              >
                Manter
              </button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDiscard(true)}
              disabled={!dirty || saving}
              className="inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-label disabled:opacity-40"
            >
              Descartar
            </button>
          )}
        </div>
      </header>

      {status.kind === "error" && (
        <div role="alert" className="flex flex-wrap items-center gap-2 border-b border-danger/30 bg-surface px-4 py-2 text-body-sm text-danger">
          <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
          {status.message}
          {status.reason && <FailureAction reason={status.reason} loginNext={`/admin/editor?pagina=${encodeURIComponent(doc.page.path)}`} />}
        </div>
      )}

      <div className="relative flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 justify-center overflow-auto bg-surface-muted md:p-4">
          <iframe
            ref={iframeRef}
            src={isDetail ? doc.page.path : "/admin/editor/canvas"}
            title={`Pré-visualização editável: ${doc.page.label}`}
            style={deviceWidth ? { width: deviceWidth, minWidth: deviceWidth } : undefined}
            className={cn(
              "h-full border-0 bg-background shadow-sm md:rounded-xl md:border md:border-border",
              deviceWidth ? "shrink-0" : "w-full",
            )}
          />
        </div>

        {panelOpen && (
          <div
            aria-hidden="true"
            className="fixed inset-0 z-20 bg-deep/30 md:absolute xl:hidden"
            onClick={() => setPanelOpen(false)}
          />
        )}
        <aside
          id="editor-painel"
          aria-label="Propriedades"
          className={cn(
            "z-30 flex-col overflow-y-auto border-border bg-surface p-5",
            "fixed inset-x-0 bottom-0 max-h-[78dvh] rounded-t-2xl border-t shadow-lg",
            "md:absolute md:top-0 md:left-auto md:max-h-none md:w-[26rem] md:rounded-none md:border-t-0 md:border-l",
            "xl:static xl:z-auto xl:flex xl:shadow-none",
            panelOpen ? "flex" : "hidden",
          )}
        >
          <div className="mb-3 flex justify-end xl:hidden">
            <ToolbarButton label="Fechar painel" onClick={() => setPanelOpen(false)}>
              <X aria-hidden="true" className="size-4" />
            </ToolbarButton>
          </div>
          {doc.loadErrors.length > 0 && (
            <p role="alert" className="mb-4 rounded-xl border border-danger/40 p-3 text-body-sm text-danger">
              Parte do conteúdo não pôde ser carregada e não será alterada. Recarregue a página em instantes.
            </p>
          )}
          <fieldset disabled={saving} className="min-w-0">
            <PropertiesPanel
              doc={doc}
              draft={draft}
              saved={saved}
              errors={errors}
              selected={selected}
              record={record}
              disabled={saving}
              onChange={change}
              onSelect={(target) => {
                if (target) {
                  select(target, { scroll: true });
                } else {
                  setSelected(null);
                  setRecord(null);
                }
              }}
              headingRef={headingRef}
            />
          </fieldset>
        </aside>
      </div>
    </div>
  );
}
