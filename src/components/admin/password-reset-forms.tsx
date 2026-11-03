"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { requestPasswordReset, updatePassword, type FormState } from "@/lib/auth/actions";

import { Field, FormMessage, PasswordInput, TextInput } from "./form-controls";

const initialState: FormState = { status: "idle" };

/** Solicitação do link de recuperação (resposta sempre neutra). */
export function ResetRequestForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initialState);

  if (state.status === "success") {
    return <FormMessage tone="success">{state.message}</FormMessage>;
  }

  const hasError = state.status === "error";

  return (
    <form action={action} className="flex flex-col gap-5">
      {hasError && (
        <FormMessage tone="error" id="reset-error">
          {state.message}
        </FormMessage>
      )}
      <Field id="email" label="E-mail">
        <TextInput
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          defaultValue={state.email}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? "reset-error" : undefined}
        />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Enviando…" : "Enviar link de recuperação"}
      </Button>
    </form>
  );
}

/** Definição da nova senha (sessão criada pelo link de recuperação). */
export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initialState);
  const hasError = state.status === "error";

  return (
    <form action={action} className="flex flex-col gap-5">
      {hasError && (
        <FormMessage tone="error" id="password-error">
          {state.message}
        </FormMessage>
      )}
      <Field id="password" label="Nova senha" hint="Use pelo menos 8 caracteres.">
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          minLength={8}
          required
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? "password-error password-hint" : "password-hint"}
        />
      </Field>
      <Field id="confirmation" label="Confirme a nova senha">
        <PasswordInput
          id="confirmation"
          name="confirmation"
          autoComplete="new-password"
          minLength={8}
          required
          aria-invalid={hasError || undefined}
        />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Salvando…" : "Salvar nova senha"}
      </Button>
    </form>
  );
}
