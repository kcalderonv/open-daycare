"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { getCurrentUser } from "@/app/_lib/auth";
import { sendInvitationEmail } from "@/app/_lib/email/invitation";
import { generateInvitationCode } from "@/app/_lib/invitations";
import { getSiteUrl } from "@/app/_lib/site-url";
import type { Database } from "@/utils/supabase/database.types";
import { createClient } from "@/utils/supabase/server";

type Relationship = Database["public"]["Enums"]["relationship_type"];

export type InviteResult = { ok: true } | { ok: false; error: string };

const RELATIONSHIPS: Relationship[] = ["mother", "father", "guardian"];
const NAME_PATTERN = /^[\p{L}\s'’-]+$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[A-Za-z]{2,}$/;
const CODE_ATTEMPTS = 3;

const MESSAGES = {
  emailTaken:
    "Ese email ya tiene una cuenta. Pedile a la guardería que vincule al niño.",
  sendFailed:
    "No pudimos enviar la invitación. Intentá de nuevo en unos minutos.",
  generic: "No pudimos crear la invitación. Intentá de nuevo.",
} as const;

type InviteInput = {
  fullName: string;
  email: string;
  relationship: Relationship;
};

function readInput(formData: FormData): InviteInput | null {
  const fullName = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const relationship = String(
    formData.get("relationship") ?? "",
  ) as Relationship;

  if (
    fullName.length < 2 ||
    fullName.length > 60 ||
    !NAME_PATTERN.test(fullName)
  ) {
    return null;
  }

  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return null;
  }

  if (!RELATIONSHIPS.includes(relationship)) {
    return null;
  }

  return { fullName, email, relationship };
}

function firstNameOf(fullName: string): string {
  return fullName.split(/\s+/)[0] ?? fullName;
}

/**
 * Creates (or reuses) one pending invitation and hands it to Resend.
 * `sent_at` stays null when the provider fails, so retrying the same form
 * resends the same code instead of piling up dead invitations.
 */
export async function inviteParent(
  childId: string,
  formData: FormData,
): Promise<InviteResult> {
  const user = await getCurrentUser();
  const input = readInput(formData);

  if (!input) {
    return { ok: false, error: MESSAGES.generic };
  }

  const supabase = createClient(await cookies());

  const { data: child, error: childError } = await supabase
    .from("children")
    .select("id, full_name, room_id")
    .eq("id", childId)
    .eq("daycare_id", user.daycareId)
    .eq("status", "active")
    .maybeSingle();

  if (childError || !child) {
    return { ok: false, error: MESSAGES.generic };
  }

  const { data: room } = child.room_id
    ? await supabase
        .from("rooms")
        .select("name")
        .eq("id", child.room_id)
        .maybeSingle()
    : { data: null };

  const { data: hasAccount, error: accountError } = await supabase.rpc(
    "email_has_account",
    { p_email: input.email },
  );

  if (accountError) {
    return { ok: false, error: MESSAGES.generic };
  }

  if (hasAccount) {
    return { ok: false, error: MESSAGES.emailTaken };
  }

  const { data: pendingRows, error: pendingError } = await supabase
    .from("invitations")
    .select("id, code, sent_at, expires_at")
    .eq("child_id", childId)
    .eq("status", "pending")
    .eq("email", input.email)
    .limit(1);

  if (pendingError) {
    return { ok: false, error: MESSAGES.generic };
  }

  const pending = pendingRows?.[0];
  let invitationId: string | null = null;
  let invitationCode: string | null = null;

  if (pending) {
    if (new Date(pending.expires_at).getTime() <= Date.now()) {
      await supabase
        .from("invitations")
        .update({ status: "expired" })
        .eq("id", pending.id);
    } else if (pending.sent_at) {
      await supabase
        .from("invitations")
        .update({ status: "cancelled" })
        .eq("id", pending.id);
    } else {
      const { error } = await supabase
        .from("invitations")
        .update({ full_name: input.fullName, relationship: input.relationship })
        .eq("id", pending.id);

      if (error) {
        return { ok: false, error: MESSAGES.generic };
      }

      invitationId = pending.id;
      invitationCode = pending.code;
    }
  }

  for (
    let attempt = 0;
    invitationId === null && attempt < CODE_ATTEMPTS;
    attempt += 1
  ) {
    const code = generateInvitationCode();
    const { data, error } = await supabase
      .from("invitations")
      .insert({
        daycare_id: user.daycareId,
        child_id: childId,
        invited_by: user.id,
        full_name: input.fullName,
        email: input.email,
        relationship: input.relationship,
        code,
      })
      .select("id")
      .single();

    if (!error) {
      invitationId = data.id;
      invitationCode = code;
      break;
    }

    // Only a code collision is retryable; anything else is a real failure.
    if (
      error.code !== "23505" ||
      !error.message.includes("invitations_code_key")
    ) {
      return { ok: false, error: MESSAGES.generic };
    }
  }

  if (!invitationId || !invitationCode) {
    return { ok: false, error: MESSAGES.generic };
  }

  const siteUrl = await getSiteUrl();
  const sendResult = await sendInvitationEmail({
    to: input.email,
    parentFullName: input.fullName,
    childFullName: child.full_name,
    childFirstName: firstNameOf(child.full_name),
    roomName: room?.name ?? "",
    code: invitationCode,
    activationUrl: `${siteUrl}/activar-cuenta?code=${encodeURIComponent(invitationCode)}`,
  });

  if (!sendResult.ok) {
    return { ok: false, error: MESSAGES.sendFailed };
  }

  const { error: sentError } = await supabase
    .from("invitations")
    .update({ sent_at: new Date().toISOString() })
    .eq("id", invitationId);

  if (sentError) {
    // The email is already out; failing here would invite a duplicate send.
    console.error("Invitation sent without sent_at:", sentError.message);
  }

  revalidatePath("/ninos", "layout");

  return { ok: true };
}
