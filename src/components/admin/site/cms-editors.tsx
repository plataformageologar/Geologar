"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";

import type { PartErrors } from "@/lib/admin/editorial";
import { saveEditorialDrafts } from "@/lib/admin/editorial-actions";
import {
  toNavDrafts,
  toPageValues,
  toPillarDrafts,
  toSectionDrafts,
  type AnyContent,
  type PartName,
} from "@/lib/editorial/content";
import { sanitizeAppearance, type Appearance, type AppearanceFieldErrors } from "@/lib/site/appearance";
import type { NavDraft, NavFieldErrors, NavLocation } from "@/lib/site/navigation";
import type { PageContentFieldErrors, PageContentKey, PageContentValues } from "@/lib/site/page-content";
import type { PillarDraft, PillarFieldErrors } from "@/lib/site/pillars";
import type { SectionDraft, SectionFieldErrors, SectionScope } from "@/lib/site/sections";

import { useEditorial, useReportDirty } from "../editorial/editorial-scope";
import { FormMessage } from "../form-controls";
import { FailureAction, SaveBar, useUnsavedChangesWarning } from "../save-bar";
import { AppearanceFields } from "./appearance-fields";
import { NavigationFields } from "./navigation-fields";
import { PageContentFields } from "./page-content-fields";
import { PillarsFields } from "./pillars-fields";
import type { InstitutionOption } from "./section-settings-fields";
import { SectionsFields } from "./sections-fields";

/**
 * Telas do CMS para a configuração do site. Cada uma edita UMA parte de uma
 * unidade editorial (dentro de `EditorialScope`): guarda as alterações em
 * memória, avisa sobre alterações não salvas e grava como RASCUNHO pela mesma
 * Server Action usada pelo editor visual. Publicar é uma ação separada.
 */

type Message = { tone: "error" | "success"; text: string; reason?: string } | null;

const CONNECTION_ERROR =
  "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente; nada foi perdido.";

function same(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function EditorForm({
  part,
  children,
  dirty,
  pending,
  message,
  loginNext,
  onSubmit,
  onCancel,
  readOnly,
}: {
  /** Identifica o formulário no escopo editorial (alterações não salvas). */
  part: string;
  children: ReactNode;
  dirty: boolean;
  pending: boolean;
  message: Message;
  loginNext: string;
  onSubmit: () => void;
  onCancel: () => void;
  readOnly?: boolean;
}) {
  useUnsavedChangesWarning(dirty);
  useReportDirty(part, dirty);
  return (
    <form
      noValidate
      className="flex flex-col gap-6"
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        if (!readOnly) onSubmit();
      }}
    >
      {children}
      {!readOnly && (
        <SaveBar
          message={message}
          messageAction={message?.reason ? <FailureAction reason={message.reason} loginNext={loginNext} /> : undefined}
          pending={pending}
          dirty={dirty}
          onCancel={onCancel}
          submitLabel="Salvar rascunho"
          cancelLabel="Descartar alterações não salvas"
          idleLabel="Nenhuma alteração fora do rascunho"
        />
      )}
    </form>
  );
}

/** Estado comum: rascunho em memória, último valor salvo, retorno e envio. */
function useDraft<T>(initial: T) {
  const [draft, setDraft] = useState(initial);
  const [saved, setSaved] = useState(initial);
  const [message, setMessage] = useState<Message>(null);
  const [pending, startTransition] = useTransition();
  return {
    draft,
    setDraft: (next: T) => {
      setDraft(next);
      if (message?.tone === "success") setMessage(null);
    },
    saved,
    setSaved,
    message,
    setMessage,
    pending,
    startTransition,
    dirty: !same(draft, saved),
    cancel: () => {
      setDraft(saved);
      setMessage(null);
    },
  };
}

type PartSave =
  | { status: "success"; message: string; content: AnyContent }
  | { status: "error"; message: Message; errors: PartErrors };

/** Grava uma parte da unidade como rascunho e atualiza a versão do escopo. */
function usePartSave(part: PartName) {
  const editorial = useEditorial();
  return async (value: unknown): Promise<PartSave> => {
    try {
      const result = await saveEditorialDrafts({
        documents: [{ documentId: editorial.documentId, version: editorial.version, parts: { [part]: value } }],
      });
      if (result.status === "success") {
        const saved = result.documents[0];
        editorial.setVersion(saved.version);
        return { status: "success", message: result.message, content: saved.content };
      }
      const errors = result.partErrors?.[`${editorial.documentId}:${part}`] ?? {};
      return {
        status: "error",
        message: { tone: "error", text: errors.listError ?? result.message, reason: result.reason },
        errors,
      };
    } catch {
      return { status: "error", message: { tone: "error", text: CONNECTION_ERROR }, errors: {} };
    }
  };
}

// Pilares -------------------------------------------------------------------------------

export function PillarsEditor({ initial }: { initial: PillarDraft[] }) {
  const state = useDraft(initial);
  const [errors, setErrors] = useState<Record<string, PillarFieldErrors>>({});
  const save = usePartSave("items");

  const submit = () =>
    state.startTransition(async () => {
      const result = await save(state.draft);
      if (result.status === "success") {
        const items = toPillarDrafts(result.content.items ?? []);
        state.setSaved(items);
        state.setDraft(items);
        setErrors({});
        state.setMessage({ tone: "success", text: result.message });
      } else {
        setErrors((result.errors.itemErrors ?? {}) as Record<string, PillarFieldErrors>);
        state.setMessage(result.message);
      }
    });

  return (
    <EditorForm
      part="items"
      dirty={state.dirty}
      pending={state.pending}
      message={state.message}
      loginNext="/admin/pilares"
      onSubmit={submit}
      onCancel={() => {
        state.cancel();
        setErrors({});
      }}
    >
      <PillarsFields items={state.draft} onChange={state.setDraft} errors={errors} disabled={state.pending} />
    </EditorForm>
  );
}

