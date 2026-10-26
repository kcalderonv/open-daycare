import type {
  InputHTMLAttributes,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from "react";
import { ChevronDownIcon } from "@/app/_components/icons";

const LABEL_CLASS =
  "mb-2 block text-[12px] font-extrabold tracking-[.7px] text-muted";

const CONTROL_CLASS =
  "w-full rounded-[14px] border-[1.5px] border-auth-input-border bg-white px-4 py-[13px] text-[15px] text-ink outline-none focus:border-coral focus-visible:ring-2 focus-visible:ring-coral/30";

type ChildFormFieldProps = {
  id: string;
  label: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "id">;

export function ChildFormField({ id, label, ...inputProps }: ChildFormFieldProps) {
  return (
    <div>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      <input {...inputProps} id={id} className={CONTROL_CLASS} />
    </div>
  );
}

type ChildFormTextAreaProps = {
  id: string;
  label: string;
} & Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className" | "id">;

export function ChildFormTextArea({
  id,
  label,
  ...textareaProps
}: ChildFormTextAreaProps) {
  return (
    <div>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      <textarea
        {...textareaProps}
        id={id}
        className={`${CONTROL_CLASS} min-h-[90px] resize-y leading-[1.5]`}
      />
    </div>
  );
}

export type ChildFormSelectOption = {
  value: string;
  label: string;
};

type ChildFormSelectProps = {
  id: string;
  label: string;
  options: ChildFormSelectOption[];
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, "className" | "id">;

export function ChildFormSelect({
  id,
  label,
  options,
  ...selectProps
}: ChildFormSelectProps) {
  return (
    <div>
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      <div className="relative">
        <select
          {...selectProps}
          id={id}
          className={`${CONTROL_CLASS} appearance-none pr-10 font-bold`}
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
    </div>
  );
}
