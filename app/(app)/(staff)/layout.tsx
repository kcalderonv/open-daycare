import { Suspense } from "react";
import { AppShellSkeleton } from "@/app/_components/app-shell-skeleton";
import { PostComposerProvider } from "@/app/_components/feed/post-composer-provider";
import { StaffShell } from "@/app/_components/staff-shell";
import { requireRole } from "@/app/_lib/auth";
import {
  getComposerAudience,
  getDaycareOverview,
} from "@/app/_lib/post-queries";

export const instant = false;

export default function StaffLayout({ children }: LayoutProps<"/">) {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <AuthenticatedStaffShell>{children}</AuthenticatedStaffShell>
    </Suspense>
  );
}

async function AuthenticatedStaffShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["admin", "staff"]);
  const [overview, audience] = await Promise.all([
    getDaycareOverview(),
    getComposerAudience(user.daycareId),
  ]);

  return (
    <PostComposerProvider
      audience={audience}
      user={{ id: user.id, daycareId: user.daycareId }}
    >
      <StaffShell user={user} daycareName={overview.name}>
        {children}
      </StaffShell>
    </PostComposerProvider>
  );
}
