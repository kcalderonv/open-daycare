import { AuthLogo } from "@/app/_components/auth/auth-logo";

export function LoginHero() {
  return (
    <div className="relative hidden flex-col justify-between overflow-hidden bg-[linear-gradient(155deg,var(--color-auth-hero-from),var(--color-auth-hero-mid)_45%,var(--color-auth-hero-to))] px-[60px] py-14 text-white lg:flex">
      <div
        aria-hidden="true"
        className="absolute -right-[120px] -top-[140px] size-[420px] rounded-full bg-white/12"
      />
      <div
        aria-hidden="true"
        className="absolute -bottom-[110px] -left-20 size-[300px] rounded-full bg-white/10"
      />

      <div className="relative flex items-center gap-[13px]">
        <AuthLogo variant="hero" />
        <span className="font-display text-[21px] font-semibold tracking-[.5px]">
          OpenDayCare
        </span>
      </div>

      <div className="relative">
        <h1 className="mb-[18px] font-display text-[42px] font-semibold leading-[1.12]">
          El día de cada niño,
          <br />
          compartido con su familia.
        </h1>
        <p className="max-w-[430px] text-[17px] leading-[1.6] text-white/92">
          Publicá momentos, gestioná las salas y mantené a las familias cerca,
          desde un solo lugar.
        </p>
      </div>

      <div className="relative text-sm text-white/90">🌿 Guardería Sala Soles</div>
    </div>
  );
}
