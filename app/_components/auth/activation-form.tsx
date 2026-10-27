"use client";

import { useActionState, useState, type FormEvent } from "react";
import {
  activateAccount,
  type ActivationState,
} from "@/app/(auth)/activar-cuenta/actions";
import { AuthField } from "@/app/_components/auth/auth-field";
import { AuthFooter } from "@/app/_components/auth/auth-footer";
import { AuthSubmitButton } from "@/app/_components/auth/auth-submit";
import { ConsentCheckbox } from "@/app/_components/auth/consent-checkbox";
import { InviteSummary } from "@/app/_components/auth/invite-summary";
import type { InvitationPreview } from "@/app/_lib/invitations";

const INITIAL_STATE: ActivationState = { error: null };

const ALERT_CLASSES =
  "mb-4 rounded-xl bg-coral-soft px-4 py-3 text-[13.5px] font-bold text-error";

const PASSWORD_ERROR = "La contraseña debe tener al menos 8 caracteres.";
const CONSENT_ERROR = "Marcá la autorización para continuar.";

export function ActivationForm({
  code,
  preview,
}: {
  code: string;
  preview: InvitationPreview;
}) {
  const [state, formAction, isPending] = useActionState(
    activateAccount,
    INITIAL_STATE,
  );
  const [clientError, setClientError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password") ?? "");

    if (password.length < 8) {
      event.preventDefault();
      setClientError(PASSWORD_ERROR);
      form.querySelector<HTMLInputElement>("#activation-password")?.focus();
      return;
    }

    if (data.get("photo-consent") !== "on") {
      event.preventDefault();
      setClientError(CONSENT_ERROR);
      form
        .querySelector<HTMLInputElement>("[name='photo-consent']")
        ?.focus();
      return;
    }

    setClientError(null);
  }

  const error = clientError ?? state.error;

  return (
    <form action={formAction} onSubmit={handleSubmit} noValidate>
      <InviteSummary
        firstName={preview.childFirstName}
        roomName={preview.roomName}
      />

      <AuthField
        id="activation-code"
        label="CÓDIGO DE INVITACIÓN"
        name="code"
        variant="code"
        autoComplete="off"
        readOnly
        defaultValue={code}
        className="mb-[18px]"
      />

      <AuthField
        id="activation-email"
        label="EMAIL"
        name="email"
        type="email"
        autoComplete="email"
        readOnly
        defaultValue={preview.email}
        className="mb-[18px]"
      />

      <AuthField
        id="activation-password"
        label="CREAR CONTRASEÑA"
        name="password"
        variant="password"
        autoComplete="new-password"
        placeholder="••••••••"
        disabled={isPending}
        highlighted
        className="mb-[18px]"
      />

      <ConsentCheckbox label="Autorizo a la guardería a tomar y compartir fotos de mi hijo dentro de la app." />

      {error ? (
        <p role="alert" className={ALERT_CLASSES}>
          {error}
        </p>
      ) : null}

      <AuthSubmitButton pending={isPending}>
        {isPending ? "Activando…" : "Activar mi cuenta"}
      </AuthSubmitButton>

      <AuthFooter
        text="¿Ya tenés cuenta?"
        linkLabel="Iniciar sesión"
        href="/login"
        className="mt-[22px]"
      />
    </form>
  );
}
