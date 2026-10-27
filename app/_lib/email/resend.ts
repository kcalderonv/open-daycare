import "server-only";

import { Resend } from "resend";
import {
  buildInvitationEmailHtml,
  buildInvitationEmailSubject,
  type InvitationEmailInput,
} from "@/app/_lib/email/invitation-email";

const DEFAULT_FROM = "OpenDayCare <onboarding@resend.dev>";

export type SendInvitationResult =
  | { ok: true }
  | { ok: false; reason: "config" | "provider" };

type SendInvitationParams = InvitationEmailInput & { to: string };

/**
 * The client is built per call: a module-level `new Resend(undefined)` would
 * capture the key during the build, when the runtime env is not loaded.
 */
export async function sendInvitationEmail({
  to,
  ...input
}: SendInvitationParams): Promise<SendInvitationResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();

  if (!apiKey) {
    return { ok: false, reason: "config" };
  }

  const from = process.env.RESEND_FROM_EMAIL?.trim() || DEFAULT_FROM;
  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from,
    to: [to],
    subject: buildInvitationEmailSubject(input),
    html: buildInvitationEmailHtml(input),
  });

  if (error) {
    console.error("Resend rejected the invitation email:", error.message);

    return { ok: false, reason: "provider" };
  }

  return { ok: true };
}
