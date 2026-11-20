"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";

import {
  saveAppearance,
  saveNavigation,
  savePageContent,
  savePageSections,
  savePillars,
} from "@/lib/admin/site-config-actions";
import type { Appearance, AppearanceFieldErrors } from "@/lib/site/appearance";
import type { ListVersion } from "@/lib/site/lists";
import type { NavDraft, NavFieldErrors, NavLocation } from "@/lib/site/navigation";
import type { PageContentFieldErrors, PageContentKey, PageContentValues } from "@/lib/site/page-content";
import type { PillarDraft, PillarFieldErrors } from "@/lib/site/pillars";
import type { SectionDraft, SectionFieldErrors, SectionPage } from "@/lib/site/sections";

import { FormMessage } from "../form-controls";
import { FailureAction, SaveBar, useUnsavedChangesWarning } from "../save-bar";
import { AppearanceFields } from "./appearance-fields";
import { NavigationFields } from "./navigation-fields";
import { PageContentFields } from "./page-content-fields";
import { PillarsFields } from "./pillars-fields";
import type { InstitutionOption } from "./section-settings-fields";
import { SectionsFields } from "./sections-fields";

/**
 * Telas do CMS para a configuração do site. Cada uma guarda o rascunho em
 * memória, avisa sobre alterações não salvas e grava pela mesma Server
 * Action usada pelo editor visual.
 */

type Message = { tone: "error" | "success"; text: string; reason?: string } | null;

const CONNECTION_ERROR =
  "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente; nada foi perdido.";

function same(a: unknown, b: unknown) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function EditorForm({
  children,
  dirty,
  pending,
  message,
  loginNext,
  onSubmit,
  onCancel,
  readOnly,
}: {
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
        />
      )}
    </form>
  );
}

/** Estado comum: rascunho, versão salva, retorno e envio. */
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

function failureMessage(result: { message: string; reason: string }): Message {
  return { tone: "error", text: result.message, reason: result.reason };
}

// Pilares -------------------------------------------------------------------------------

export function PillarsEditor({
  initial,
}: {
  initial: { items: PillarDraft[]; versions: ListVersion[] };
}) {
  const state = useDraft(initial.items);
  const [versions, setVersions] = useState(initial.versions);
  const [errors, setErrors] = useState<Record<string, PillarFieldErrors>>({});

  const submit = () =>
    state.startTransition(async () => {
      try {
        const result = await savePillars({ versions, items: state.draft });
        if (result.status === "success") {
          state.setSaved(result.items);
          state.setDraft(result.items);
          setVersions(result.versions);
          setErrors({});
          state.setMessage({ tone: "success", text: result.message });
        } else {
          setErrors(result.itemErrors ?? {});
          state.setMessage(failureMessage(result));
        }
      } catch {
        state.setMessage({ tone: "error", text: CONNECTION_ERROR });
      }
    });

  return (
    <EditorForm
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

export function NavigationEditor({
  location,
  initial,
}: {
  location: NavLocation;
  initial: { items: NavDraft[]; versions: ListVersion[] };
}) {
  const state = useDraft(initial.items);
  const [versions, setVersions] = useState(initial.versions);
  const [errors, setErrors] = useState<Record<string, NavFieldErrors>>({});

  const submit = () =>
    state.startTransition(async () => {
      try {
        const result = await saveNavigation({ location, versions, items: state.draft });
        if (result.status === "success") {
          state.setSaved(result.items);
          state.setDraft(result.items);
          setVersions(result.versions);
          setErrors({});
          state.setMessage({ tone: "success", text: result.message });
        } else {
          setErrors(result.itemErrors ?? {});
          state.setMessage(failureMessage(result));
        }
      } catch {
        state.setMessage({ tone: "error", text: CONNECTION_ERROR });
      }
    });

  return (
    <EditorForm
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
}: {
  page: SectionPage;
  initial: { items: SectionDraft[]; versions: ListVersion[] };
  institutions: InstitutionOption[];
  canUpload: boolean;
}) {
  const state = useDraft(initial.items);
  const [versions, setVersions] = useState(initial.versions);
  const [errors, setErrors] = useState<Record<string, SectionFieldErrors>>({});

  const submit = () =>
    state.startTransition(async () => {
      try {
        const result = await savePageSections({ page, versions, items: state.draft });
        if (result.status === "success") {
          state.setSaved(result.items);
          state.setDraft(result.items);
          setVersions(result.versions);
          setErrors({});
          state.setMessage({ tone: "success", text: result.message });
        } else {
          setErrors(result.itemErrors ?? {});
          state.setMessage(failureMessage(result));
        }
      } catch {
        state.setMessage({ tone: "error", text: CONNECTION_ERROR });
      }
    });

  return (
    <EditorForm
      dirty={state.dirty}
      pending={state.pending}
      message={state.message}
      loginNext="/admin/secoes"
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
}: {
  page: PageContentKey;
  initial: { values: PageContentValues; updatedAt: string };
  canUpload: boolean;
}) {
  const state = useDraft(initial.values);
  const [updatedAt, setUpdatedAt] = useState(initial.updatedAt);
  const [errors, setErrors] = useState<PageContentFieldErrors>({});

  const submit = () =>
    state.startTransition(async () => {
      try {
        const result = await savePageContent({ page, values: state.draft, updatedAt });
        if (result.status === "success") {
          state.setSaved(result.values);
          state.setDraft(result.values);
          setUpdatedAt(result.updatedAt);
          setErrors({});
          state.setMessage({ tone: "success", text: result.message });
        } else {
          setErrors(result.fieldErrors ?? {});
          state.setMessage(failureMessage(result));
        }
      } catch {
        state.setMessage({ tone: "error", text: CONNECTION_ERROR });
      }
    });

  return (
    <EditorForm
      dirty={state.dirty}
      pending={state.pending}
      message={state.message}
      loginNext="/admin/textos-das-paginas"
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

export function AppearanceEditor({ initial }: { initial: { values: Appearance; updatedAt: string } }) {
  const state = useDraft(initial.values);
  const [updatedAt, setUpdatedAt] = useState(initial.updatedAt);
  const [errors, setErrors] = useState<AppearanceFieldErrors>({});

  const submit = () =>
    state.startTransition(async () => {
      try {
        const result = await saveAppearance({ values: state.draft, updatedAt });
        if (result.status === "success") {
          state.setSaved(result.values);
          state.setDraft(result.values);
          setUpdatedAt(result.updatedAt);
          setErrors({});
          state.setMessage({ tone: "success", text: result.message });
        } else {
          setErrors(result.fieldErrors ?? {});
          state.setMessage(failureMessage(result));
        }
      } catch {
        state.setMessage({ tone: "error", text: CONNECTION_ERROR });
      }
    });

  return (
    <EditorForm
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
        As mudanças valem para todo o site assim que forem salvas. Use o editor visual para ver o resultado antes.
      </FormMessage>
      <AppearanceFields values={state.draft} onChange={state.setDraft} errors={errors} disabled={state.pending} />
    </EditorForm>
  );
}
