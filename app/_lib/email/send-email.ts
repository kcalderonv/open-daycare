import "server-only";

import { resolveEmailConfig, type EmailConfig } from "@/app/_lib/email/config";
import { sendWithResend } from "@/app/_lib/email/transports/resend";
import { sendWithSmtp } from "@/app/_lib/email/transports/smtp";

export type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export type EmailTransportResult =
  | { ok: true }
  | { ok: false; detail: string };

export type SendEmailResult =
  | { ok: true }
  | { ok: false; reason: "config" | "provider" | "timeout" };

type DispatchResult =
  | { ok: true }
  | { ok: false; reason: "provider" | "timeout"; detail: string };

let hasWarnedAboutLegacyFrom = false;

function warnAboutLegacyFrom(): void {
  if (hasWarnedAboutLegacyFrom) {
    return;
  }

  const hasFrom = Boolean(process.env.EMAIL_FROM?.trim());
  const hasLegacyFrom = Boolean(process.env.RESEND_FROM_EMAIL?.trim());

  if (!hasFrom && hasLegacyFrom) {
    hasWarnedAboutLegacyFrom = true;
    console.warn(
      "RESEND_FROM_EMAIL is deprecated: rename it to EMAIL_FROM. The legacy value is ignored.",
    );
  }
}

function dispatch(
  config: EmailConfig,
  input: SendEmailInput,
): Promise<EmailTransportResult> {
  switch (config.provider) {
    case "resend":
      return sendWithResend(config, input);
    case "mailtrap":
    case "smtp":
      return sendWithSmtp(config, input);
  }
}

async function dispatchWithTimeout(
  config: EmailConfig,
  input: SendEmailInput,
): Promise<DispatchResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<{ timedOut: true }>((resolve) => {
    timer = setTimeout(() => resolve({ timedOut: true }), config.timeoutMs);
  });

  try {
    const raced = await Promise.race([
      dispatch(config, input).then((value) => ({
        timedOut: false as const,
        value,
      })),
      timeout,
    ]);

    if (raced.timedOut) {
      return {
        ok: false,
        reason: "timeout",
        detail: `no response from ${config.provider} in ${config.timeoutMs} ms`,
      };
    }

    if (!raced.value.ok) {
      return { ok: false, reason: "provider", detail: raced.value.detail };
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      reason: "provider",
      detail: error instanceof Error ? error.message : "unknown email error",
    };
  } finally {
    if (timer) {
      clearTimeout(timer);
    }
  }
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  warnAboutLegacyFrom();

  const resolved = resolveEmailConfig();

  if (!resolved.ok) {
    console.error("Email send failed", {
      provider: process.env.EMAIL_PROVIDER?.trim() || "unset",
      reason: "config",
      detail: resolved.detail,
    });

    return { ok: false, reason: "config" };
  }

  const result = await dispatchWithTimeout(resolved.config, input);

  if (result.ok) {
    return { ok: true };
  }

  console.error("Email send failed", {
    provider: resolved.config.provider,
    reason: result.reason,
    detail: result.detail,
  });

  return { ok: false, reason: result.reason };
}
