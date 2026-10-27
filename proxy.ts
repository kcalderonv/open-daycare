import { NextResponse, type NextRequest } from "next/server";
import { children } from "@/app/_data/children";
import { resolveNextPath } from "@/app/_lib/next-path";
import { updateSession } from "@/utils/supabase/middleware";

const CHILD_IDS = new Set(children.map(({ id }) => id));

const PUBLIC_PATHS = new Set(["/login", "/activar-cuenta"]);

/**
 * Builds a redirect that keeps the auth cookies written while refreshing the
 * session, so navigating to the login page never drops a rotated token.
 */
function redirectWithCookies(
  request: NextRequest,
  path: string,
  source: NextResponse,
) {
  const redirect = NextResponse.redirect(new URL(path, request.url));
  source.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));

  return redirect;
}

export async function proxy(request: NextRequest) {
  // Refreshing the session first keeps the auth cookies in sync with whatever
  // this request returns, including the 404 and the redirects below.
  const { response, claims } = await updateSession(request);

  const { pathname, search } = request.nextUrl;

  // Unknown child slugs must answer 404 before the PPR shell is streamed,
  // otherwise the not-found UI would arrive after a 200 response.
  const isChildDetail = pathname.startsWith("/ninos/");
  const childId = pathname.split("/")[2];

  if (isChildDetail && !CHILD_IDS.has(childId)) {
    const notFound = new NextResponse(null, { status: 404 });
    response.cookies.getAll().forEach((cookie) => notFound.cookies.set(cookie));
    return notFound;
  }

  const isAuthenticated = Boolean(claims?.sub);

  if (!isAuthenticated && !PUBLIC_PATHS.has(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return redirectWithCookies(request, loginUrl.toString(), response);
  }

  // `error` is what keeps a session without profile out of a redirect loop
  // between this rule and the redirect that `getCurrentUser` throws.
  if (
    isAuthenticated &&
    pathname === "/login" &&
    !request.nextUrl.searchParams.has("error")
  ) {
    const next = request.nextUrl.searchParams.get("next");
    return redirectWithCookies(request, resolveNextPath(next), response);
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except Next.js internals and static assets: the session
    // refresh has to run on page and server action requests alike.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
