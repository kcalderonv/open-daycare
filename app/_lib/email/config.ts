import "server-only";

export type EmailProvider = "resend" | "mailtrap" | "smtp";

export const EMAIL_SEND_TIMEOUT_MS = 10_000;

type BaseConfig = { from: string; timeoutMs: number };

export type EmailConfig =
  | (BaseConfig & { provider: "resend"; apiKey: string })
  | (BaseConfig & {
      provider: "mailtrap";
      host: string;
      port: number;
      secure: boolean;
      user: string;
      password: string;
    })
  | (BaseConfig & {
      provider: "smtp";
      host: string;
      port: number;
      secure: boolean;
      auth?: { user: string; password: string };
    });

export type ResolveEmailConfigResult =
  | { ok: true; config: EmailConfig }
  | { ok: false; reason: "config"; detail: string };

const PROVIDERS: readonly EmailProvider[] = ["resend", "mailtrap", "smtp"];
const DEFAULT_RESEND_FROM = "OpenDayCare <onboarding@resend.dev>";
const DEFAULT_MAILTRAP_PORT = 2525;
const DEFAULT_SMTP_PORT = 25;

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();

  return value ? value : undefined;
}

function configError(detail: string): ResolveEmailConfigResult {
  return { ok: false, reason: "config", detail };
}

function readPort(name: string, fallback: number): number | null {
  const raw = readEnv(name);

  if (!raw) {
    return fallback;
  }

  const port = Number(raw);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    return null;
  }

  return port;
}

type ProviderResolution =
  | { ok: true; provider: EmailProvider }
  | { ok: false; detail: string };

function resolveProvider(): ProviderResolution {
  const raw = readEnv("EMAIL_PROVIDER")?.toLowerCase();
  const isProduction = process.env.NODE_ENV === "production";

  if (!raw) {
    if (isProduction) {
      return {
        ok: false,
        detail: "EMAIL_PROVIDER is required in production (expected smtp)",
      };
    }

    return { ok: true, provider: "resend" };
  }

  if (!PROVIDERS.includes(raw as EmailProvider)) {
    return { ok: false, detail: `unknown EMAIL_PROVIDER "${raw}"` };
  }

  const provider = raw as EmailProvider;

  if (isProduction && provider !== "smtp") {
    return {
      ok: false,
      detail: `EMAIL_PROVIDER "${provider}" is not allowed in production`,
    };
  }

  return { ok: true, provider };
}

function resolveResend(): ResolveEmailConfigResult {
  const apiKey = readEnv("RESEND_API_KEY");

  if (!apiKey) {
    return configError("RESEND_API_KEY is missing");
  }

  return {
    ok: true,
    config: {
      provider: "resend",
      apiKey,
      from: readEnv("EMAIL_FROM") ?? DEFAULT_RESEND_FROM,
      timeoutMs: EMAIL_SEND_TIMEOUT_MS,
    },
  };
}

function resolveMailtrap(): ResolveEmailConfigResult {
  const host = readEnv("MAILTRAP_HOST");
  const user = readEnv("MAILTRAP_USER");
  const password = readEnv("MAILTRAP_PASSWORD");
  const from = readEnv("EMAIL_FROM");

  if (!host) {
    return configError("MAILTRAP_HOST is missing");
  }

  if (!user) {
    return configError("MAILTRAP_USER is missing");
  }

  if (!password) {
    return configError("MAILTRAP_PASSWORD is missing");
  }

  if (!from) {
    return configError("EMAIL_FROM is required with mailtrap");
  }

  const port = readPort("MAILTRAP_PORT", DEFAULT_MAILTRAP_PORT);

  if (port === null) {
    return configError("MAILTRAP_PORT is not a valid port");
  }

  return {
    ok: true,
    config: {
      provider: "mailtrap",
      host,
      port,
      secure: port === 465,
      user,
      password,
      from,
      timeoutMs: EMAIL_SEND_TIMEOUT_MS,
    },
  };
}

function resolveSmtp(): ResolveEmailConfigResult {
  const host = readEnv("SMTP_HOST");
  const user = readEnv("SMTP_USER");
  const password = readEnv("SMTP_PASSWORD");
  const from = readEnv("EMAIL_FROM");

  if (!host) {
    return configError("SMTP_HOST is missing");
  }

  if (!from) {
    return configError("EMAIL_FROM is required with smtp");
  }

  if (user && !password) {
    return configError("SMTP_PASSWORD is required when SMTP_USER is set");
  }

  if (!user && password) {
    return configError("SMTP_USER is required when SMTP_PASSWORD is set");
  }

  const port = readPort("SMTP_PORT", DEFAULT_SMTP_PORT);

  if (port === null) {
    return configError("SMTP_PORT is not a valid port");
  }

  return {
    ok: true,
    config: {
      provider: "smtp",
      host,
      port,
      secure: port === 465,
      auth: user && password ? { user, password } : undefined,
      from,
      timeoutMs: EMAIL_SEND_TIMEOUT_MS,
    },
  };
}

/**
 * Resolved on every send, never at import time: `next build` runs with
 * NODE_ENV=production and a top-level check would fail the build.
 */
export function resolveEmailConfig(): ResolveEmailConfigResult {
  const resolution = resolveProvider();

  if (!resolution.ok) {
    return configError(resolution.detail);
  }

  switch (resolution.provider) {
    case "resend":
      return resolveResend();
    case "mailtrap":
      return resolveMailtrap();
    case "smtp":
      return resolveSmtp();
  }
}
