import "server-only";

import { Resend } from "resend";
import type { EmailConfig } from "@/app/_lib/email/config";
import type {
  EmailTransportResult,
  SendEmailInput,
} from "@/app/_lib/email/send-email";

type ResendConfig = Extract<EmailConfig, { provider: "resend" }>;

/**
 * The client is built per call: a module-level `new Resend(undefined)` would
 * capture the key during the build, when the runtime env is not loaded.
 */
export async function sendWithResend(
  config: ResendConfig,
  input: SendEmailInput,
): Promise<EmailTransportResult> {
  const resend = new Resend(config.apiKey);

  const { error } = await resend.emails.send({
    from: config.from,
    to: [input.to],
    subject: input.subject,
    html: input.html,
    ...(input.text ? { text: input.text } : {}),
  });

  if (error) {
    return { ok: false, detail: error.message };
  }

  return { ok: true };
}
