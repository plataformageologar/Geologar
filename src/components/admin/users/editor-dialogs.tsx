"use client";

import { CheckCircle2, KeyRound, Plus, UserCheck, UserX } from "lucide-react";
import { useActionState, useId, useRef, useState, type ReactNode, type RefObject } from "react";

import { Field, FormMessage, PasswordInput, TextInput } from "@/components/admin/form-controls";
import { Button } from "@/components/ui/button";
import {
  createEditorAction,
  resetEditorPasswordAction,
  setEditorActiveAction,
} from "@/lib/admin/user-actions";
import {
  EMAIL_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_RULES,
  idleUserState,
  type UserActionState,
} from "@/lib/admin/users";
import { cn } from "@/lib/utils/cn";

const buttonClasses =
  "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full border px-3.5 text-label transition-colors " +
  "disabled:pointer-events-none disabled:opacity-50";
const neutralButton = cn(buttonClasses, "border-border text-foreground hover:border-primary/40 hover:text-primary");
const dangerButton = cn(buttonClasses, "border-danger/40 text-danger hover:bg-danger-soft");

const dialogClasses =
  "m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-border " +
  "bg-surface p-6 text-foreground shadow-xl backdrop:bg-deep/60";

/** Diálogo nativo (`<dialog>`): foco preso, Esc fecha, exceto durante o envio. */
function Dialog({
  dialogRef,
  label,
  pending,
  onClose,
  children,
}: {
  dialogRef: RefObject<HTMLDialogElement | null>;
  label: string;
  pending: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <dialog
      ref={dialogRef}
      aria-label={label}
      onCancel={(event) => {
        if (pending) event.preventDefault();
      }}
      onClose={onClose}
      className={dialogClasses}
    >
      {children}
    </dialog>
  );
}

/** Campos de senha + confirmação com requisitos e erro associados. */
function PasswordFields({
  idPrefix,
  label,
  state,
}: {
  idPrefix: string;
  label: string;
  state: UserActionState;
}) {
  const passwordError = state.status === "error" && state.field === "password" ? state.message : undefined;
  const confirmationError = state.status === "error" && state.field === "confirmation" ? state.message : undefined;
  return (
    <>
      <Field id={`${idPrefix}-password`} label={label} hint={PASSWORD_RULES} error={passwordError} required>
        <PasswordInput
          id={`${idPrefix}-password`}
          name="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          required
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={[passwordError ? `${idPrefix}-password-error` : null, `${idPrefix}-password-hint`].filter(Boolean).join(" ")}
        />
      </Field>
      <Field id={`${idPrefix}-confirmation`} label="Confirmar senha" error={confirmationError} required>
        <PasswordInput
          id={`${idPrefix}-confirmation`}
          name="confirmation"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          required
          aria-invalid={confirmationError ? true : undefined}
          aria-describedby={confirmationError ? `${idPrefix}-confirmation-error` : undefined}
        />
      </Field>
    </>
  );
}

// -----------------------------------------------------------------------------
// Adicionar Editor
// -----------------------------------------------------------------------------

