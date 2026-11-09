"use client";

import { useRouter } from "next/navigation";
import { startTransition, useActionState, useEffect, useRef, useState, type ReactNode } from "react";

import { savePublication, type PublicationSaveState } from "@/lib/admin/publication-actions";
import {
  parsePublicationValues,
  publicationTextRules,
  type PublicationField,
  type PublicationFieldErrors,
  type PublicationFormValues,
} from "@/lib/admin/publications";
import { countCharacters, DOI_MAX_LENGTH, LINK_MAX_LENGTH, slugify } from "@/lib/admin/validation";
import type { ResearchLineOption } from "@/lib/queries/admin-content";
import type { ProjectOption } from "@/lib/queries/admin-publications";

import { Checkbox, describedBy, Field, FormSection, TextArea, TextInput } from "../form-controls";
import { ResearchLinePicker } from "../projects/research-line-picker";
import { RecordPicker } from "../record-picker";
import { buildFormData, FailureAction, SaveBar, useUnsavedChangesWarning } from "../save-bar";
import { SlugField } from "../slug-field";

type PublicationFormProps = {
  /** `null` = cadastro de nova publicação. */
  recordId: string | null;
  initialValues: PublicationFormValues;
  initialUpdatedAt: string | null;
  projects: ProjectOption[];
  researchLines: ResearchLineOption[];
};

const fieldOrder: PublicationField[] = [
  "title",
  "slug",
  "authors",
  "publication_year",
  "publication_venue",
  "doi",
  "external_url",
  "citation",
  "abstract",
  "project_ids",
  "research_line_ids",
  "is_published",
  "is_featured",
  "sort_order",
];

async function submit(state: PublicationSaveState, formData: FormData): Promise<PublicationSaveState> {
  try {
    return await savePublication(state, formData);
  } catch {
    return {
      status: "error",
      reason: "connection",
      message: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente; nada foi perdido.",
    };
  }
}

function focusFirstError(errors: PublicationFieldErrors) {
  const first = fieldOrder.find((field) => errors[field]);
  if (first) document.getElementById(first)?.focus();
}

function isDirty(a: PublicationFormValues, b: PublicationFormValues) {
  return (Object.keys(a) as PublicationField[]).some((field) => {
    const left = a[field];
    const right = b[field];
    return Array.isArray(left) && Array.isArray(right) ? left.join() !== right.join() : left !== right;
  });
}

const doiHint = "Opcional. Aceita 10.1234/abcd.5678 ou https://doi.org/10.1234/abcd.5678; é salvo sem o prefixo.";
const urlHint = "Opcional. Endereço completo começando com https:// (página da publicação ou PDF).";

/**
 * Cadastro e edição de publicação, com projetos e linhas relacionados. O
 * envio grava publicação e vínculos numa única transação (save_publication).
 */
