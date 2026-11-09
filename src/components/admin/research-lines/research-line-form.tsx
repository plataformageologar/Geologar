"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { ImageIcon } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState, type ReactNode } from "react";

import {
  saveResearchLine,
  type ResearchLineSaveState,
} from "@/lib/admin/research-line-actions";
import {
  parseResearchLineValues,
  researchLineTextRules,
  slugify,
  type ResearchLineField,
  type ResearchLineFieldErrors,
  type ResearchLineFormValues,
} from "@/lib/admin/research-lines";
import { countCharacters } from "@/lib/admin/validation";

import { Checkbox, describedBy, Field, FormSection, TextArea, TextInput } from "../form-controls";
import { buildFormData, FailureAction, SaveBar, useUnsavedChangesWarning } from "../save-bar";
import { SlugField } from "../slug-field";

type ResearchLineFormProps = {
  /** `null` = cadastro de nova linha. */
  recordId: string | null;
  initialValues: ResearchLineFormValues;
  /** Versão carregada (edição simultânea); `null` no cadastro. */
  initialUpdatedAt: string | null;
  hasImage: boolean;
  imageSrc: string | null;
};

const fieldOrder: ResearchLineField[] = [
  "title",
  "slug",
  "short_description",
  "description",
  "image_alt",
  "sort_order",
  "is_featured",
  "is_published",
];

async function submit(state: ResearchLineSaveState, formData: FormData): Promise<ResearchLineSaveState> {
  try {
    return await saveResearchLine(state, formData);
  } catch {
    return {
      status: "error",
      reason: "connection",
      message: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente; nada foi perdido.",
    };
  }
}

function focusFirstError(errors: ResearchLineFieldErrors) {
  const first = fieldOrder.find((field) => errors[field]);
  if (first) document.getElementById(first)?.focus();
}

function isDirty(a: ResearchLineFormValues, b: ResearchLineFormValues) {
  return (Object.keys(a) as ResearchLineField[]).some((field) => a[field] !== b[field]);
}

/**
 * Cadastro e edição de linha de pesquisa. Mesmo padrão da homepage: valores
 * no estado do componente (nada se perde em caso de erro), validação imediata
 * aqui e definitiva na Server Action, versão para detectar edição simultânea.
 */
export function ResearchLineForm({
  recordId,
  initialValues,
  initialUpdatedAt,
  hasImage,
  imageSrc,
}: ResearchLineFormProps) {
  const router = useRouter();
  const isNew = recordId === null;
  const [values, setValues] = useState(initialValues);
  const [saved, setSaved] = useState({ values: initialValues, updatedAt: initialUpdatedAt ?? "" });
  const [errors, setErrors] = useState<ResearchLineFieldErrors>({});
  const [clientMessage, setClientMessage] = useState<string | null>(null);
  // Slug sugerido a partir do título até o editor alterá-lo manualmente.
  const [slugManual, setSlugManual] = useState(!isNew);
  // Slugs já recusados pelo banco (não reenviar o mesmo valor).
  const [rejectedSlugs, setRejectedSlugs] = useState<string[]>([]);
  const [state, formAction, pending] = useActionState<ResearchLineSaveState, FormData>(submit, {
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
    } else if (state.status === "created") {
      setSaved((current) => ({ ...current, values }));
    }
  }

  const dirty = isNew ? isDirty(values, initialValues) : isDirty(values, saved.values);
  const submitting = useRef(false);

  useEffect(() => {
    if (state.status === "created") {
      // Mantém a trava: a página de edição do novo registro assume daqui.
      router.replace(`/admin/linhas-de-pesquisa/${state.id}/editar?criado=${state.published ? "publicado" : "rascunho"}`);
      return;
    }
    submitting.current = false;
    if (state.status === "error" && state.fieldErrors) focusFirstError(state.fieldErrors);
  }, [state, router]);

  useUnsavedChangesWarning(dirty && state.status !== "created");

  function update<K extends ResearchLineField>(field: K, value: ResearchLineFormValues[K]) {
    setValues((current) => {
      const next = { ...current, [field]: value };
      if (field === "title" && !slugManual) next.slug = slugify(String(value));
      return next;
    });
    const touched: ResearchLineField[] = field === "title" && !slugManual ? [field, "slug"] : [field];
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
    const { errors: found } = parseResearchLineValues(values, { hasImage });
    if (rejectedSlugs.includes(values.slug.trim().toLowerCase())) {
      found.slug = "Este slug já está em uso por outra linha de pesquisa. Escolha outro.";
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
    field: keyof typeof researchLineTextRules,
    label: string,
    options: { hint?: ReactNode; rows?: number; required?: boolean } = {},
  ) {
    const rule: { max: number; required?: boolean; multiline?: boolean } = researchLineTextRules[field];
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
        <FormSection
          id="informacoes"
          title="Informações gerais"
          description="Título, endereço e textos apresentados em /pesquisa e na página da linha."
        >
          {textField("title", "Título")}
          <SlugField
            value={values.slug}
            title={values.title}
            error={errors.slug}
            publicPrefix="/pesquisa/"
            publishedSlug={publishedSlug}
            onChange={(value, manual) => {
              setSlugManual(manual ? value !== "" : false);
              update("slug", value);
            }}
          />
          {textField("short_description", "Descrição curta", {
            rows: 3,
            required: values.is_published,
            hint: "Texto dos cards da homepage e de /pesquisa. Obrigatória para publicar.",
          })}
          {textField("description", "Descrição completa", {
            rows: 8,
            hint: "Apresentada na página da linha de pesquisa. Quebras de linha são mantidas.",
          })}
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

        <FormSection
          id="publicacao"
          title="Publicação e ordem"
          description="Controle se a linha aparece no site, se é destaque e a ordem de exibição."
        >
          <Checkbox
            id="is_published"
            name="is_published"
            checked={values.is_published}
            onChange={(event) => update("is_published", event.target.checked)}
            label="Publicar no site"
            description={
              values.is_published
                ? "Visível em /pesquisa e na homepage assim que for salva."
                : "Rascunho: visível apenas na administração."
            }
          />
          <Checkbox
            id="is_featured"
            name="is_featured"
            checked={values.is_featured}
            onChange={(event) => update("is_featured", event.target.checked)}
            label="Destacar na homepage"
            description="Linhas em destaque aparecem primeiro na homepage, desde que estejam publicadas."
          />
          <Field
            id="sort_order"
            label="Ordem de exibição"
            hint="Número inteiro a partir de 0. Valores menores aparecem primeiro; em empate, ordem alfabética."
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
              loginNext={isNew ? "/admin/linhas-de-pesquisa/novo" : `/admin/linhas-de-pesquisa/${recordId}/editar`}
            />
          ) : null
        }
        pending={pending || state.status === "created"}
        dirty={dirty}
        onCancel={cancel}
        submitLabel={isNew ? "Criar linha de pesquisa" : "Salvar alterações"}
        idleLabel={isNew ? "Preencha os campos para criar a linha" : "Nenhuma alteração pendente"}
      />
    </form>
  );
}
