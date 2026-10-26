import {
  ChildFormField,
  ChildFormSelect,
  ChildFormTextArea,
  type ChildFormSelectOption,
} from "@/app/_components/children/child-form-field";
import { room, type Child } from "@/app/_data/children";

export type ChildFormMode = "create" | "edit";

const FORM_TITLE: Record<ChildFormMode, string> = {
  create: "Agregar niño",
  edit: "Editar niño",
};

const ROOM_OPTIONS: ChildFormSelectOption[] = [
  { value: "soles", label: room.shortName },
];

const BUTTON_CLASS =
  "cursor-pointer rounded-md focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 focus-visible:ring-offset-auth-bg";

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

  return (
    <form
      method="dialog"
      autoComplete="off"
      className="max-h-[calc(100dvh-32px)] w-full max-w-[520px] overflow-y-auto rounded-3xl border border-border bg-auth-bg shadow-dialog"
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-[26px] py-5">
        <button
          type="submit"
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
          <ChildFormField
            id="child-name"
            label="NOMBRE COMPLETO"
            name="name"
            placeholder="Ej. Martina López"
            defaultValue={defaults.name}
          />
        </div>

        <div className="mb-[18px] flex flex-col gap-[14px] sm:flex-row">
          <div className="flex-1">
            <ChildFormField
              id="child-birth-date"
              label="FECHA DE NACIMIENTO"
              name="birthDate"
              placeholder="dd/mm/aaaa"
              defaultValue={defaults.birthDate}
            />
          </div>
          <div className="flex-1">
            <ChildFormSelect
              id="child-room"
              label="SALA"
              name="room"
              options={ROOM_OPTIONS}
              defaultValue="soles"
            />
          </div>
        </div>

        <div className="mb-[18px]">
          <ChildFormField
            id="child-allergies"
            label="ALERGIAS (ETIQUETAS)"
            name="allergies"
            placeholder="Ej. Maní, Lactosa"
            defaultValue={defaults.allergies}
          />
        </div>

        <ChildFormTextArea
          id="child-notes"
          label="NOTAS MÉDICAS"
          name="notes"
          placeholder="Indicaciones, medicación, contactos…"
          defaultValue={defaults.notes}
        />
      </div>
    </form>
  );
}
