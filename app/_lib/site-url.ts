import { headers } from "next/headers";

/**
 * Absolute base URL for links that leave the app (the invitation email).
 * `NEXT_PUBLIC_APP_URL` wins when set; otherwise the request headers are the
 * only thing that works in both `next dev` and a real deployment.
 */
export async function getSiteUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();

  if (configured) {
    return configured.replace(/\/+$/, "");
  }

  const headerStore = await headers();
  const host =
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host") ??
    "localhost:3000";
  const isLocal = host.startsWith("localhost") || host.startsWith("127.0.0.1");
  const protocol =
    headerStore.get("x-forwarded-proto") ?? (isLocal ? "http" : "https");

  return `${protocol}://${host}`;
}
