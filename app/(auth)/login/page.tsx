import type { Metadata } from "next";
import Link from "next/link";
import { AuthField } from "@/app/_components/auth/auth-field";
import { AuthFooter } from "@/app/_components/auth/auth-footer";
import { AuthSubmit } from "@/app/_components/auth/auth-submit";
import { LoginHero } from "@/app/_components/auth/login-hero";

export const metadata: Metadata = {
  title: "Iniciar sesión · OpenDayCare",
};

export default function LoginPage() {
  return (
    <div className="grid flex-1 lg:grid-cols-[1.05fr_1fr]">
      <LoginHero />

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-[392px]">
          <h1 className="mb-1.5 font-display text-[30px] font-semibold text-ink">
            Iniciar sesión
          </h1>
          <p className="mb-7 text-[15px] text-muted">
            Ingresá para ver el día de hoy.
          </p>

          <AuthField
            id="login-email"
            label="EMAIL"
            name="email"
            type="email"
            autoComplete="email"
            defaultValue="caro@opendaycare.com"
            className="mb-[18px]"
          />

          <AuthField
            id="login-password"
            label="CONTRASEÑA"
            name="password"
            variant="password"
            autoComplete="current-password"
            placeholder="••••••••"
            className="mb-2.5"
          />

          <div className="mb-5 text-right">
            <Link
              href="#"
              className="text-[13.5px] font-bold text-coral-link"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <AuthSubmit href="/">Iniciar sesión</AuthSubmit>

          <AuthFooter
            text="¿Te invitó la guardería?"
            linkLabel="Activá tu cuenta"
            href="/activar-cuenta"
            className="mt-6"
          />
        </div>
      </div>
    </div>
  );
}
