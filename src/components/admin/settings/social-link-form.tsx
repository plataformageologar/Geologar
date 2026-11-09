"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";

import {
  CUSTOM_PLATFORM,
  emptySocialLinkValues,
  parseSocialLinkValues,
  socialLinkTextRules,
  socialPlatformOptions,
  type SocialLinkField,
  type SocialLinkFieldErrors,
  type SocialLinkFormValues,
} from "@/lib/admin/social-links";
import { saveSocialLink, type SocialLinkSaveState } from "@/lib/admin/social-link-actions";
import { countCharacters, LINK_MAX_LENGTH, PLATFORM_MAX_LENGTH } from "@/lib/admin/validation";

import { Checkbox, describedBy, Field, FormSection, Select, TextInput } from "../form-controls";
import { buildFormData, FailureAction, SaveBar, useUnsavedChangesWarning } from "../save-bar";

type SocialLinkFormProps = {
  /** `null` = nova rede social. */
  recordId: string | null;
  initialValues: SocialLinkFormValues;
  initialUpdatedAt: string | null;
};

const fieldOrder: SocialLinkField[] = ["platform", "label", "url", "sort_order", "is_active"];
const knownPlatforms = new Set<string>(socialPlatformOptions.map((option) => option.value));

async function submit(state: SocialLinkSaveState, formData: FormData): Promise<SocialLinkSaveState> {
  try {
    return await saveSocialLink(state, formData);
  } catch {
    return {
      status: "error",
      reason: "connection",
      message: "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente; nada foi perdido.",
    };
  }
}

function focusFirstError(errors: SocialLinkFieldErrors) {
  const first = fieldOrder.find((field) => errors[field]);
  if (!first) return;
  // A plataforma personalizada tem campo próprio.
  const target = first === "platform" ? document.getElementById("custom_platform") ?? document.getElementById("platform") : document.getElementById(first);
  target?.focus();
}

function isDirty(a: SocialLinkFormValues, b: SocialLinkFormValues) {
  return (Object.keys(a) as SocialLinkField[]).some((field) => a[field] !== b[field]);
}

