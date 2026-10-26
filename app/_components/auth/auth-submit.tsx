import Link from "next/link";

export function AuthSubmit({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="block w-full rounded-[15px] bg-[linear-gradient(180deg,var(--color-cta-from),var(--color-cta-to))] p-[15px] text-center text-[16px] font-extrabold leading-[normal] text-white shadow-auth-cta"
    >
      {children}
    </Link>
  );
}
