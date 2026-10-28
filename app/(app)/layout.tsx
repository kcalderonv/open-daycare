import { Suspense } from "react";
import { AppShell } from "@/app/_components/app-shell";
import { AppShellSkeleton } from "@/app/_components/app-shell-skeleton";
import { PostComposerProvider } from "@/app/_components/feed/post-composer-provider";
import { getCurrentUser } from "@/app/_lib/auth";
import {
  getComposerAudience,
  getDaycareOverview,
} from "@/app/_lib/post-queries";

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
  const canPublish = user.role !== "parent";
  const [overview, audience] = await Promise.all([
    getDaycareOverview(),
    canPublish ? getComposerAudience(user.daycareId) : Promise.resolve(null),
  ]);

  const shell = (
    <AppShell user={user} daycareName={overview.name} canPublish={canPublish}>
      {children}
    </AppShell>
  );

  if (!audience) {
    return shell;
  }

  return (
    <PostComposerProvider
      audience={audience}
      user={{ id: user.id, daycareId: user.daycareId }}
    >
      {shell}
    </PostComposerProvider>
  );
}
