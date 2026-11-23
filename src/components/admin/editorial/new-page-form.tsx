"use client";

import { useActionState, useState } from "react";

import { createCustomPage, type CustomPageFormState } from "@/lib/admin/editorial-actions";
import { countCharacters, slugify } from "@/lib/admin/validation";
import { PAGE_CONTENT_RULES } from "@/lib/site/page-content";

import { describedBy, Field, FormMessage, FormSection, TextArea, TextInput } from "../form-controls";
import { FailureAction, useUnsavedChangesWarning } from "../save-bar";
import { SlugField } from "../slug-field";
import { Button } from "@/components/ui/button";

type Values = { title: string; slug: string; description: string; seo_title: string; seo_description: string };
type FieldName = keyof Values;

const EMPTY: Values = { title: "", slug: "", description: "", seo_title: "", seo_description: "" };

async function submit(state: CustomPageFormState, formData: FormData): Promise<CustomPageFormState> {
  try {
    return await createCustomPage(state, formData);
  } catch (error) {
    // `redirect()` da Server Action chega aqui como exceção de navegação: repassa.
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if (typeof error === "object" && error !== null && "digest" in error) throw error;
    return {
      status: "error",
      reason: "connection",
      message: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente; nada foi perdido.",
    };
  }
}

/**
 * Criação de página personalizada: nasce como rascunho e só aparece no site
 * depois de publicada. Os blocos são montados na tela seguinte.
 */
export function NewPageForm() {
  const [values, setValues] = useState(EMPTY);
  const [slugManual, setSlugManual] = useState(false);
  const [state, formAction, pending] = useActionState<CustomPageFormState, FormData>(submit, { status: "idle" });
  const errors = state.status === "error" ? (state.fieldErrors ?? {}) : {};
  const dirty = (Object.keys(values) as FieldName[]).some((key) => values[key] !== "");
  useUnsavedChangesWarning(dirty && !pending);

  function update(field: FieldName, value: string) {
    setValues((current) => {
      const next = { ...current, [field]: value };
      if (field === "title" && !slugManual) next.slug = slugify(value).slice(0, 100);
      return next;
    });
  }

  function text(field: Exclude<FieldName, "slug">, label: string, options: { rows?: number; hint?: string; required?: boolean } = {}) {
    const max = PAGE_CONTENT_RULES[field].max;
    const error = errors[field];
    const common = {
      id: field,
      name: field,
      value: values[field],
      "aria-invalid": error ? true : undefined,
      "aria-required": options.required || undefined,
      "aria-describedby": describedBy(field, { hint: options.hint, error }),
    } as const;
    return (
      <Field
        id={field}
        label={label}
        required={options.required}
        hint={options.hint}
        error={error}
        count={{ current: countCharacters(values[field]), max }}
      >
        {options.rows ? (
          <TextArea {...common} rows={options.rows} onChange={(event) => update(field, event.target.value)} />
        ) : (
          <TextInput {...common} type="text" autoComplete="off" onChange={(event) => update(field, event.target.value)} />
        )}
      </Field>
    );
  }

  return (
    <form action={formAction} noValidate className="flex flex-col gap-6">
      <fieldset disabled={pending} className="flex min-w-0 flex-col gap-6">
        <FormSection id="pagina" title="Página" description="Nome, endereço e introdução exibidos no topo da página.">
          {text("title", "Título", { required: true })}
          <SlugField
            value={values.slug}
            title={values.title}
            error={errors.slug}
            publicPrefix="/paginas/"
            publishedSlug={null}
            label="Endereço"
            onChange={(value, manual) => {
              setSlugManual(manual ? value !== "" : false);
              setValues((current) => ({ ...current, slug: value }));
            }}
          />
          <p className="text-caption text-muted-foreground">
            O endereço pode ser alterado enquanto a página nunca tiver sido publicada. Depois da primeira
            publicação ele fica fixo, para não quebrar links.
          </p>
          {text("description", "Introdução", { rows: 3, hint: "Opcional. Texto curto abaixo do título." })}
        </FormSection>
        <FormSection id="seo" title="Buscadores e compartilhamento" description="Opcional. Vazio: usa o título e a introdução.">
          {text("seo_title", "Título para buscadores", {
            hint: "Aparece na aba do navegador, seguido de \"| GeoLogar\" (não é preciso digitar).",
          })}
          {text("seo_description", "Descrição para buscadores", { rows: 2 })}
        </FormSection>
      </fieldset>

      {state.status === "error" && (
        <FormMessage tone="error">
          {state.message}
          <FailureAction reason={state.reason} loginNext="/admin/paginas/nova" />
        </FormMessage>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-body-sm text-muted-foreground">A página será criada como rascunho, fora do site público.</p>
        <Button type="submit" disabled={pending}>
          {pending ? "Criando…" : "Criar página (rascunho)"}
        </Button>
      </div>
    </form>
  );
}
