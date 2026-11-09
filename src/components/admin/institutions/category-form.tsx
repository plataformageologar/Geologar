"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";

import { saveCategory, type CategorySaveState } from "@/lib/admin/institution-actions";
import {
  categoryTextRules,
  emptyCategoryValues,
  parseCategoryValues,
  type CategoryField,
  type CategoryFieldErrors,
  type CategoryFormValues,
} from "@/lib/admin/institutions";
import { countCharacters, slugify } from "@/lib/admin/validation";

import { describedBy, Field, FormSection, TextArea, TextInput } from "../form-controls";
import { buildFormData, FailureAction, SaveBar, useUnsavedChangesWarning } from "../save-bar";
import { SlugField } from "../slug-field";

type CategoryFormProps = {
  /** `null` = nova categoria. */
  recordId: string | null;
  initialValues: CategoryFormValues;
  initialUpdatedAt: string | null;
};

const fieldOrder: CategoryField[] = ["name", "slug", "description", "sort_order"];

async function submit(state: CategorySaveState, formData: FormData): Promise<CategorySaveState> {
  try {
    return await saveCategory(state, formData);
  } catch {
    return {
      status: "error",
      reason: "connection",
      message: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente; nada foi perdido.",
    };
  }
}

function focusFirstError(errors: CategoryFieldErrors) {
  const first = fieldOrder.find((field) => errors[field]);
  if (first) document.getElementById(first)?.focus();
}

function isDirty(a: CategoryFormValues, b: CategoryFormValues) {
  return (Object.keys(a) as CategoryField[]).some((field) => a[field] !== b[field]);
}

/**
 * Cadastro e edição de categoria (somente administradores). Depois de criar,
 * o formulário volta ao estado vazio para o próximo cadastro.
 */
export function CategoryForm({ recordId, initialValues, initialUpdatedAt }: CategoryFormProps) {
  const isNew = recordId === null;
  const [values, setValues] = useState(initialValues);
  const [saved, setSaved] = useState({ values: initialValues, updatedAt: initialUpdatedAt ?? "" });
  const [errors, setErrors] = useState<CategoryFieldErrors>({});
  const [clientMessage, setClientMessage] = useState<string | null>(null);
  const [slugManual, setSlugManual] = useState(!isNew);
  const [state, formAction, pending] = useActionState<CategorySaveState, FormData>(submit, { status: "idle" });

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.status === "success") {
      setSaved({ values: state.values, updatedAt: state.updatedAt });
      setValues(state.values);
      setErrors({});
    } else if (state.status === "created") {
      setValues(emptyCategoryValues);
      setSlugManual(false);
      setErrors({});
    } else if (state.status === "error") {
      setErrors(state.fieldErrors ?? {});
    }
  }

  const baseline = isNew ? emptyCategoryValues : saved.values;
  const dirty = isDirty(values, baseline);
  const submitting = useRef(false);

  useEffect(() => {
    submitting.current = false;
    if (state.status === "error" && state.fieldErrors) focusFirstError(state.fieldErrors);
  }, [state]);

  useUnsavedChangesWarning(dirty);

  function update<K extends CategoryField>(field: K, value: CategoryFormValues[K]) {
    setValues((current) => {
      const next = { ...current, [field]: value };
      if (field === "name" && !slugManual) next.slug = slugify(value);
      return next;
    });
    const touched: CategoryField[] = field === "name" && !slugManual ? [field, "slug"] : [field];
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
    const { errors: found } = parseCategoryValues(values);
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
    setValues(baseline);
    setSlugManual(!isNew);
    setErrors({});
    setClientMessage(null);
  }

  const message =
    clientMessage !== null
      ? ({ tone: "error", text: clientMessage } as const)
      : state.status === "error"
        ? ({ tone: "error", text: state.message } as const)
        : (state.status === "success" || state.status === "created") && !dirty
          ? ({ tone: "success", text: state.message } as const)
          : null;

  const descriptionHint = "Opcional. Uso interno; ajuda a decidir em qual categoria cada instituição se encaixa.";
  const orderHint = "Número inteiro a partir de 0. Define a ordem dos grupos em /instituicoes (menores primeiro).";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <fieldset disabled={pending} className="flex min-w-0 flex-col gap-6">
        <FormSection
          id="categoria-form"
          title={isNew ? "Nova categoria" : "Editar categoria"}
          description="Categorias agrupam as instituições na página pública e não têm rascunho: as alterações valem imediatamente."
        >
          <Field
            id="name"
            label="Nome"
            required
            error={errors.name}
            count={{ current: countCharacters(values.name), max: categoryTextRules.name.max }}
          >
            <TextInput
              id="name"
              name="name"
              type="text"
              autoComplete="off"
              value={values.name}
              onChange={(event) => update("name", event.target.value)}
              aria-invalid={errors.name ? true : undefined}
              aria-required
              aria-describedby={describedBy("name", { error: errors.name })}
            />
          </Field>
          <SlugField
            value={values.slug}
            title={values.name}
            error={errors.slug}
            publicPrefix={null}
            publishedSlug={null}
            label="Slug (identificador)"
            noPageHint="Identificador único da categoria."
            onChange={(value, manual) => {
              setSlugManual(manual ? value !== "" : false);
              update("slug", value);
            }}
          />
          <Field
            id="description"
            label="Descrição"
            hint={descriptionHint}
            error={errors.description}
            count={{ current: countCharacters(values.description), max: categoryTextRules.description.max }}
          >
            <TextArea
              id="description"
              name="description"
              rows={3}
              value={values.description}
              onChange={(event) => update("description", event.target.value)}
              aria-invalid={errors.description ? true : undefined}
              aria-describedby={describedBy("description", { hint: descriptionHint, error: errors.description })}
            />
          </Field>
          <Field id="sort_order" label="Ordem de exibição" hint={orderHint} error={errors.sort_order}>
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
              aria-describedby={describedBy("sort_order", { hint: orderHint, error: errors.sort_order })}
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
              loginNext={isNew ? "/admin/instituicoes/categorias" : `/admin/instituicoes/categorias?editar=${recordId}`}
            />
          ) : null
        }
        pending={pending}
        dirty={dirty}
        onCancel={cancel}
        submitLabel={isNew ? "Criar categoria" : "Salvar categoria"}
        idleLabel={isNew ? "Preencha os campos para criar a categoria" : "Nenhuma alteração pendente"}
      />
    </form>
  );
}
