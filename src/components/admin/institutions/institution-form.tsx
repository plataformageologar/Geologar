"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ImageIcon } from "lucide-react";
import { startTransition, useActionState, useEffect, useRef, useState, type ReactNode } from "react";

import { saveInstitution, type InstitutionSaveState } from "@/lib/admin/institution-actions";
import {
  institutionTextRules,
  parseInstitutionValues,
  type InstitutionField,
  type InstitutionFieldErrors,
  type InstitutionFormValues,
} from "@/lib/admin/institutions";
import { countCharacters, LINK_MAX_LENGTH } from "@/lib/admin/validation";

import { Checkbox, describedBy, Field, FormMessage, FormSection, Select, TextArea, TextInput } from "../form-controls";
import { buildFormData, FailureAction, SaveBar, useUnsavedChangesWarning } from "../save-bar";

export type CategoryOption = { id: string; name: string };

type InstitutionFormProps = {
  /** `null` = cadastro de nova instituição. */
  recordId: string | null;
  initialValues: InstitutionFormValues;
  initialUpdatedAt: string | null;
  categories: CategoryOption[];
  hasLogo: boolean;
  logoSrc: string | null;
  /** Somente administradores gerenciam categorias. */
  canManageCategories: boolean;
};

const fieldOrder: InstitutionField[] = [
  "name",
  "acronym",
  "category_id",
  "description",
  "city",
  "state",
  "country",
  "website_url",
  "is_published",
  "is_featured",
  "sort_order",
  "logo_alt",
];

async function submit(state: InstitutionSaveState, formData: FormData): Promise<InstitutionSaveState> {
  try {
    return await saveInstitution(state, formData);
  } catch {
    return {
      status: "error",
      reason: "connection",
      message: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente; nada foi perdido.",
    };
  }
}

function focusFirstError(errors: InstitutionFieldErrors) {
  const first = fieldOrder.find((field) => errors[field]);
  if (first) document.getElementById(first)?.focus();
}

function isDirty(a: InstitutionFormValues, b: InstitutionFormValues) {
  return (Object.keys(a) as InstitutionField[]).some((field) => a[field] !== b[field]);
}

const websiteHint = "Opcional. Endereço completo começando com https://.";