function CreateEditorForm({ onDone, onPending }: { onDone: () => void; onPending: (pending: boolean) => void }) {
  const [state, action, pending] = useActionState(async (previous: UserActionState, data: FormData) => {
    onPending(true);
    try {
      return await createEditorAction(previous, data);
    } finally {
      onPending(false);
    }
  }, idleUserState);
  const formId = useId();

  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-5">
        <div role="status" className="flex flex-col gap-3">
          <h2 className="flex items-center gap-2 text-h4 font-sans">
            <CheckCircle2 aria-hidden="true" className="size-5 text-secondary" />
            Editor criado com sucesso
          </h2>
          <p className="text-body-sm">
            Esta conta já pode acessar o painel GeoLogar utilizando o e-mail e a senha inicial cadastrados.
          </p>
          <p className="text-body-sm">O Editor deverá alterar a senha no primeiro acesso.</p>
          {state.email && (
            <p className="break-all text-body-sm text-muted-foreground">
              Conta: <span className="font-semibold text-foreground">{state.email}</span>
            </p>
          )}
          <p className="text-caption text-muted-foreground">
            Envie a senha inicial à pessoa por um canal seguro e separado do e-mail (por exemplo, pessoalmente ou
            por telefone). O sistema não guarda nem exibe essa senha novamente.
          </p>
        </div>
        <div className="flex justify-end">
          <Button type="button" onClick={onDone} autoFocus>
            Concluir
          </Button>
        </div>
      </div>
    );
  }

  const emailError = state.status === "error" && state.field === "email" ? state.message : undefined;
  const generalError = state.status === "error" && !state.field ? state.message : undefined;

  return (
    <form action={action} className="flex flex-col gap-5" aria-busy={pending}>
      <div className="flex flex-col gap-1">
        <h2 id={`${formId}-title`} className="text-h4 font-sans">
          Adicionar novo Editor
        </h2>
        <p className="text-body-sm text-muted-foreground">
          Confirme a identidade e o e-mail da pessoa antes de criar a conta: o endereço é aceito sem link de
          confirmação.
        </p>
      </div>
      {generalError && <FormMessage tone="error">{generalError}</FormMessage>}
      <Field id={`${formId}-email`} label="E-mail" error={emailError} required>
        <TextInput
          id={`${formId}-email`}
          name="email"
          type="email"
          autoComplete="off"
          inputMode="email"
          maxLength={EMAIL_MAX_LENGTH}
          defaultValue={state.email}
          required
          autoFocus
          aria-invalid={emailError ? true : undefined}
          aria-describedby={emailError ? `${formId}-email-error` : undefined}
        />
      </Field>
      <PasswordFields idPrefix={formId} label="Senha inicial" state={state} />
      <div className="flex flex-col gap-1">
        <span className="text-label">Papel</span>
        <p className="text-body-sm">
          Editor <span className="text-muted-foreground">— definido pelo sistema; não pode ser alterado aqui.</span>
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 pt-2 sm:flex sm:justify-end">
        <button type="button" onClick={onDone} disabled={pending} className={cn(neutralButton, "px-5")}>
          Cancelar
        </button>
        <Button type="submit" disabled={pending}>
          {pending ? "Criando conta…" : "Criar Editor"}
        </Button>
      </div>
    </form>
  );
}

export function CreateEditorDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [formKey, setFormKey] = useState(0);
  const [pending, setPending] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => dialogRef.current?.showModal()} className="shrink-0 self-start">
        <Plus aria-hidden="true" className="size-4" />
        Adicionar Editor
      </Button>
      {/* Remontar o formulário ao fechar descarta senhas digitadas e o resultado anterior. */}
      <Dialog dialogRef={dialogRef} label="Adicionar novo Editor" pending={pending} onClose={() => setFormKey((key) => key + 1)}>
        <CreateEditorForm key={formKey} onPending={setPending} onDone={() => dialogRef.current?.close()} />
      </Dialog>
    </>
  );
}

// -----------------------------------------------------------------------------
// Ações por Editor
// -----------------------------------------------------------------------------

type EditorSummary = { id: string; email: string; isActive: boolean };

function ActivationForm({ editor, onDone }: { editor: EditorSummary; onDone: () => void }) {
  const [state, action, pending] = useActionState(setEditorActiveAction, idleUserState);
  const deactivate = editor.isActive;
  const titleId = useId();

  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-5">
        <FormMessage tone="success">{state.message}</FormMessage>
        <div className="flex justify-end">
          <Button type="button" onClick={onDone} autoFocus>
            Fechar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4" aria-labelledby={titleId}>
      <input type="hidden" name="userId" value={editor.id} />
      <input type="hidden" name="intent" value={deactivate ? "deactivate" : "reactivate"} />
      <h2 id={titleId} className="text-h4 font-sans">
        {deactivate ? "Desativar este Editor?" : "Reativar este Editor?"}
      </h2>
      <p className="break-all text-body-sm font-semibold">{editor.email}</p>
      <p className="text-body-sm">
        {deactivate
          ? "A pessoa perderá o acesso ao painel administrativo. Os conteúdos e alterações realizados por ela serão preservados."
          : "A pessoa volta a acessar o painel com a senha atual. Se a troca da senha inicial estiver pendente, ela continuará sendo exigida."}
      </p>
      {state.status === "error" && <FormMessage tone="error">{state.message}</FormMessage>}
      <div className="grid grid-cols-1 gap-3 pt-2 sm:flex sm:justify-end">
        <button type="button" onClick={onDone} disabled={pending} className={cn(neutralButton, "px-5")} autoFocus>
          Cancelar
        </button>
        <button
          type="submit"
          disabled={pending}
          className={cn(
            buttonClasses,
            "px-5 font-semibold",
            deactivate ? "border-danger bg-danger text-white hover:bg-danger/90" : "border-primary bg-primary text-primary-foreground hover:bg-primary-hover",
          )}
        >
          {pending
            ? deactivate
              ? "Desativando…"
              : "Reativando…"
            : deactivate
              ? "Desativar acesso"
              : "Reativar acesso"}
        </button>
      </div>
    </form>
  );
}

