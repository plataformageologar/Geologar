"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImageIcon } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState, type ReactNode } from "react";

import { saveProject, type ProjectSaveState } from "@/lib/admin/project-actions";
import {
  parseProjectValues,
  projectStatusOptions,
  projectTextRules,
  type ProjectField,
  type ProjectFieldErrors,
  type ProjectFormValues,
} from "@/lib/admin/projects";
import { countCharacters, LINK_MAX_LENGTH, slugify } from "@/lib/admin/validation";
import type { ResearchLineOption } from "@/lib/queries/admin-content";

import { Checkbox, describedBy, Field, FormSection, Select, TextArea, TextInput } from "../form-controls";
import { buildFormData, FailureAction, SaveBar, useUnsavedChangesWarning } from "../save-bar";
import { SlugField } from "../slug-field";
import { ResearchLinePicker } from "./research-line-picker";

type ProjectFormProps = {
  /** `null` = cadastro de novo projeto. */
  recordId: string | null;
  initialValues: ProjectFormValues;
  initialUpdatedAt: string | null;
  hasImage: boolean;
  imageSrc: string | null;
  researchLines: ResearchLineOption[];
};

const fieldOrder: ProjectField[] = [
  "title",
  "slug",
  "short_description",
  "description",
  "project_status",
  "start_date",
  "end_date",
  "coordination",
  "funding",
  "result_or_contribution",
  "research_line_ids",
  "is_published",
  "is_featured",
  "sort_order",
  "external_url",
  "image_alt",
];

async function submit(state: ProjectSaveState, formData: FormData): Promise<ProjectSaveState> {
  try {
    return await saveProject(state, formData);
  } catch {
    return {
      status: "error",
      reason: "connection",
      message: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente; nada foi perdido.",
    };
  }
}

function focusFirstError(errors: ProjectFieldErrors) {
  const first = fieldOrder.find((field) => errors[field]);
  if (first) document.getElementById(first)?.focus();
}

function isDirty(a: ProjectFormValues, b: ProjectFormValues) {
  return (Object.keys(a) as ProjectField[]).some((field) =>
    field === "research_line_ids"
      ? a.research_line_ids.join() !== b.research_line_ids.join()
      : a[field] !== b[field],
  );
}

const linkHint = "Endereço completo começando com https:// (ex.: página do projeto na instituição).";

/**
 * Cadastro e edição de projeto, com as linhas de pesquisa relacionadas. O
 * envio grava projeto e vínculos numa única transação (save_project).
 */
