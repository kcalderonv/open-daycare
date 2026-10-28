import { Suspense } from "react";
import { AppShellSkeleton } from "@/app/_components/app-shell-skeleton";
import { FamilyShell } from "@/app/_components/family-shell";
import { requireRole } from "@/app/_lib/auth";
import {
  familyFooterLabel,
  getFamilyOverview,
} from "@/app/_lib/family-queries";

export const instant = false;

export default function FamilyLayout({
  children,
}: LayoutProps<"/familia">) {
  return (
    <Suspense fallback={<AppShellSkeleton />}>
      <AuthenticatedFamilyShell>{children}</AuthenticatedFamilyShell>
    </Suspense>
  );
}

async function AuthenticatedFamilyShell({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireRole(["parent"]);
  const overview = await getFamilyOverview();

  return (
    <FamilyShell
      user={user}
      daycareName={overview.daycareName}
      footerSubtitle={familyFooterLabel(overview.children)}
    >
      {children}
    </FamilyShell>
  );
}
