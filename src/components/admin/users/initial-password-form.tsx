"use client";

import { useActionState } from "react";

import { Field, FormMessage, PasswordInput } from "@/components/admin/form-controls";
import { Button } from "@/components/ui/button";
import { completeInitialPasswordAction } from "@/lib/admin/user-actions";
import { PASSWORD_MIN_LENGTH, PASSWORD_RULES, idleUserState } from "@/lib/admin/users";

/** Troca obrigatória da senha inicial (primeiro acesso ou senha redefinida pelo administrador). */
export function InitialPasswordForm() {
  const [state, action, pending] = useActionState(completeInitialPasswordAction, idleUserState);
  const passwordError = state.status === "error" && state.field === "password" ? state.message : undefined;
  const confirmationError = state.status === "error" && state.field === "confirmation" ? state.message : undefined;
  const generalError = state.status === "error" && !state.field ? state.message : undefined;

  return (
    <form action={action} className="flex flex-col gap-5" aria-busy={pending}>
      {generalError && <FormMessage tone="error">{generalError}</FormMessage>}
      <Field id="password" label="Nova senha" hint={PASSWORD_RULES} error={passwordError} required>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          required
          autoFocus
          aria-invalid={passwordError ? true : undefined}
          aria-describedby={[passwordError ? "password-error" : null, "password-hint"].filter(Boolean).join(" ")}
        />
      </Field>
      <Field id="confirmation" label="Confirmar nova senha" error={confirmationError} required>
        <PasswordInput
          id="confirmation"
          name="confirmation"
          autoComplete="new-password"
          minLength={PASSWORD_MIN_LENGTH}
          required
          aria-invalid={confirmationError ? true : undefined}
          aria-describedby={confirmationError ? "confirmation-error" : undefined}
        />
      </Field>
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Salvando…" : "Salvar nova senha"}
      </Button>
    </form>
  );
}
