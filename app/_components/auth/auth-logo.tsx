import { SunIcon } from "@/app/_components/icons";

export type AuthLogoVariant = "hero" | "brand";

type AuthLogoStyle = {
  box: string;
  icon: number;
};

const LOGO_STYLES: Record<AuthLogoVariant, AuthLogoStyle> = {
  hero: { box: "size-[46px] rounded-[14px] bg-white/22", icon: 26 },
  brand: {
    box: "size-[58px] rounded-[18px] bg-[linear-gradient(155deg,var(--color-logo-from),var(--color-coral))] shadow-auth-logo",
    icon: 30,
  },
};

export function AuthLogo({
  variant,
  className,
}: {
  variant: AuthLogoVariant;
  className?: string;
}) {
  const style = LOGO_STYLES[variant];

  return (
    <div
      className={`flex flex-none items-center justify-center ${style.box} ${className ?? ""}`}
    >
      <SunIcon width={style.icon} height={style.icon} className="text-white" />
    </div>
  );
}
