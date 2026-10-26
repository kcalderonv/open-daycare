import type { Metadata } from "next";
import { AuthField } from "@/app/_components/auth/auth-field";
import { AuthFooter } from "@/app/_components/auth/auth-footer";
import { AuthLogo } from "@/app/_components/auth/auth-logo";
import { AuthSubmit } from "@/app/_components/auth/auth-submit";
import { ConsentCheckbox } from "@/app/_components/auth/consent-checkbox";
import { InviteSummary } from "@/app/_components/auth/invite-summary";
import { invite } from "@/app/_data/auth";

export const metadata: Metadata = {
  title: "Activar cuenta · OpenDayCare",
};

export default function ActivateAccountPage() {
  return (
    <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
      <div className="w-full max-w-[440px]">
        <AuthLogo variant="brand" className="mb-[22px]" />

        <h1 className="mb-2 font-display text-[32px] font-semibold leading-[1.15] text-ink">
          Bienvenida a OpenDayCare
        </h1>
        <p className="mb-[26px] text-[15.5px] leading-[1.55] text-muted">
          Te invitaron a seguir el día de tu hijo. Creá tu contraseña para
          activar la cuenta.
        </p>

        <InviteSummary />

        <AuthField
          id="activation-code"
          label="CÓDIGO DE INVITACIÓN"
          name="invitationCode"
          variant="code"
          autoComplete="off"
          defaultValue={invite.invitationCode}
          className="mb-[18px]"
        />

        <AuthField
          id="activation-email"
          label="EMAIL"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={invite.email}
          className="mb-[18px]"
        />

        <AuthField
          id="activation-password"
          label="CREAR CONTRASEÑA"
          name="password"
          variant="password"
          autoComplete="new-password"
          defaultValue="contraseña"
          highlighted
          className="mb-[18px]"
        />

        <ConsentCheckbox label="Autorizo a la guardería a tomar y compartir fotos de mi hijo dentro de la app." />

        <AuthSubmit href="/">Activar mi cuenta</AuthSubmit>

        <AuthFooter
          text="¿Ya tenés cuenta?"
          linkLabel="Iniciar sesión"
          href="/login"
          className="mt-[22px]"
        />
      </div>
    </div>
  );
}
