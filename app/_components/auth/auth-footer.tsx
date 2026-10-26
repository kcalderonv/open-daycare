import Link from "next/link";

export function AuthFooter({
  text,
  linkLabel,
  href,
  className,
}: {
  text: string;
  linkLabel: string;
  href: string;
  className?: string;
}) {
  return (
    <p className={`text-center text-[14.5px] text-muted ${className ?? ""}`}>
      {text}{" "}
      <Link href={href} className="font-extrabold text-coral-link">
        {linkLabel}
      </Link>
    </p>
  );
}
