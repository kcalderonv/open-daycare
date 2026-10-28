import { AppShell } from "@/app/_components/app-shell";
import type { NavItem } from "@/app/_components/app-sidebar-nav";
import { PostComposerTrigger } from "@/app/_components/feed/post-composer-trigger";
import { PlusIcon } from "@/app/_components/icons";
import type { CurrentUser, UserRole } from "@/app/_lib/auth";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administración",
  staff: "Maestro/a",
  parent: "Familia",
};

const STAFF_NAV: NavItem[] = [
  { label: "Feed", icon: "home", href: "/" },
  { label: "Niños", icon: "users", href: "/ninos" },
  { label: "Avisos", icon: "bell", href: "#" },
  { label: "Mi cuenta", icon: "user", href: "#" },
];

type StaffShellProps = {
  children: React.ReactNode;
  user: CurrentUser;
  daycareName: string;
};

export function StaffShell({ children, user, daycareName }: StaffShellProps) {
  return (
    <AppShell
      user={user}
      brandHref="/"
      brandSubtitle={daycareName}
      navItems={STAFF_NAV}
      footerSubtitle={ROLE_LABELS[user.role]}
      primaryAction={
        <PostComposerTrigger className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(180deg,var(--color-cta-from),var(--color-cta-to))] p-3 text-[14.5px] font-extrabold text-white shadow-cta focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2">
          <PlusIcon width={17} height={17} />
          Nueva publicación
        </PostComposerTrigger>
      }
      headerAction={
        <PostComposerTrigger className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-[linear-gradient(180deg,var(--color-cta-from),var(--color-cta-to))] px-3 py-2.5 text-[13px] font-extrabold text-white shadow-cta focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2">
          <PlusIcon width={15} height={15} />
          Nueva publicación
        </PostComposerTrigger>
      }
    >
      {children}
    </AppShell>
  );
}
