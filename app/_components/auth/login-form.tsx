"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login, type LoginState } from "@/app/(auth)/login/actions";
import { AuthField } from "@/app/_components/auth/auth-field";
import { AuthSubmitButton } from "@/app/_components/auth/auth-submit";

const INITIAL_STATE: LoginState = { error: null };

const ACCOUNT_ERROR =
  "Tu cuenta no está habilitada. Ingresá con otra cuenta o contactá a la guardería.";

const ALERT_CLASSES =
  "mb-4 rounded-xl bg-coral-soft px-4 py-3 text-[13.5px] font-bold text-error";

export function LoginForm({
  nextPath,
  accountError,
}: {
  nextPath: string;
  accountError: boolean;
}) {
  const [state, formAction, isPending] = useActionState(login, INITIAL_STATE);

  return (
    <form action={formAction} noValidate>
      <input type="hidden" name="next" value={nextPath} />

      <AuthField
        id="login-email"
        label="EMAIL"
        name="email"
        type="email"
        autoComplete="email"
        disabled={isPending}
        aria-invalid={state.error ? true : undefined}
        className="mb-[18px]"
      />

      <AuthField
        id="login-password"
        label="CONTRASEÑA"
        name="password"
        variant="password"
        autoComplete="current-password"
        placeholder="••••••••"
        disabled={isPending}
        aria-invalid={state.error ? true : undefined}
        className="mb-2.5"
      />

      <div className="mb-5 text-right">
        <Link href="#" className="text-[13.5px] font-bold text-coral-link">
          ¿Olvidaste tu contraseña?
        </Link>
      </div>

      {accountError && !state.error ? (
        <p role="alert" className={ALERT_CLASSES}>
          {ACCOUNT_ERROR}
        </p>
      ) : null}

      {state.error ? (
        <p role="alert" className={ALERT_CLASSES}>
          {state.error}
        </p>
      ) : null}

      <AuthSubmitButton pending={isPending}>
        {isPending ? "Ingresando…" : "Iniciar sesión"}
      </AuthSubmitButton>
    </form>
  );
}
