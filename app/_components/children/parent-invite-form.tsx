"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { CloseIcon, InfoIcon, SendIcon } from "@/app/_components/icons";
import { useFormDialogClose } from "@/app/_components/ui/form-dialog";
import { FormField } from "@/app/_components/ui/form-field";
import type { Child } from "@/app/_data/children";
import {
  defaultRelationship,
  parentInvite,
  relationshipOptions,
} from "@/app/_data/parent-invite";

type InviteField = "name" | "email";

type InviteErrors = Partial<Record<InviteField, string>>;

const FIELD_ORDER: InviteField[] = ["name", "email"];

const NAME_PATTERN = /^[\p{L}\s'’-]+$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;

function validateName(value: string): string | undefined {
  const name = value.trim();

  if (name === "") {
    return "Ingresá el nombre completo.";
  }

  if (name.length < 2) {
    return "El nombre debe tener al menos 2 caracteres.";
  }

  if (name.length > 60) {
    return "El nombre no puede superar los 60 caracteres.";
  }

  if (!NAME_PATTERN.test(name)) {
    return "Usá solo letras y espacios en el nombre.";
  }

  return undefined;
}

function validateEmail(value: string): string | undefined {
  const email = value.trim();

  if (email === "") {
    return "Ingresá el email.";
  }

  if (!EMAIL_PATTERN.test(email)) {
    return "Ingresá un email válido.";
  }

  return undefined;
}

const VALIDATORS: Record<InviteField, (value: string) => string | undefined> = {
  name: validateName,
  email: validateEmail,
};

export function ParentInviteForm({ child }: { child: Child }) {
  const closeDialog = useFormDialogClose();
  const [errors, setErrors] = useState<InviteErrors>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const nextErrors: InviteErrors = {};

    for (const field of FIELD_ORDER) {
      const message = VALIDATORS[field](String(data.get(field) ?? ""));

      if (message) {
        nextErrors[field] = message;
      }
    }

    setErrors(nextErrors);

    const firstInvalid = FIELD_ORDER.find((field) => nextErrors[field]);

    if (firstInvalid) {
      event.currentTarget
        .querySelector<HTMLElement>(`[name="${firstInvalid}"]`)
        ?.focus();
      return;
    }

    closeDialog();
  }

  function handleChange(event: ChangeEvent<HTMLFormElement>) {
    const target = event.target;

    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const field = target.name as InviteField;

    if (!errors[field]) {
      return;
    }

    setErrors((current) => ({
      ...current,
      [field]: VALIDATORS[field](target.value),
    }));
  }

  return (
    <form
      noValidate
      autoComplete="off"
      onSubmit={handleSubmit}
      onChange={handleChange}
      onReset={() => setErrors({})}
      className="max-h-[calc(100dvh-32px)] w-full max-w-[480px] overflow-y-auto rounded-3xl border border-border bg-auth-bg shadow-dialog"
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-[26px] py-5">
        <div>
          <h2
            id="parent-invite-title"
            className="font-display text-[18px] font-semibold text-ink"
          >
            Vincular padre
          </h2>
          <p className="text-[13px] text-muted-soft">a {child.name}</p>
        </div>
        <button
          type="button"
          onClick={closeDialog}
          aria-label="Cerrar"
          className="flex size-[34px] flex-none cursor-pointer items-center justify-center rounded-[10px] bg-divider text-muted focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2"
        >
          <CloseIcon width={18} height={18} />
        </button>
      </header>

      <div className="px-[26px] py-[22px]">
        <div className="mb-5 flex gap-[11px] rounded-[14px] bg-invite-info-bg px-4 py-[13px]">
          <InfoIcon
            width={20}
            height={20}
            className="mt-px flex-none text-invite-blue"
          />
          <span className="text-[13.5px] leading-[1.45] text-invite-info-fg">
            Le enviaremos un correo con un código para que active su cuenta.
            Solo verá el feed de {child.firstName}.
          </span>
        </div>

        <div className="mb-[18px]">
          <FormField
            id="parent-name"
            label="NOMBRE DEL PADRE/MADRE"
            name="name"
            placeholder="Ej. Diego Fernández"
            autoComplete="off"
            required
            error={errors.name}
          />
        </div>

        <div className="mb-[18px]">
          <FormField
            id="parent-email"
            label="EMAIL"
            name="email"
            type="email"
            placeholder="correo@ejemplo.com"
            autoComplete="off"
            required
            error={errors.email}
          />
        </div>

        <fieldset className="mb-5">
          <legend className="mb-[10px] block text-[12px] font-extrabold tracking-[.7px] text-muted">
            PARENTESCO
          </legend>
          <div className="flex gap-[9px]">
            {relationshipOptions.map((option) => (
              <label key={option.value} className="flex-1">
                <input
                  type="radio"
                  name="relationship"
                  value={option.value}
                  defaultChecked={option.value === defaultRelationship}
                  className="peer sr-only"
                />
                <span className="block cursor-pointer rounded-full border-[1.5px] border-border bg-surface p-[11px] text-center text-[14px] font-extrabold text-nav peer-checked:border-relationship-border peer-checked:bg-relationship-bg peer-checked:text-invite-blue peer-focus-visible:ring-2 peer-focus-visible:ring-coral peer-focus-visible:ring-offset-2">
                  {option.label}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="mb-5 rounded-2xl border-[1.5px] border-dashed border-invite-code-border bg-consent-bg px-[18px] py-[18px] text-center">
          <div className="mb-2 text-[12px] font-extrabold tracking-[.7px] text-invite-code-label">
            CÓDIGO DE INVITACIÓN
          </div>
          <div className="font-display text-[34px] font-semibold tracking-[7px] text-consent-fg">
            {parentInvite.code}
          </div>
          <div className="mt-1.5 text-[13px] text-invite-code-label">
            {parentInvite.expiresLabel}
          </div>
        </div>

        <button
          type="submit"
          className="flex w-full cursor-pointer items-center justify-center gap-[9px] rounded-[14px] bg-[linear-gradient(180deg,var(--color-cta-from),var(--color-cta-to))] px-[14px] py-[14px] text-[15.5px] font-extrabold text-white shadow-auth-cta focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2"
        >
          <SendIcon width={19} height={19} />
          Enviar invitación
        </button>
      </div>
    </form>
  );
}
