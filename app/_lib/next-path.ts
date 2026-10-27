const SAFE_ORIGIN = "http://opendaycare.local";

/**
 * Accepts only same-origin relative paths. Anything else falls back to "/" so
 * the `next` parameter can never redirect outside the app.
 */
export function resolveNextPath(value: string | null | undefined): string {
  if (!value) {
    return "/";
  }

  if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/";
  }

  const url = new URL(value, SAFE_ORIGIN);

  if (url.origin !== SAFE_ORIGIN) {
    return "/";
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
