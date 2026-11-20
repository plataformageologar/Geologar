"use client";

import { countCharacters } from "@/lib/admin/validation";
import {
  PAGE_CONTENT_FALLBACK_HINTS,
  PAGE_CONTENT_RULES,
  type PageContentFieldErrors,
  type PageContentKey,
  type PageContentValues,
} from "@/lib/site/page-content";

import { describedBy, Field, TextArea, TextInput } from "../form-controls";
import { MediaField } from "../media/media-field";

const LABELS = {
  eyebrow: "Sobretítulo",
  title: "Título da página",
  description: "Introdução",
  seo_title: "Título para buscadores e abas",
  seo_description: "Descrição para buscadores",
} as const;

/** Título, introdução e metadados de uma página interna. */
export function PageContentFields({
  page,
  values,
  onChange,
  errors = {},
  disabled,
  canUpload,
  showSeo = true,
}: {
  page: PageContentKey;
  values: PageContentValues;
  onChange: (values: PageContentValues) => void;
  errors?: PageContentFieldErrors;
  disabled?: boolean;
  canUpload: boolean;
  showSeo?: boolean;
}) {
  const hints = PAGE_CONTENT_FALLBACK_HINTS[page] ?? {};
  const field = (key: keyof typeof LABELS, extraHint?: string) => {
    const id = `pagina-${page}-${key}`;
    const rule: { max: number; multiline?: boolean } = PAGE_CONTENT_RULES[key];
    const hint = hints[key] ?? extraHint;
    const props = {
      id,
      value: values[key],
      disabled,
      "aria-invalid": Boolean(errors[key]),
      "aria-describedby": describedBy(id, { hint, error: errors[key] }),
    };
    return (
      <Field
        id={id}
        label={LABELS[key]}
        hint={hint}
        error={errors[key]}
        count={{ current: countCharacters(values[key]), max: rule.max }}
      >
        {rule.multiline ? (
          <TextArea {...props} rows={3} onChange={(event) => onChange({ ...values, [key]: event.target.value })} />
        ) : (
          <TextInput {...props} onChange={(event) => onChange({ ...values, [key]: event.target.value })} />
        )}
      </Field>
    );
  };

  return (
    <div className="flex flex-col gap-5">
      {field("eyebrow", "Pequeno texto acima do título. Opcional.")}
      {field("title")}
      {field("description")}
      {showSeo && (
        <fieldset className="flex flex-col gap-5 rounded-xl border border-border p-4">
          <legend className="px-1 text-label">Buscadores e compartilhamento</legend>
          {field("seo_title", "Aparece na aba do navegador, seguido de \"| GeoLogar\".")}
          {field("seo_description", "Resumo exibido por buscadores (até 200 caracteres).")}
          <MediaField
            id={`pagina-${page}-seo_image_path`}
            label="Imagem de compartilhamento"
            hint="Usada quando o link da página é compartilhado em redes sociais. Opcional."
            value={values.seo_image_path}
            onChange={(value) => onChange({ ...values, seo_image_path: value })}
            error={errors.seo_image_path}
            emptyText="Nenhuma imagem: as redes usam o padrão do site."
            aspect="aspect-[1200/630] max-w-md"
            canUpload={canUpload}
            disabled={disabled}
          />
        </fieldset>
      )}
    </div>
  );
}
