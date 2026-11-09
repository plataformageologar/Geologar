"use client";

import Image from "next/image";
import { ImageIcon } from "lucide-react";
import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { saveHomepage, type HomepageSaveState } from "@/lib/admin/actions";
import {
  homepageFields,
  homepageTextRules,
  parseHomepageValues,
  type HomepageField,
  type HomepageFieldErrors,
  type HomepageFormValues,
} from "@/lib/admin/homepage";
import { countCharacters, LINK_MAX_LENGTH } from "@/lib/admin/validation";

import { describedBy, Field, FormMessage, FormSection, TextArea, TextInput } from "../form-controls";

type HomepageFormProps = {
  initialValues: HomepageFormValues;
  /** Versão do registro carregado (detecção de edição simultânea). */
  initialUpdatedAt: string;
  hasImage: boolean;
  imageSrc: string | null;
};

// Ordem visual dos campos (foco no primeiro erro).
const fieldOrder: HomepageField[] = [
  "hero_title",
  "hero_description",
  "hero_image_alt",
  "hero_primary_cta_label",
  "hero_primary_cta_href",
  "hero_secondary_cta_label",
  "hero_secondary_cta_href",
  "about_title",
  "about_description",
  "cooperation_title",
  "cooperation_description",
  "cooperation_cta_label",
  "cooperation_cta_href",
];

const linkHint = "Caminho do site (ex.: /contato) ou endereço completo começando com https://.";

/**
 * Chama a Server Action tratando falhas de rede no navegador (requisição que
 * nem chega ao servidor) como erro de conexão, em vez de derrubar a página e
 * perder o texto digitado.
 */
async function submitHomepage(state: HomepageSaveState, formData: FormData): Promise<HomepageSaveState> {
  try {
    return await saveHomepage(state, formData);
  } catch {
    return {
      status: "error",
      reason: "connection",
      message:
        "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente; nada foi perdido.",
    };
  }
}

function focusFirstError(errors: HomepageFieldErrors) {
  const first = fieldOrder.find((field) => errors[field]);
  if (first) document.getElementById(first)?.focus();
}

/**
 * Formulário da homepage. Os valores ficam no estado do componente: uma
 * falha ao salvar nunca apaga o que foi digitado. A validação aqui é apenas
 * para retorno imediato; a definitiva acontece na Server Action.
 */
