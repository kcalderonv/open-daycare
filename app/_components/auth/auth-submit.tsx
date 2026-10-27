import Link from "next/link";

export const AUTH_SUBMIT_CLASSES =
  "block w-full rounded-[15px] bg-[linear-gradient(180deg,var(--color-cta-from),var(--color-cta-to))] p-[15px] text-center text-[16px] font-extrabold leading-[normal] text-white shadow-auth-cta";

export function AuthSubmit({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link href={href} className={AUTH_SUBMIT_CLASSES}>
      {children}
    </Link>
  );
}

export function AuthSubmitButton({
  pending,
  children,
}: {
  pending: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={pending}
      className={`${AUTH_SUBMIT_CLASSES} cursor-pointer disabled:cursor-wait disabled:opacity-60`}
    >
      {children}
    </button>
  );
}
