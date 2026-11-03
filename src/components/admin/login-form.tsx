"use client";

import Link from "next/link";
import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { signIn, type FormState } from "@/lib/auth/actions";

import { Field, FormMessage, PasswordInput, TextInput } from "./form-controls";

const initialState: FormState = { status: "idle" };

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, initialState);
  const hasError = state.status === "error";

  return (
    <form action={action} className="flex flex-col gap-5">
      {next && <input type="hidden" name="next" value={next} />}

      {hasError && (
        <FormMessage tone="error" id="login-error">
          {state.message}
        </FormMessage>
      )}

      <Field id="email" label="E-mail">
        <TextInput
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="username"
          required
          defaultValue={state.email}
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? "login-error" : undefined}
        />
      </Field>

      <Field id="password" label="Senha">
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          required
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? "login-error" : undefined}
        />
      </Field>

      <div className="-mt-2 flex justify-end">
        <Link
          href="/admin/recuperar-senha"
          className="inline-flex min-h-11 items-center text-body-sm text-primary underline decoration-primary/30 underline-offset-4 hover:decoration-primary"
        >
          Esqueci minha senha
        </Link>
      </div>

      <Button type="submit" size="lg" disabled={pending} aria-disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </Button>
      <p aria-live="polite" className="sr-only">
        {pending ? "Verificando acesso…" : ""}
      </p>
    </form>
  );
}
