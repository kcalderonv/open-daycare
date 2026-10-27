import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthFooter } from "@/app/_components/auth/auth-footer";
import { LoginForm } from "@/app/_components/auth/login-form";
import { LoginHero } from "@/app/_components/auth/login-hero";
import { resolveNextPath } from "@/app/_lib/next-path";

export const metadata: Metadata = {
  title: "Iniciar sesión · OpenDayCare",
};

export default function LoginPage({ searchParams }: PageProps<"/login">) {
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

          <Suspense fallback={<LoginForm nextPath="/" accountError={false} />}>
            <LoginFormWithParams searchParams={searchParams} />
          </Suspense>

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

async function LoginFormWithParams({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  const { next, error } = await searchParams;

  return (
    <LoginForm
      nextPath={resolveNextPath(typeof next === "string" ? next : null)}
      accountError={error === "no-account"}
    />
  );
}
