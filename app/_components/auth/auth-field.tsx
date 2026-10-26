import type { InputHTMLAttributes } from "react";

export type AuthFieldVariant = "default" | "code" | "password";

type AuthFieldProps = {
  id: string;
  label: string;
  name: string;
  variant?: AuthFieldVariant;
  highlighted?: boolean;
  className?: string;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "id" | "name">;

const VARIANT_STYLES: Record<AuthFieldVariant, string> = {
  default: "text-[15px]",
  code: "font-display text-[18px] font-bold tracking-[3px]",
  password: "text-[15px]",
};

export function AuthField({
  id,
  label,
  name,
  variant = "default",
  highlighted = false,
  className,
  ...inputProps
}: AuthFieldProps) {
  const { type = variant === "password" ? "password" : "text", ...rest } =
    inputProps;

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-2 block text-[12px] font-extrabold tracking-[.7px] text-muted"
      >
        {label}
      </label>
      <input
        {...rest}
        id={id}
        name={name}
        type={type}
        className={`w-full rounded-[14px] border-[1.5px] bg-white px-4 py-3.5 text-ink outline-none focus:border-coral ${
          highlighted ? "border-auth-input-active" : "border-auth-input-border"
        } ${VARIANT_STYLES[variant]}`}
      />
    </div>
  );
}
