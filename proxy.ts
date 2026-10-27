import { NextResponse, type NextRequest } from "next/server";
import { children } from "@/app/_data/children";
import { updateSession } from "@/utils/supabase/middleware";

const CHILD_IDS = new Set(children.map(({ id }) => id));

export async function proxy(request: NextRequest) {
  // Refreshing the session first keeps the auth cookies in sync with whatever
  // this request returns, including the 404 below.
  const response = await updateSession(request);

  const childId = request.nextUrl.pathname.split("/")[2];

  // Unknown child slugs must answer 404 before the PPR shell is streamed,
  // otherwise the not-found UI would arrive after a 200 response.
  const isChildDetail = request.nextUrl.pathname.startsWith("/ninos/");

  if (isChildDetail && !CHILD_IDS.has(childId)) {
    const notFound = new NextResponse(null, { status: 404 });
    response.cookies.getAll().forEach((cookie) => notFound.cookies.set(cookie));
    return notFound;
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