function ResetPasswordForm({ editor, onDone }: { editor: EditorSummary; onDone: () => void }) {
  const [state, action, pending] = useActionState(resetEditorPasswordAction, idleUserState);
  const formId = useId();

  if (state.status === "success") {
    return (
      <div className="flex flex-col gap-5">
        <FormMessage tone="success">
          {state.message} O Editor precisará utilizar a nova senha e alterá-la no próximo acesso.
        </FormMessage>
        <p className="text-caption text-muted-foreground">
          Envie a nova senha à pessoa por um canal seguro. Ela não será exibida novamente.
        </p>
        <div className="flex justify-end">
          <Button type="button" onClick={onDone} autoFocus>
            Fechar
          </Button>
        </div>
      </div>
    );
  }

  const generalError = state.status === "error" && !state.field ? state.message : undefined;
  return (
    <form action={action} className="flex flex-col gap-5" aria-busy={pending}>
      <input type="hidden" name="userId" value={editor.id} />
      <input type="hidden" name="email" value={editor.email} />
      <div className="flex flex-col gap-2">
        <h2 className="text-h4 font-sans">Definir nova senha inicial</h2>
        <p className="break-all text-body-sm font-semibold">{editor.email}</p>
      </div>
      <FormMessage tone="warning">
        A senha atual será substituída. O Editor precisará utilizar a nova senha e alterá-la no próximo acesso.
      </FormMessage>
      {generalError && <FormMessage tone="error">{generalError}</FormMessage>}
      <PasswordFields idPrefix={formId} label="Nova senha inicial" state={state} />
      <div className="grid grid-cols-1 gap-3 pt-2 sm:flex sm:justify-end">
        <button type="button" onClick={onDone} disabled={pending} className={cn(neutralButton, "px-5")}>
          Cancelar
        </button>
        <Button type="submit" disabled={pending}>
          {pending ? "Salvando…" : "Definir nova senha"}
        </Button>
      </div>
    </form>
  );
}

export function EditorRowActions({ editor }: { editor: EditorSummary }) {
  const activationRef = useRef<HTMLDialogElement>(null);
  const resetRef = useRef<HTMLDialogElement>(null);
  const [openKey, setOpenKey] = useState(0);
  const label = <span className="sr-only">: {editor.email}</span>;

  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => activationRef.current?.showModal()}
        className={editor.isActive ? dangerButton : neutralButton}
      >
        {editor.isActive ? (
          <UserX aria-hidden="true" className="size-4" />
        ) : (
          <UserCheck aria-hidden="true" className="size-4" />
        )}
        {editor.isActive ? "Desativar acesso" : "Reativar acesso"}
        {label}
      </button>
      <button type="button" onClick={() => resetRef.current?.showModal()} className={neutralButton}>
        <KeyRound aria-hidden="true" className="size-4" />
        Redefinir senha
        {label}
      </button>

      <Dialog
        dialogRef={activationRef}
        label={editor.isActive ? "Desativar Editor" : "Reativar Editor"}
        pending={false}
        onClose={() => setOpenKey((key) => key + 1)}
      >
        <ActivationForm key={`a-${openKey}`} editor={editor} onDone={() => activationRef.current?.close()} />
      </Dialog>
      <Dialog dialogRef={resetRef} label="Definir nova senha inicial" pending={false} onClose={() => setOpenKey((key) => key + 1)}>
        <ResetPasswordForm key={`r-${openKey}`} editor={editor} onDone={() => resetRef.current?.close()} />
      </Dialog>
    </div>
  );
}