// Navegação -----------------------------------------------------------------------------

export function NavigationEditor({ location, initial }: { location: NavLocation; initial: NavDraft[] }) {
  const state = useDraft(initial);
  const [errors, setErrors] = useState<Record<string, NavFieldErrors>>({});
  const save = usePartSave(location);

  const submit = () =>
    state.startTransition(async () => {
      const result = await save(state.draft);
      if (result.status === "success") {
        const items = toNavDrafts(result.content[location] ?? []);
        state.setSaved(items);
        state.setDraft(items);
        setErrors({});
        state.setMessage({ tone: "success", text: result.message });
      } else {
        setErrors((result.errors.itemErrors ?? {}) as Record<string, NavFieldErrors>);
        state.setMessage(result.message);
      }
    });

  return (
    <EditorForm
      part={location}
      dirty={state.dirty}
      pending={state.pending}
      message={state.message}
      loginNext="/admin/navegacao"
      onSubmit={submit}
      onCancel={() => {
        state.cancel();
        setErrors({});
      }}
    >
      <NavigationFields
        location={location}
        items={state.draft}
        onChange={state.setDraft}
        errors={errors}
        disabled={state.pending}
      />
    </EditorForm>
  );
}

// Seções --------------------------------------------------------------------------------

export function SectionsEditor({
  page,
  initial,
  institutions,
  canUpload,
  loginNext = "/admin/secoes",
}: {
  page: SectionScope;
  initial: SectionDraft[];
  institutions: InstitutionOption[];
  canUpload: boolean;
  loginNext?: string;
}) {
  const state = useDraft(initial);
  const [errors, setErrors] = useState<Record<string, SectionFieldErrors>>({});
  const save = usePartSave("sections");

  const submit = () =>
    state.startTransition(async () => {
      const result = await save(state.draft);
      if (result.status === "success") {
        const items = toSectionDrafts(result.content.sections ?? []);
        state.setSaved(items);
        state.setDraft(items);
        setErrors({});
        state.setMessage({ tone: "success", text: result.message });
      } else {
        setErrors((result.errors.itemErrors ?? {}) as Record<string, SectionFieldErrors>);
        state.setMessage(result.message);
      }
    });

  return (
    <EditorForm
      part="sections"
      dirty={state.dirty}
      pending={state.pending}
      message={state.message}
      loginNext={loginNext}
      onSubmit={submit}
      onCancel={() => {
        state.cancel();
        setErrors({});
      }}
    >
      <SectionsFields
        page={page}
        items={state.draft}
        onChange={state.setDraft}
        errors={errors}
        disabled={state.pending}
        canUpload={canUpload}
        institutions={institutions}
      />
    </EditorForm>
  );
}

// Textos das páginas --------------------------------------------------------------------

export function PageContentEditor({
  page,
  initial,
  canUpload,
  loginNext = "/admin/textos-das-paginas",
}: {
  page: PageContentKey | "custom";
  initial: PageContentValues;
  canUpload: boolean;
  loginNext?: string;
}) {
  const state = useDraft(initial);
  const [errors, setErrors] = useState<PageContentFieldErrors>({});
  const save = usePartSave("page");

  const submit = () =>
    state.startTransition(async () => {
      const result = await save(state.draft);
      if (result.status === "success") {
        const values = result.content.page ? toPageValues(result.content.page) : state.draft;
        state.setSaved(values);
        state.setDraft(values);
        setErrors({});
        state.setMessage({ tone: "success", text: result.message });
      } else {
        setErrors((result.errors.fieldErrors ?? {}) as PageContentFieldErrors);
        state.setMessage(result.message);
      }
    });

  return (
    <EditorForm
      part="page"
      dirty={state.dirty}
      pending={state.pending}
      message={state.message}
      loginNext={loginNext}
      onSubmit={submit}
      onCancel={() => {
        state.cancel();
        setErrors({});
      }}
    >
      <PageContentFields
        page={page}
        values={state.draft}
        onChange={state.setDraft}
        errors={errors}
        disabled={state.pending}
        canUpload={canUpload}
      />
    </EditorForm>
  );
}

// Aparência -----------------------------------------------------------------------------

export function AppearanceEditor({ initial }: { initial: Appearance }) {
  const state = useDraft(initial);
  const [errors, setErrors] = useState<AppearanceFieldErrors>({});
  const save = usePartSave("appearance");

  const submit = () =>
    state.startTransition(async () => {
      const result = await save(state.draft);
      if (result.status === "success") {
        const values = sanitizeAppearance(result.content.appearance ?? state.draft);
        state.setSaved(values);
        state.setDraft(values);
        setErrors({});
        state.setMessage({ tone: "success", text: result.message });
      } else {
        setErrors((result.errors.fieldErrors ?? {}) as AppearanceFieldErrors);
        state.setMessage(result.message);
      }
    });

  return (
    <EditorForm
      part="appearance"
      dirty={state.dirty}
      pending={state.pending}
      message={state.message}
      loginNext="/admin/aparencia"
      onSubmit={submit}
      onCancel={() => {
        state.cancel();
        setErrors({});
      }}
    >
      <FormMessage tone="info">
        As mudanças valem para todo o site quando forem publicadas. Salve o rascunho e use o editor visual para ver o
        resultado antes de publicar.
      </FormMessage>
      <AppearanceFields values={state.draft} onChange={state.setDraft} errors={errors} disabled={state.pending} />
    </EditorForm>
  );
}
