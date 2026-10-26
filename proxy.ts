import { NextResponse, type NextRequest } from "next/server";
import { children } from "@/app/_data/children";

const CHILD_IDS = new Set(children.map(({ id }) => id));

// Unknown child slugs must answer 404 before the PPR shell is streamed, otherwise
// the not-found UI would arrive after a 200 response.
export function proxy(request: NextRequest) {
  const id = request.nextUrl.pathname.split("/")[2];

  if (!CHILD_IDS.has(id)) {
    return new NextResponse(null, { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/ninos/:id",
};
