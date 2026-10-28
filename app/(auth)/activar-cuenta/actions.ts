"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getInvitationPreview } from "@/app/_lib/invitation-queries";
import { normalizeInvitationCode } from "@/app/_lib/invitations";
import { createClient } from "@/utils/supabase/server";

export type ActivationState = { error: string | null };

const MESSAGES = {
  code: "Necesitás el enlace del correo para activar tu cuenta.",
  password: "La contraseña debe tener al menos 8 caracteres.",
  consent: "Marcá la autorización para continuar.",
  account: "No pudimos crear tu cuenta. Si ya tenés una, iniciá sesión.",
  link: "No pudimos vincular tu cuenta. Pedile a la guardería que te envíe otra invitación.",
  unavailable:
    "Esa invitación ya no está disponible. Pedile a la guardería que te envíe otra.",
} as const;

export async function activateAccount(
  _previousState: ActivationState,
  formData: FormData,
): Promise<ActivationState> {
  const code = normalizeInvitationCode(String(formData.get("code") ?? ""));
  const password = String(formData.get("password") ?? "");
  const consent = formData.get("photo-consent") === "on";

  if (code === "") {
    return { error: MESSAGES.code };
  }

  if (password.length < 8) {
    return { error: MESSAGES.password };
  }

  if (!consent) {
    return { error: MESSAGES.consent };
  }

  let preview;

  try {
    preview = await getInvitationPreview(code);
  } catch {
    return { error: MESSAGES.unavailable };
  }

  if (preview.status !== "pending") {
    return { error: MESSAGES.unavailable };
  }

  const supabase = createClient(await cookies());
  const { data, error } = await supabase.auth.signUp({
    email: preview.email,
    password,
    options: { data: { full_name: preview.parentFullName } },
  });

  // Without a session there is nothing to bind the invitation to. This also
  // covers an email that already exists: Supabase answers with a fake user
  // and no session, so the flow never takes over someone else's account.
  if (error || !data.session) {
    return { error: MESSAGES.account };
  }

  const { error: acceptError } = await supabase.rpc("accept_invitation", {
    p_code: code,
  });

  if (acceptError) {
    console.error("Invitation could not be accepted:", acceptError.message);

    return { error: MESSAGES.link };
  }

  revalidatePath("/", "layout");
  redirect("/familia");
}