/** Cadastro e edição de rede social institucional (somente administradores). */
export function SocialLinkForm({ recordId, initialValues, initialUpdatedAt }: SocialLinkFormProps) {
  const isNew = recordId === null;
  const [values, setValues] = useState(initialValues);
  const [saved, setSaved] = useState({ values: initialValues, updatedAt: initialUpdatedAt ?? "" });
  const [errors, setErrors] = useState<SocialLinkFieldErrors>({});
  const [clientMessage, setClientMessage] = useState<string | null>(null);
  // Seletor: plataforma conhecida ou "outra" (campo livre).
  const [choice, setChoice] = useState(
    initialValues.platform === "" || knownPlatforms.has(initialValues.platform) ? initialValues.platform : CUSTOM_PLATFORM,
  );
  const [state, formAction, pending] = useActionState<SocialLinkSaveState, FormData>(submit, { status: "idle" });

  const [handledState, setHandledState] = useState(state);
  if (state !== handledState) {
    setHandledState(state);
    if (state.status === "success") {
      setSaved({ values: state.values, updatedAt: state.updatedAt });
      setValues(state.values);
      setChoice(knownPlatforms.has(state.values.platform) ? state.values.platform : CUSTOM_PLATFORM);
      setErrors({});
    } else if (state.status === "created") {
      setValues(emptySocialLinkValues);
      setChoice("");
      setErrors({});
    } else if (state.status === "error") {
      setErrors(state.fieldErrors ?? {});
    }
  }

  const baseline = isNew ? emptySocialLinkValues : saved.values;
  const dirty = isDirty(values, baseline);
  const submitting = useRef(false);

  useEffect(() => {
    submitting.current = false;
    if (state.status === "error" && state.fieldErrors) focusFirstError(state.fieldErrors);
  }, [state]);

  useUnsavedChangesWarning(dirty);

  function update<K extends SocialLinkField>(field: K, value: SocialLinkFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }));
    if (errors[field]) {
      setErrors((current) => {
        const next = { ...current };
        delete next[field];
        return next;
      });
    }
  }

  function choosePlatform(value: string) {
    setChoice(value);
    update("platform", value === CUSTOM_PLATFORM ? "" : value);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || submitting.current) return;
    const { errors: found } = parseSocialLinkValues(values);
    if (choice === "") found.platform = "Selecione a plataforma.";
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
    setChoice(baseline.platform === "" || knownPlatforms.has(baseline.platform) ? baseline.platform : CUSTOM_PLATFORM);
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

  const custom = choice === CUSTOM_PLATFORM;
  const customHint = "Identificador em letras minúsculas, sem acento (ex.: orcid, bluesky). Até 40 caracteres.";
  const labelHint = "Opcional. Texto acessível do link (ex.: “Instagram do GeoLogar”). Sem ele, usa o nome da plataforma.";
  const urlHint = "Endereço completo do perfil, começando com https://.";
  const orderHint = "Número inteiro a partir de 0. Menores aparecem primeiro no rodapé.";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <fieldset disabled={pending} className="flex min-w-0 flex-col gap-6">
        <FormSection
          id="rede-form"
          title={isNew ? "Nova rede social" : "Editar rede social"}
          description="Somente links ativos aparecem no rodapé do site."
        >
          <Field id="platform" label="Plataforma" required error={custom ? undefined : errors.platform}>
            <Select
              id="platform"
              name="platform_choice"
              value={choice}
              onChange={(event) => choosePlatform(event.target.value)}
              aria-required
              aria-invalid={!custom && errors.platform ? true : undefined}
              aria-describedby={describedBy("platform", { error: custom ? undefined : errors.platform })}
            >
              <option value="">Selecione…</option>
              {socialPlatformOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
              <option value={CUSTOM_PLATFORM}>Outra plataforma…</option>
            </Select>
          </Field>
          {custom && (
            <Field id="custom_platform" label="Nome da plataforma" required hint={customHint} error={errors.platform}>
              <TextInput
                id="custom_platform"
                name="platform"
                type="text"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                maxLength={PLATFORM_MAX_LENGTH}
                value={values.platform}
                onChange={(event) => update("platform", event.target.value)}
                aria-required
                aria-invalid={errors.platform ? true : undefined}
                aria-describedby={describedBy("custom_platform", { hint: customHint, error: errors.platform })}
                className="sm:max-w-72"
              />
            </Field>
          )}
          <Field
            id="label"
            label="Rótulo"
            hint={labelHint}
            error={errors.label}
            count={{ current: countCharacters(values.label), max: socialLinkTextRules.label.max }}
          >
            <TextInput
              id="label"
              name="label"
              type="text"
              autoComplete="off"
              value={values.label}
              onChange={(event) => update("label", event.target.value)}
              aria-invalid={errors.label ? true : undefined}
              aria-describedby={describedBy("label", { hint: labelHint, error: errors.label })}
            />
          </Field>
          <Field id="url" label="Endereço (URL)" required hint={urlHint} error={errors.url}>
            <TextInput
              id="url"
              name="url"
              type="url"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              maxLength={LINK_MAX_LENGTH}
              placeholder="https://"
              value={values.url}
              onChange={(event) => update("url", event.target.value)}
              aria-required
              aria-invalid={errors.url ? true : undefined}
              aria-describedby={describedBy("url", { hint: urlHint, error: errors.url })}
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
          <Checkbox
            id="is_active"
            name="is_active"
            checked={values.is_active}
            onChange={(event) => update("is_active", event.target.checked)}
            label="Ativo (exibir no rodapé)"
            description={values.is_active ? "Aparece no rodapé assim que for salvo." : "Inativo: fica guardado, fora do site."}
          />
        </FormSection>
      </fieldset>

      <SaveBar
        message={message}
        messageAction={
          state.status === "error" && clientMessage === null ? (
            <FailureAction
              reason={state.reason}
              loginNext={isNew ? "/admin/redes-sociais" : `/admin/redes-sociais?editar=${recordId}`}
            />
          ) : null
        }
        pending={pending}
        dirty={dirty}
        onCancel={cancel}
        submitLabel={isNew ? "Cadastrar rede social" : "Salvar rede social"}
        idleLabel={isNew ? "Preencha os campos para cadastrar a rede" : "Nenhuma alteração pendente"}
      />
    </form>
  );
}