export function HomepageForm({ initialValues, initialUpdatedAt, hasImage, imageSrc }: HomepageFormProps) {
  const [values, setValues] = useState(initialValues);
  const [saved, setSaved] = useState({ values: initialValues, updatedAt: initialUpdatedAt });
  const [errors, setErrors] = useState<HomepageFieldErrors>({});
  const [clientMessage, setClientMessage] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState<HomepageSaveState, FormData>(
    submitHomepage,
    { status: "idle" },
  );

  // Aplica o resultado de cada envio uma única vez.
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

  const dirty = homepageFields.some((field) => values[field] !== saved.values[field]);

  // Trava síncrona contra envio duplo (dois cliques antes de `pending` renderizar).
  const submitting = useRef(false);

  useEffect(() => {
    submitting.current = false;
    if (state.status === "error" && state.fieldErrors) focusFirstError(state.fieldErrors);
  }, [state]);

  // Aviso do navegador ao recarregar ou fechar a aba com alterações pendentes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function update(field: HomepageField, value: string) {
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
    if (pending || submitting.current) {
      event.preventDefault();
      return;
    }
    const { errors: found } = parseHomepageValues(values, { hasImage });
    if (Object.keys(found).length > 0) {
      event.preventDefault();
      setErrors(found);
      setClientMessage("Revise os campos destacados antes de salvar.");
      focusFirstError(found);
      return;
    }
    submitting.current = true;
    setClientMessage(null);
  }

  function cancel() {
    setValues(saved.values);
    setErrors({});
    setClientMessage(null);
  }

  function textField(
    field: keyof typeof homepageTextRules,
    label: string,
    options: { hint?: ReactNode; rows?: number } = {},
  ) {
    const rule: { max: number; required?: boolean; multiline?: boolean } = homepageTextRules[field];
    const required = rule.required || field === "hero_image_alt";
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

  function ctaFields(
    legend: string,
    labelField: "hero_primary_cta_label" | "hero_secondary_cta_label" | "cooperation_cta_label",
    hrefField: "hero_primary_cta_href" | "hero_secondary_cta_href" | "cooperation_cta_href",
  ) {
    return (
      <fieldset className="flex flex-col gap-4 rounded-xl border border-border p-4 sm:p-5">
        <legend className="px-1 text-label">{legend}</legend>
        <p className="-mt-1 text-caption text-muted-foreground">
          O botão só aparece no site com texto e destino preenchidos. Para removê-lo, apague os dois.
        </p>
        <div className="grid gap-4 md:grid-cols-2">
          {textField(labelField, "Texto do botão")}
          <Field id={hrefField} label="Destino" hint={linkHint} error={errors[hrefField]}>
            <TextInput
              id={hrefField}
              name={hrefField}
              type="text"
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              maxLength={LINK_MAX_LENGTH}
              placeholder="/contato"
              value={values[hrefField]}
              onChange={(event) => update(hrefField, event.target.value)}
              aria-invalid={errors[hrefField] ? true : undefined}
              aria-describedby={describedBy(hrefField, { hint: linkHint, error: errors[hrefField] })}
            />
          </Field>
        </div>
      </fieldset>
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
    <form action={formAction} onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
      <input type="hidden" name="updated_at" value={saved.updatedAt} />

      <fieldset disabled={pending} className="flex min-w-0 flex-col gap-8">
        <FormSection
          id="banner"
          title="Banner principal"
          description="Primeira área da homepage: título, texto de apoio e botões de destaque."
        >
          {textField("hero_title", "Título principal")}
          {textField("hero_description", "Descrição", { rows: 3 })}

          <div className="flex flex-col gap-3">
            <p className="text-label">Imagem de fundo</p>
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
                    : "Nenhuma imagem cadastrada: o banner usa o fundo padrão com curvas de nível."}
                </p>
              </div>
            )}
            <p className="text-caption text-muted-foreground">
              Gerenciamento de imagens disponível em uma próxima etapa.
            </p>
            {hasImage &&
              textField("hero_image_alt", "Texto alternativo da imagem", {
                hint: "Descreva a imagem para quem usa leitores de tela.",
              })}
          </div>

          {ctaFields("Botão principal", "hero_primary_cta_label", "hero_primary_cta_href")}
          {ctaFields("Botão secundário", "hero_secondary_cta_label", "hero_secondary_cta_href")}
        </FormSection>

        <FormSection
          id="apresentacao"
          title="Apresentação da rede"
          description="Seção “A Rede” da homepage."
        >
          {textField("about_title", "Título da seção", {
            hint: "Se ficar vazio, a seção não aparece na homepage.",
          })}
          {textField("about_description", "Texto institucional", {
            rows: 8,
            hint: "Quebras de linha são mantidas.",
          })}
        </FormSection>

        <FormSection
          id="cooperacao"
          title="Chamada para cooperação"
          description="Bloco de contato ao final da homepage."
        >
          {textField("cooperation_title", "Título", {
            hint: "Se ficar vazio, o bloco não aparece na homepage.",
          })}
          {textField("cooperation_description", "Descrição", { rows: 4 })}
          {ctaFields("Botão de contato", "cooperation_cta_label", "cooperation_cta_href")}
        </FormSection>
      </fieldset>

      <div className="sticky bottom-0 z-10 -mx-4 flex flex-col gap-3 border-t border-border bg-background/95 px-4 py-4 backdrop-blur-sm sm:mx-0 sm:rounded-2xl sm:border sm:px-5">
        {message && (
          <FormMessage tone={message.tone}>
            {message.text}
            {state.status === "error" && state.reason === "session" && clientMessage === null && (
              <>
                {" "}
                <a
                  href="/admin/login?next=/admin/homepage"
                  target="_blank"
                  rel="noopener"
                  className="font-semibold underline underline-offset-2"
                >
                  Entrar em nova aba
                </a>
              </>
            )}
            {state.status === "error" && state.reason === "conflict" && clientMessage === null && (
              <>
                {" "}
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="font-semibold underline underline-offset-2"
                >
                  Recarregar página
                </button>
              </>
            )}
          </FormMessage>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-body-sm text-muted-foreground" aria-live="polite">
            {pending ? (
              "Salvando alterações…"
            ) : dirty ? (
              <span className="inline-flex items-center gap-2 font-semibold text-earth">
                <span aria-hidden="true" className="size-2 rounded-full bg-earth" />
                Alterações não salvas
              </span>
            ) : (
              "Nenhuma alteração pendente"
            )}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:flex">
            {/* Em telas estreitas os dois botões dividem a linha (barra fixa mais baixa). */}
            <Button type="button" variant="secondary" onClick={cancel} disabled={!dirty || pending}>
              Cancelar alterações
            </Button>
            <Button type="submit" disabled={!dirty || pending}>
              {pending ? "Salvando…" : "Salvar alterações"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