export function PublicationForm({
  recordId,
  initialValues,
  initialUpdatedAt,
  projects,
  researchLines,
}: PublicationFormProps) {
  const router = useRouter();
  const isNew = recordId === null;
  const [values, setValues] = useState(initialValues);
  const [saved, setSaved] = useState({ values: initialValues, updatedAt: initialUpdatedAt ?? "" });
  const [errors, setErrors] = useState<PublicationFieldErrors>({});
  const [clientMessage, setClientMessage] = useState<string | null>(null);
  const [slugManual, setSlugManual] = useState(!isNew);
  const [rejected, setRejected] = useState<{ slug: string[]; doi: string[] }>({ slug: [], doi: [] });
  const [state, formAction, pending] = useActionState<PublicationSaveState, FormData>(submit, {
    status: "idle",
  });

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.status === "success") {
      setSaved({ values: state.values, updatedAt: state.updatedAt });
      setValues(state.values);
      setErrors({});
    } else if (state.status === "error") {
      setErrors(state.fieldErrors ?? {});
      if (state.reason === "duplicate-slug") {
        // Não reenviar o mesmo valor recusado pelo banco.
        setRejected((current) =>
          state.fieldErrors?.doi
            ? { ...current, doi: [...current.doi, values.doi.trim().toLowerCase()] }
            : { ...current, slug: [...current.slug, values.slug.trim().toLowerCase()] },
        );
      }
    }
  }

  const dirty = isDirty(values, isNew ? initialValues : saved.values);
  const submitting = useRef(false);

  useEffect(() => {
    if (state.status === "created") {
      router.replace(`/admin/publicacoes/${state.id}/editar?criado=${state.published ? "publicado" : "rascunho"}`);
      return;
    }
    submitting.current = false;
    if (state.status === "error" && state.fieldErrors) focusFirstError(state.fieldErrors);
  }, [state, router]);

  useUnsavedChangesWarning(dirty && state.status !== "created");

  function update<K extends PublicationField>(field: K, value: PublicationFormValues[K]) {
    setValues((current) => {
      const next = { ...current, [field]: value };
      if (field === "title" && !slugManual) next.slug = slugify(String(value));
      return next;
    });
    const touched: PublicationField[] = field === "title" && !slugManual ? [field, "slug"] : [field];
    if (touched.some((name) => errors[name])) {
      setErrors((current) => {
        const next = { ...current };
        for (const name of touched) delete next[name];
        return next;
      });
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || submitting.current) return;
    const { data, errors: found } = parsePublicationValues(values);
    if (rejected.slug.includes(values.slug.trim().toLowerCase())) {
      found.slug = "Este slug já está em uso por outra publicação. Escolha outro.";
    }
    if (data.doi && rejected.doi.includes(values.doi.trim().toLowerCase())) {
      found.doi = "Este DOI já está cadastrado em outra publicação.";
    }
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setClientMessage("Revise os campos destacados antes de salvar.");
      focusFirstError(found);
      return;
    }
    submitting.current = true;
    setClientMessage(null);
    const formData = buildFormData({ ...values, id: recordId ?? "", updated_at: saved.updatedAt });
    startTransition(() => formAction(formData));
  }

  function cancel() {
    setValues(isNew ? initialValues : saved.values);
    setSlugManual(!isNew);
    setErrors({});
    setClientMessage(null);
  }

  function textField(
    field: keyof typeof publicationTextRules,
    label: string,
    options: { hint?: ReactNode; rows?: number; lang?: string } = {},
  ) {
    const rule: { max: number; required?: boolean; multiline?: boolean } = publicationTextRules[field];
    const control = {
      id: field,
      name: field,
      value: values[field],
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        update(field, event.target.value),
      "aria-invalid": errors[field] ? true : undefined,
      "aria-describedby": describedBy(field, { hint: options.hint, error: errors[field] }),
      "aria-required": rule.required || undefined,
      // Textos científicos ficam no idioma original: sem correção automática.
      spellCheck: false,
      autoCapitalize: "off",
    };
    return (
      <Field
        id={field}
        label={label}
        hint={options.hint}
        error={errors[field]}
        required={rule.required}
        count={{ current: countCharacters(values[field]), max: rule.max }}
      >
        {rule.multiline ? <TextArea rows={options.rows ?? 4} {...control} /> : <TextInput type="text" {...control} />}
      </Field>
    );
  }

  const message =
    clientMessage !== null
      ? ({ tone: "error", text: clientMessage } as const)
      : state.status === "error"
        ? ({ tone: "error", text: state.message } as const)
        : state.status === "success" && !dirty
          ? ({ tone: "success", text: state.message } as const)
          : null;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
      <fieldset disabled={pending || state.status === "created"} className="flex min-w-0 flex-col gap-8">
        <FormSection id="identificacao" title="Identificação" description="Título, autores e ano, como na publicação original.">
          {textField("title", "Título", {
            hint: "No idioma original, com a capitalização da publicação.",
          })}
          <SlugField
            value={values.slug}
            title={values.title}
            error={errors.slug}
            publicPrefix={null}
            publishedSlug={null}
            label="Slug (identificador)"
            noPageHint="Identificador único, reservado para futuras páginas individuais (hoje a publicação aparece na lista /publicacoes)."
            onChange={(value, manual) => {
              setSlugManual(manual ? value !== "" : false);
              update("slug", value);
            }}
          />
          {textField("authors", "Autores", {
            hint: "Na ordem e grafia da publicação, no formato de citação (ex.: Silva, A.; Souza, B.).",
          })}
          <Field
            id="publication_year"
            label="Ano"
            hint="Opcional. Quatro dígitos, entre 1800 e 2100. Organiza a lista pública por ano."
            error={errors.publication_year}
          >
            <TextInput
              id="publication_year"
              name="publication_year"
              type="text"
              inputMode="numeric"
              maxLength={4}
              autoComplete="off"
              value={values.publication_year}
              onChange={(event) => update("publication_year", event.target.value)}
              aria-invalid={errors.publication_year ? true : undefined}
              aria-describedby={describedBy("publication_year", { hint: true, error: errors.publication_year })}
              className="sm:max-w-40"
            />
          </Field>
        </FormSection>

        <FormSection
          id="bibliograficos"
          title="Dados bibliográficos"
          description="Veículo, identificadores e referência completa."
        >
          {textField("publication_venue", "Periódico ou veículo", {
            hint: "Revista, anais de evento, livro ou outro veículo.",
          })}
          <Field id="doi" label="DOI" hint={doiHint} error={errors.doi}>
            <TextInput
              id="doi"
              name="doi"
              type="text"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={DOI_MAX_LENGTH + 30}
              placeholder="10.1234/abcd.5678"
              value={values.doi}
              onChange={(event) => update("doi", event.target.value)}
              aria-invalid={errors.doi ? true : undefined}
              aria-describedby={describedBy("doi", { hint: doiHint, error: errors.doi })}
            />
          </Field>
          <Field id="external_url" label="URL externa" hint={urlHint} error={errors.external_url}>
            <TextInput
              id="external_url"
              name="external_url"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              maxLength={LINK_MAX_LENGTH}
              placeholder="https://"
              value={values.external_url}
              onChange={(event) => update("external_url", event.target.value)}
              aria-invalid={errors.external_url ? true : undefined}
              aria-describedby={describedBy("external_url", { hint: urlHint, error: errors.external_url })}
            />
          </Field>
          {textField("citation", "Citação completa", {
            rows: 4,
            hint: "Referência como deve ser exibida, no formato escolhido pela equipe. Não é gerada automaticamente.",
          })}
        </FormSection>

        <FormSection id="conteudo" title="Conteúdo" description="Resumo da publicação.">
          {textField("abstract", "Resumo (abstract)", {
            rows: 8,
            hint: "No idioma original. Quebras de linha são mantidas.",
          })}
        </FormSection>

        <FormSection
          id="relacionamentos"
          title="Relacionamentos"
          description="Projetos e linhas de pesquisa relacionados. Ambos são opcionais e independentes."
        >
          <div className="flex flex-col gap-3">
            <h3 className="text-label font-semibold">Projetos relacionados</h3>
            <RecordPicker
              id="project_ids"
              legend="Projetos relacionados"
              options={projects}
              selected={values.project_ids}
              error={errors.project_ids}
              onChange={(selected) => update("project_ids", selected)}
              counter={{ none: "Nenhum projeto selecionado.", one: "projeto selecionado", many: "projetos selecionados" }}
              note="O vínculo aparece no site quando a publicação e o projeto estão publicados."
              searchLabel="Buscar projeto"
              emptyText="Nenhum projeto cadastrado ainda. Cadastre projetos em “Projetos”."
            />
          </div>
          <div className="flex flex-col gap-3">
            <h3 className="text-label font-semibold">Linhas de pesquisa relacionadas</h3>
            <ResearchLinePicker
              options={researchLines}
              selected={values.research_line_ids}
              error={errors.research_line_ids}
              onChange={(selected) => update("research_line_ids", selected)}
              note="O vínculo aparece no site quando a publicação e a linha estão publicadas."
            />
          </div>
        </FormSection>

        <FormSection
          id="publicacao"
          title="Publicação"
          description="Controle se a publicação aparece no site, se é destaque e a ordem de exibição."
        >
          <Checkbox
            id="is_published"
            name="is_published"
            checked={values.is_published}
            onChange={(event) => update("is_published", event.target.checked)}
            label="Publicar no site"
            description={
              values.is_published
                ? "Visível em /publicacoes assim que for salva."
                : "Rascunho: visível apenas na administração."
            }
          />
          <Checkbox
            id="is_featured"
            name="is_featured"
            checked={values.is_featured}
            onChange={(event) => update("is_featured", event.target.checked)}
            label="Destacar na homepage"
            description="A homepage mostra até cinco publicações publicadas: primeiro as destacadas, depois as mais recentes."
          />
          <Field
            id="sort_order"
            label="Ordem de exibição"
            hint="Número inteiro a partir de 0. Desempata publicações do mesmo ano (menores primeiro)."
            error={errors.sort_order}
          >
            <TextInput
              id="sort_order"
              name="sort_order"
              type="number"
              inputMode="numeric"
              min={0}
              max={999999}
              step={1}
              value={values.sort_order}
              onChange={(event) => update("sort_order", event.target.value)}
              aria-invalid={errors.sort_order ? true : undefined}
              aria-describedby={describedBy("sort_order", { hint: true, error: errors.sort_order })}
              className="sm:max-w-48"
            />
          </Field>
        </FormSection>
      </fieldset>

      <SaveBar
        message={message}
        messageAction={
          state.status === "error" && clientMessage === null ? (
            <FailureAction
              reason={state.reason}
              loginNext={isNew ? "/admin/publicacoes/novo" : `/admin/publicacoes/${recordId}/editar`}
            />
          ) : null
        }
        pending={pending || state.status === "created"}
        dirty={dirty}
        onCancel={cancel}
        submitLabel={isNew ? "Criar publicação" : "Salvar alterações"}
        idleLabel={isNew ? "Preencha os campos para criar a publicação" : "Nenhuma alteração pendente"}
      />
    </form>
  );
}
