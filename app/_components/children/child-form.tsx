"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useFormDialogClose } from "@/app/_components/ui/form-dialog";
import {
  FormField,
  FormSelect,
  FormTextArea,
  type FormSelectOption,
} from "@/app/_components/ui/form-field";
import { room, type Child } from "@/app/_data/children";

export type ChildFormMode = "create" | "edit";

const FORM_TITLE: Record<ChildFormMode, string> = {
  create: "Agregar niño",
  edit: "Editar niño",
};

const ROOM_OPTIONS: FormSelectOption[] = [
  { value: "soles", label: room.shortName },
];

const BUTTON_CLASS =
  "cursor-pointer rounded-md focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-auth-bg";

type ChildField = "name" | "birthDate" | "allergies" | "notes";

type ChildErrors = Partial<Record<ChildField, string>>;

const FIELD_ORDER: ChildField[] = ["name", "birthDate", "allergies", "notes"];

const NAME_PATTERN = /^[\p{L}\s'’-]+$/u;
const DATE_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4})$/;

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

function validateBirthDate(value: string): string | undefined {
  const birthDate = value.trim();

  if (birthDate === "") {
    return "Ingresá la fecha de nacimiento.";
  }

  const match = DATE_PATTERN.exec(birthDate);

  if (!match) {
    return "Usá el formato dd/mm/aaaa.";
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(year, month - 1, day);

  if (
    year < 1900 ||
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) {
    return "Ingresá una fecha válida.";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (parsed > today) {
    return "La fecha de nacimiento no puede ser futura.";
  }

  return undefined;
}

function validateAllergies(value: string): string | undefined {
  if (value.trim().length > 120) {
    return "Las alergias no pueden superar los 120 caracteres.";
  }

  return undefined;
}

function validateNotes(value: string): string | undefined {
  if (value.trim().length > 500) {
    return "Las notas no pueden superar los 500 caracteres.";
  }

  return undefined;
}

const VALIDATORS: Record<ChildField, (value: string) => string | undefined> = {
  name: validateName,
  birthDate: validateBirthDate,
  allergies: validateAllergies,
  notes: validateNotes,
};

type ChildFormDefaults = {
  name: string;
  birthDate: string;
  allergies: string;
  notes: string;
};

function childFormDefaults(child?: Child): ChildFormDefaults {
  return {
    name: child?.name ?? "",
    birthDate: child?.birthDateInput ?? "",
    allergies: child?.allergies.map((allergy) => allergy.label).join(", ") ?? "",
    notes: child?.allergies[0]?.note ?? "",
  };
}

type ChildFormProps = {
  mode: ChildFormMode;
  child?: Child;
};

export function ChildForm({ mode, child }: ChildFormProps) {
  const defaults = childFormDefaults(child);
  const closeDialog = useFormDialogClose();
  const [errors, setErrors] = useState<ChildErrors>({});

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const data = new FormData(event.currentTarget);
    const nextErrors: ChildErrors = {};

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

    if (
      !(target instanceof HTMLInputElement) &&
      !(target instanceof HTMLTextAreaElement)
    ) {
      return;
    }

    const field = target.name as ChildField;

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
      className="max-h-[calc(100dvh-32px)] w-full max-w-[520px] overflow-y-auto rounded-3xl border border-border bg-auth-bg shadow-dialog"
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-[26px] py-5">
        <button
          type="button"
          onClick={closeDialog}
          className={`${BUTTON_CLASS} text-[15px] font-bold text-muted`}
        >
          Cancelar
        </button>
        <h2
          id="child-form-title"
          className="font-display text-[18px] font-semibold text-ink"
        >
          {FORM_TITLE[mode]}
        </h2>
        <button
          type="submit"
          className={`${BUTTON_CLASS} text-[15px] font-extrabold text-eyebrow`}
        >
          Guardar
        </button>
      </header>

      <div className="px-[26px] py-6">
        <div className="mb-[18px]">
          <FormField
            id="child-name"
            label="NOMBRE COMPLETO"
            name="name"
            placeholder="Ej. Martina López"
            defaultValue={defaults.name}
            required
            error={errors.name}
          />
        </div>

        <div className="mb-[18px] flex flex-col gap-[14px] sm:flex-row">
          <div className="flex-1">
            <FormField
              id="child-birth-date"
              label="FECHA DE NACIMIENTO"
              name="birthDate"
              placeholder="dd/mm/aaaa"
              defaultValue={defaults.birthDate}
              required
              error={errors.birthDate}
            />
          </div>
          <div className="flex-1">
            <FormSelect
              id="child-room"
              label="SALA"
              name="room"
              options={ROOM_OPTIONS}
              defaultValue="soles"
            />
          </div>
        </div>

        <div className="mb-[18px]">
          <FormField
            id="child-allergies"
            label="ALERGIAS (ETIQUETAS)"
            name="allergies"
            placeholder="Ej. Maní, Lactosa"
            defaultValue={defaults.allergies}
            error={errors.allergies}
          />
        </div>

        <FormTextArea
          id="child-notes"
          label="NOTAS MÉDICAS"
          name="notes"
          placeholder="Indicaciones, medicación, contactos…"
          defaultValue={defaults.notes}
          error={errors.notes}
        />
      </div>
    </form>
  );
}
