import { AppShell } from "@/app/_components/app-shell";
import type { NavItem } from "@/app/_components/app-sidebar-nav";
import type { CurrentUser } from "@/app/_lib/auth";

const FAMILY_NAV: NavItem[] = [
  { label: "Feed", icon: "home", href: "/familia" },
  { label: "Resumen del día", icon: "sun", href: "#" },
  { label: "Mi cuenta", icon: "user", href: "#" },
];

type FamilyShellProps = {
  children: React.ReactNode;
  user: CurrentUser;
  daycareName: string;
  footerSubtitle: string;
};

export function FamilyShell({
  children,
  user,
  daycareName,
  footerSubtitle,
}: FamilyShellProps) {
  return (
    <AppShell
      user={user}
      brandHref="/familia"
      brandSubtitle={daycareName}
      navItems={FAMILY_NAV}
      footerSubtitle={footerSubtitle}
    >
      {children}
    </AppShell>
  );
}
