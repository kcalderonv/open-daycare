import "server-only";

import nodemailer from "nodemailer";
import type { EmailConfig } from "@/app/_lib/email/config";
import type {
  EmailTransportResult,
  SendEmailInput,
} from "@/app/_lib/email/send-email";

type SmtpConfig = Extract<EmailConfig, { provider: "mailtrap" | "smtp" }>;

function authOf(
  config: SmtpConfig,
): { user: string; pass: string } | undefined {
  if (config.provider === "mailtrap") {
    return { user: config.user, pass: config.password };
  }

  return config.auth
    ? { user: config.auth.user, pass: config.auth.password }
    : undefined;
}

/**
 * Built per call for the same reason as the Resend client: env vars are not
 * available at build time and a module-level transport would capture them.
 */
export async function sendWithSmtp(
  config: SmtpConfig,
  input: SendEmailInput,
): Promise<EmailTransportResult> {
  const transport = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: authOf(config),
    connectionTimeout: config.timeoutMs,
    greetingTimeout: config.timeoutMs,
    socketTimeout: config.timeoutMs,
  });

  try {
    const info = await transport.sendMail({
      from: config.from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      ...(input.text ? { text: input.text } : {}),
    });

    if (info.rejected.length > 0) {
      return {
        ok: false,
        detail: `rejected recipient: ${info.rejected.join(", ")}`,
      };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      detail:
        error instanceof Error ? error.message : "unknown SMTP transport error",
    };
  } finally {
    transport.close();
  }
}