/** Cadastro e edição de instituição parceira. */
export function InstitutionForm({
  recordId,
  initialValues,
  initialUpdatedAt,
  categories,
  hasLogo,
  logoSrc,
  canManageCategories,
}: InstitutionFormProps) {
  const router = useRouter();
  const isNew = recordId === null;
  const [values, setValues] = useState(initialValues);
  const [saved, setSaved] = useState({ values: initialValues, updatedAt: initialUpdatedAt ?? "" });
  const [errors, setErrors] = useState<InstitutionFieldErrors>({});
  const [clientMessage, setClientMessage] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState<InstitutionSaveState, FormData>(submit, {
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
    }
  }

  const dirty = isDirty(values, isNew ? initialValues : saved.values);
  const submitting = useRef(false);

  useEffect(() => {
    if (state.status === "created") {
      router.replace(`/admin/instituicoes/${state.id}/editar?criado=${state.published ? "publicado" : "rascunho"}`);
      return;
    }
    submitting.current = false;
    if (state.status === "error" && state.fieldErrors) focusFirstError(state.fieldErrors);
  }, [state, router]);

  useUnsavedChangesWarning(dirty && state.status !== "created");

  function update<K extends InstitutionField>(field: K, value: InstitutionFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || submitting.current) return;
    const { errors: found } = parseInstitutionValues(values, { hasLogo });
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
    setErrors({});
    setClientMessage(null);
  }

  function textField(
    field: keyof typeof institutionTextRules,
    label: string,
    options: { hint?: ReactNode; rows?: number; autoComplete?: string; className?: string } = {},
  ) {
    const rule: { max: number; required?: boolean; multiline?: boolean } = institutionTextRules[field];
    const required = rule.required || (field === "logo_alt" && hasLogo);
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
        {rule.multiline ? (
          <TextArea rows={options.rows ?? 4} {...control} />
        ) : (
          <TextInput type="text" autoComplete={options.autoComplete ?? "off"} className={options.className} {...control} />
        )}
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

  const categoryHint = canManageCategories ? (
    <>
      Agrupa as instituições na página pública.{" "}
      <Link href="/admin/instituicoes/categorias" className="text-primary underline underline-offset-4">
        Gerenciar categorias
      </Link>
      .
    </>
  ) : (
    "Agrupa as instituições na página pública. Novas categorias são criadas por administradores."
  );

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
      {categories.length === 0 && (
        <FormMessage tone="warning">
          Nenhuma categoria cadastrada: toda instituição precisa de uma categoria.{" "}
          {canManageCategories ? (
            <Link href="/admin/instituicoes/categorias" className="font-semibold underline underline-offset-4">
              Cadastre uma categoria
            </Link>
          ) : (
            "Peça a um administrador para cadastrar uma categoria"
          )}{" "}
          antes de continuar.
        </FormMessage>
      )}

      <fieldset disabled={pending || state.status === "created"} className="flex min-w-0 flex-col gap-8">
        <FormSection id="identificacao" title="Identificação" description="Nome oficial, sigla, categoria e apresentação.">
          {textField("name", "Nome", { hint: "Nome oficial completo, como a instituição se apresenta." })}
          {textField("acronym", "Sigla", { hint: "Opcional (ex.: UFPR).", className: "sm:max-w-60" })}
          <Field id="category_id" label="Categoria" required hint={categoryHint} error={errors.category_id}>
            <Select
              id="category_id"
              name="category_id"
              value={values.category_id}
              onChange={(event) => update("category_id", event.target.value)}
              aria-invalid={errors.category_id ? true : undefined}
              aria-required
              aria-describedby={describedBy("category_id", { hint: categoryHint, error: errors.category_id })}
            >
              <option value="">Selecione…</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </Select>
          </Field>
          {textField("description", "Descrição", {
            rows: 5,
            hint: "Opcional. Breve apresentação da instituição e de sua participação na rede.",
          })}
        </FormSection>

        <FormSection id="localizacao" title="Localização" description="Todos os campos são opcionais.">
          <div className="grid gap-6 md:grid-cols-3">
            {textField("city", "Cidade", { autoComplete: "address-level2" })}
            {textField("state", "Estado", { autoComplete: "address-level1" })}
            {textField("country", "País", { autoComplete: "country-name" })}
          </div>
        </FormSection>

        <FormSection id="website" title="Website" description="Página oficial da instituição.">
          <Field id="website_url" label="Endereço do website" hint={websiteHint} error={errors.website_url}>
            <TextInput
              id="website_url"
              name="website_url"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              maxLength={LINK_MAX_LENGTH}
              placeholder="https://"
              value={values.website_url}
              onChange={(event) => update("website_url", event.target.value)}
              aria-invalid={errors.website_url ? true : undefined}
              aria-describedby={describedBy("website_url", { hint: websiteHint, error: errors.website_url })}
            />
          </Field>
        </FormSection>

        <FormSection
          id="publicacao"
          title="Publicação"
          description="Controle se a instituição aparece no site, se é destaque e a ordem de exibição."
        >
          <Checkbox
            id="is_published"
            name="is_published"
            checked={values.is_published}
            onChange={(event) => update("is_published", event.target.checked)}
            label="Publicar no site"
            description={
              values.is_published
                ? "Visível em /instituicoes assim que for salva."
                : "Rascunho: visível apenas na administração."
            }
          />
          <Checkbox
            id="is_featured"
            name="is_featured"
            checked={values.is_featured}
            onChange={(event) => update("is_featured", event.target.checked)}
            label="Destacar na homepage"
            description="Instituições destacadas aparecem primeiro na seção de instituições da homepage."
          />
          <Field
            id="sort_order"
            label="Ordem de exibição"
            hint="Número inteiro a partir de 0. Menores aparecem primeiro dentro da categoria."
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

        <FormSection
          id="identidade-visual"
          title="Identidade visual"
          description="Logotipo oficial da instituição, exibido sem alterações."
        >
          <div className="flex flex-col gap-3">
            <p className="text-label">Logotipo</p>
            {logoSrc ? (
              <div className="relative h-32 w-full max-w-sm overflow-hidden rounded-xl border border-border bg-white p-4">
                <Image src={logoSrc} alt="" fill sizes="24rem" className="object-contain p-4" />
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-surface-muted/60 p-4 text-body-sm text-muted-foreground">
                <ImageIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                <p>
                  {hasLogo
                    ? "Há um logotipo cadastrado, mas a pré-visualização ainda não está disponível."
                    : "Nenhum logotipo cadastrado: o site mostra o nome (ou a sigla) da instituição."}
                </p>
              </div>
            )}
            <p className="text-caption text-muted-foreground">
              O envio de logotipos chega com a biblioteca de mídia, em uma próxima etapa.
            </p>
            {hasLogo &&
              textField("logo_alt", "Texto alternativo do logotipo", {
                hint: "Obrigatório quando há logotipo. Normalmente “Logotipo da/do” seguido do nome.",
              })}
          </div>
        </FormSection>
      </fieldset>

      <SaveBar
        message={message}
        messageAction={
          state.status === "error" && clientMessage === null ? (
            <FailureAction
              reason={state.reason}
              loginNext={isNew ? "/admin/instituicoes/novo" : `/admin/instituicoes/${recordId}/editar`}
            />
          ) : null
        }
        pending={pending || state.status === "created"}
        dirty={dirty}
        onCancel={cancel}
        submitLabel={isNew ? "Criar instituição" : "Salvar alterações"}
        idleLabel={isNew ? "Preencha os campos para criar a instituição" : "Nenhuma alteração pendente"}
      />
    </form>
  );
}
