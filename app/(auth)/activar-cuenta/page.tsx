import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ActivationForm } from "@/app/_components/auth/activation-form";
import { AuthLogo } from "@/app/_components/auth/auth-logo";
import { getInvitationPreview } from "@/app/_lib/invitation-queries";
import {
  normalizeInvitationCode,
  type InvitationStatus,
} from "@/app/_lib/invitations";

export const metadata: Metadata = {
  title: "Activar cuenta · OpenDayCare",
};

const STATUS_COPY: Record<Exclude<InvitationStatus, "pending">, string> = {
  not_found: "No encontramos esa invitación.",
  expired: "Esa invitación venció. Pedile a la guardería que te envíe una nueva.",
  accepted: "Esa invitación ya fue usada. Iniciá sesión para entrar.",
  cancelled:
    "Esa invitación fue cancelada. Pedile a la guardería que te envíe una nueva.",
};

export default function ActivateAccountPage({
  searchParams,
}: PageProps<"/activar-cuenta">) {
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

        <Suspense fallback={<div className="h-[420px]" />}>
          <ActivationContent searchParams={searchParams} />
        </Suspense>
      </div>
    </div>
  );
}

async function ActivationContent({
  searchParams,
}: {
  searchParams: PageProps<"/activar-cuenta">["searchParams"];
}) {
  // Supabase resolves session expiry with Date.now(); deferring to request
  // time keeps that read out of the prerender pass, same as getCurrentUser.
  await connection();

  const { code: rawCode } = await searchParams;
  const code = normalizeInvitationCode(
    typeof rawCode === "string" ? rawCode : "",
  );

  if (code === "") {
    return (
      <InvitationNotice message="Necesitás el enlace que te llegó por correo." />
    );
  }

  let preview;

  try {
    preview = await getInvitationPreview(code);
  } catch {
    return (
      <InvitationNotice message="No pudimos verificar la invitación. Recargá la página." />
    );
  }

  if (preview.status !== "pending") {
    return <InvitationNotice message={STATUS_COPY[preview.status]} />;
  }

  return <ActivationForm code={code} preview={preview} />;
}

function InvitationNotice({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border-[1.5px] border-auth-input-border bg-white px-5 py-6 text-center">
      <p className="text-[15px] font-bold leading-[1.5] text-ink">{message}</p>
      <Link
        href="/login"
        className="mt-4 inline-block text-[13.5px] font-bold text-coral-link"
      >
        Ir a iniciar sesión
      </Link>
    </div>
  );
}
