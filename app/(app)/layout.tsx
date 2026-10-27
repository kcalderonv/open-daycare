import { Suspense } from "react";
import { AppShell } from "@/app/_components/app-shell";
import { AppShellSkeleton } from "@/app/_components/app-shell-skeleton";
import { PostComposerProvider } from "@/app/_components/feed/post-composer-provider";
import { getCurrentUser } from "@/app/_lib/auth";

// The group blocks on the session by design, so navigations into it are not
// instant. This opts the segment out of Next's dev-only instant validation.
export const instant = false;

export default function AppGroupLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </Suspense>
  );
}

async function AuthenticatedShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <PostComposerProvider>
      <AppShell user={user}>{children}</AppShell>
    </PostComposerProvider>
  );
}
