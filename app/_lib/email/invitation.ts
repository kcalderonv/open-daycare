import "server-only";

import {
  buildInvitationEmailHtml,
  buildInvitationEmailSubject,
  type InvitationEmailInput,
} from "@/app/_lib/email/invitation-email";
import { sendEmail, type SendEmailResult } from "@/app/_lib/email/send-email";

type SendInvitationParams = InvitationEmailInput & { to: string };

export async function sendInvitationEmail({
  to,
  ...input
}: SendInvitationParams): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: buildInvitationEmailSubject(input),
    html: buildInvitationEmailHtml(input),
  });
}
