import type {
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { ChevronDownIcon } from "@/app/_components/icons";

const LABEL_BASE = "text-[12px] font-extrabold tracking-[.7px] text-muted";

const LABEL_CLASS = `mb-2 block ${LABEL_BASE}`;

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
  labelEnd?: ReactNode;
  className?: string;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className" | "id">;

export function FormTextArea({
  id,
  label,
  error,
  labelEnd,
  className,
  ...textareaProps
}: FormTextAreaProps) {
  const describedBy = [
    textareaProps["aria-describedby"],
    error ? `${id}-error` : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <label htmlFor={id} className={LABEL_BASE}>
          {label}
        </label>
        {labelEnd}
      </div>
      <textarea
        {...textareaProps}
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy === "" ? undefined : describedBy}
        className={`${controlClassName(Boolean(error))} resize-y leading-[1.5] ${className ?? "min-h-[90px]"}`}
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
