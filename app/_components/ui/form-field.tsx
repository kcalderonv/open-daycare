import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { ChevronDownIcon } from "@/app/_components/icons";

const LABEL_CLASS =
  "mb-2 block text-[12px] font-extrabold tracking-[.7px] text-muted";

const CONTROL_CLASS =
  "w-full rounded-[14px] border-[1.5px] bg-white px-4 py-[13px] text-[15px] text-ink outline-none focus-visible:ring-2 focus-visible:ring-coral/30";

const ERROR_CLASS = "mt-1.5 text-[12.5px] font-bold text-error";

function controlClassName(hasError: boolean): string {
  return hasError
    ? `${CONTROL_CLASS} border-error focus:border-error`
    : `${CONTROL_CLASS} border-auth-input-border focus:border-coral`;
}

function describedBy(id: string, error?: string): string | undefined {
  return error ? `${id}-error` : undefined;
}

function FieldError({ id, error }: { id: string; error?: string }) {
  if (!error) {
    return null;
  }

  return (
    <p id={`${id}-error`} role="alert" className={ERROR_CLASS}>
      {error}
    </p>
  );
}

type FormFieldProps = {
  id: string;
  label: string;
  error?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "id">;

export function FormField({
  id,
  label,
  error,
  ...inputProps
}: FormFieldProps) {
  return (
    <div>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      <input
        {...inputProps}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error)}
        className={controlClassName(Boolean(error))}
      />
      <FieldError id={id} error={error} />
    </div>
  );
}

type FormTextAreaProps = {
  id: string;
  label: string;
  error?: string;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className" | "id">;

export function FormTextArea({
  id,
  label,
  error,
  ...textareaProps
}: FormTextAreaProps) {
  return (
    <div>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      <textarea
        {...textareaProps}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error)}
        className={`${controlClassName(Boolean(error))} min-h-[90px] resize-y leading-[1.5]`}
      />
      <FieldError id={id} error={error} />
    </div>
  );
}

export type FormSelectOption = {
  value: string;
  label: string;
};

type FormSelectProps = {
  id: string;
  label: string;
  options: FormSelectOption[];
  error?: string;
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "className" | "id">;

export function FormSelect({
  id,
  label,
  options,
  error,
  ...selectProps
}: FormSelectProps) {
  return (
    <div>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      <div className="relative">
        <select
          {...selectProps}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error)}
          className={`${controlClassName(Boolean(error))} appearance-none pr-10 font-bold`}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDownIcon
          width={16}
          height={16}
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-photo-text"
        />
      </div>
      <FieldError id={id} error={error} />
    </div>
  );
}