export function ProjectForm({
  recordId,
  initialValues,
  initialUpdatedAt,
  hasImage,
  imageSrc,
  researchLines,
}: ProjectFormProps) {
  const router = useRouter();
  const isNew = recordId === null;
  const [values, setValues] = useState(initialValues);
  const [saved, setSaved] = useState({ values: initialValues, updatedAt: initialUpdatedAt ?? "" });
  const [errors, setErrors] = useState<ProjectFieldErrors>({});
  const [clientMessage, setClientMessage] = useState<string | null>(null);
  const [slugManual, setSlugManual] = useState(!isNew);
  const [rejectedSlugs, setRejectedSlugs] = useState<string[]>([]);
  const [state, formAction, pending] = useActionState<ProjectSaveState, FormData>(submit, {
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
        setRejectedSlugs((current) => [...current, values.slug.trim().toLowerCase()]);
      }
    }
  }

  const dirty = isDirty(values, isNew ? initialValues : saved.values);
  const submitting = useRef(false);

  useEffect(() => {
    if (state.status === "created") {
      router.replace(`/admin/projetos/${state.id}/editar?criado=${state.published ? "publicado" : "rascunho"}`);
      return;
    }
    submitting.current = false;
    if (state.status === "error" && state.fieldErrors) focusFirstError(state.fieldErrors);
  }, [state, router]);

  useUnsavedChangesWarning(dirty && state.status !== "created");

  function update<K extends ProjectField>(field: K, value: ProjectFormValues[K]) {
    setValues((current) => {
      const next = { ...current, [field]: value };
      if (field === "title" && !slugManual) next.slug = slugify(String(value));
      return next;
    });
    const touched: ProjectField[] = field === "title" && !slugManual ? [field, "slug"] : [field];
    // Datas são validadas em conjunto (término ≥ início).
    if (field === "start_date") touched.push("end_date");
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
    const { errors: found } = parseProjectValues(values, { hasImage });
    if (rejectedSlugs.includes(values.slug.trim().toLowerCase())) {
      found.slug = "Este slug já está em uso por outro projeto. Escolha outro.";
    }
    if (Object.keys(found).length > 0) {
      setErrors(found);
      setClientMessage("Revise os campos destacados antes de salvar.");
      focusFirstError(found);
      return;
    }
    submitting.current = true;
    setClientMessage(null);
    const data = buildFormData({ ...values, id: recordId ?? "", updated_at: saved.updatedAt });
    startTransition(() => formAction(data));
  }

  function cancel() {
    setValues(isNew ? initialValues : saved.values);
    setSlugManual(!isNew);
    setErrors({});
    setClientMessage(null);
  }

  function textField(
    field: keyof typeof projectTextRules,
    label: string,
    options: { hint?: ReactNode; rows?: number; required?: boolean } = {},
  ) {
    const rule: { max: number; required?: boolean; multiline?: boolean } = projectTextRules[field];
    const required = rule.required || options.required;
    const control = {
      id: field,
      name: field,
      value: values[field],
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        update(field, event.target.value),
      "aria-invalid": errors[field] ? true : undefined,
      "aria-describedby": describedBy(field, { hint: options.hint, error: errors[field] }),
      "aria-required": required || undefined,
    };
    return (
      <Field
        id={field}
        label={label}
        hint={options.hint}
        error={errors[field]}
        required={required}
        count={{ current: countCharacters(values[field]), max: rule.max }}
      >
        {rule.multiline ? <TextArea rows={options.rows ?? 4} {...control} /> : <TextInput type="text" {...control} />}
      </Field>
    );
  }

  function dateField(field: "start_date" | "end_date", label: string, hint: string) {
    return (
      <Field id={field} label={label} hint={hint} error={errors[field]}>
        <TextInput
          id={field}
          name={field}
          type="date"
          min="1900-01-01"
          max="2100-12-31"
          value={values[field]}
          onChange={(event) => update(field, event.target.value)}
          aria-invalid={errors[field] ? true : undefined}
          aria-describedby={describedBy(field, { hint, error: errors[field] })}
        />
      </Field>
    );
  }

  const publishedSlug = !isNew && saved.values.is_published ? saved.values.slug : null;
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
        <FormSection id="informacoes" title="Informações gerais" description="Nome, endereço e textos do projeto.">
          {textField("title", "Título")}
          <SlugField
            value={values.slug}
            title={values.title}
            error={errors.slug}
            publicPrefix="/projetos/"
            publishedSlug={publishedSlug}
            onChange={(value, manual) => {
              setSlugManual(manual ? value !== "" : false);
              update("slug", value);
            }}
          />
          {textField("short_description", "Descrição curta", {
            rows: 3,
            required: values.is_published,
            hint: "Texto dos cards em /projetos e na homepage. Obrigatória para publicar.",
          })}
          {textField("description", "Descrição completa", {
            rows: 8,
            hint: "Apresentada na página do projeto. Quebras de linha são mantidas.",
          })}
        </FormSection>

        <FormSection
          id="tecnicas"
          title="Informações técnicas"
          description="Situação, período e dados de execução do projeto."
        >
          <Field
            id="project_status"
            label="Situação do projeto"
            required
            hint="Independe da publicação: um projeto concluído pode estar publicado ou em rascunho."
            error={errors.project_status}
          >
            <Select
              id="project_status"
              name="project_status"
              value={values.project_status}
              onChange={(event) => update("project_status", event.target.value)}
              aria-invalid={errors.project_status ? true : undefined}
              aria-required
              aria-describedby={describedBy("project_status", { hint: true, error: errors.project_status })}
            >
              <option value="" disabled>
                Selecione…
              </option>
              {projectStatusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </Field>
          <div className="grid gap-6 md:grid-cols-2">
            {dateField("start_date", "Data de início", "Opcional.")}
            {dateField(
              "end_date",
              "Data de término",
              values.project_status === "ongoing"
                ? "Opcional; deixe em branco se ainda não houver previsão."
                : "Opcional; igual ou posterior ao início.",
            )}
          </div>
          {textField("coordination", "Coordenação", {
            rows: 3,
            hint: "Pessoas e instituições responsáveis, como devem aparecer no site.",
          })}
          {textField("funding", "Financiamento", { rows: 3, hint: "Agências, editais ou parceiros financiadores." })}
          {textField("result_or_contribution", "Resultados ou contribuições", {
            rows: 6,
            hint: "Principais resultados científicos e impactos. Quebras de linha são mantidas.",
          })}
        </FormSection>

        <FormSection
          id="linhas"
          title="Linhas de pesquisa"
          description="Selecione uma ou mais linhas relacionadas ao projeto."
        >
          <ResearchLinePicker
            options={researchLines}
            selected={values.research_line_ids}
            error={errors.research_line_ids}
            onChange={(selected) => update("research_line_ids", selected)}
          />
        </FormSection>

        <FormSection
          id="publicacao"
          title="Publicação"
          description="Controle se o projeto aparece no site, se é destaque e a ordem de exibição."
        >
          <Checkbox
            id="is_published"
            name="is_published"
            checked={values.is_published}
            onChange={(event) => update("is_published", event.target.checked)}
            label="Publicar no site"
            description={
              values.is_published
                ? "Visível em /projetos (e na página das linhas publicadas) assim que for salvo."
                : "Rascunho: visível apenas na administração."
            }
          />
          <Checkbox
            id="is_featured"
            name="is_featured"
            checked={values.is_featured}
            onChange={(event) => update("is_featured", event.target.checked)}
            label="Destacar na homepage"
            description="A homepage mostra até três projetos publicados em destaque, pela ordem de exibição."
          />
          <Field
            id="sort_order"
            label="Ordem de exibição"
            hint="Número inteiro a partir de 0. Valores menores aparecem primeiro."
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

        <FormSection id="recursos" title="Recursos externos" description="Link para mais informações fora do portal.">
          <Field id="external_url" label="URL externa" hint={linkHint} error={errors.external_url}>
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
              aria-describedby={describedBy("external_url", { hint: linkHint, error: errors.external_url })}
            />
          </Field>
        </FormSection>

        <FormSection
          id="imagem"
          title="Imagem"
          description="O envio de imagens estará disponível na biblioteca de mídia (próxima etapa)."
        >
          {imageSrc ? (
            <div className="relative aspect-[16/7] overflow-hidden rounded-xl border border-border bg-surface-muted">
              <Image src={imageSrc} alt="" fill sizes="(min-width: 768px) 42rem, 100vw" className="object-cover" />
            </div>
          ) : (
            <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-surface-muted/60 p-4 text-body-sm text-muted-foreground">
              <ImageIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              <p>
                {hasImage
                  ? "Há uma imagem cadastrada, mas a pré-visualização ainda não está disponível."
                  : "Nenhuma imagem cadastrada: os cards usam a ilustração padrão do portal."}
              </p>
            </div>
          )}
          {hasImage &&
            textField("image_alt", "Texto alternativo da imagem", {
              required: true,
              hint: "Descreva a imagem para quem usa leitores de tela.",
            })}
        </FormSection>
      </fieldset>

      <SaveBar
        message={message}
        messageAction={
          state.status === "error" && clientMessage === null ? (
            <FailureAction
              reason={state.reason}
              loginNext={isNew ? "/admin/projetos/novo" : `/admin/projetos/${recordId}/editar`}
            />
          ) : null
        }
        pending={pending || state.status === "created"}
        dirty={dirty}
        onCancel={cancel}
        submitLabel={isNew ? "Criar projeto" : "Salvar alterações"}
        idleLabel={isNew ? "Preencha os campos para criar o projeto" : "Nenhuma alteração pendente"}
      />
    </form>
  );
}
