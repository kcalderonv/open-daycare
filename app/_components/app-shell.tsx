import type { ReactNode } from "react";
import Link from "next/link";
import { signOut } from "@/app/(app)/actions";
import {
  AppSidebarNav,
  type NavItem,
} from "@/app/_components/app-sidebar-nav";
import { Brand } from "@/app/_components/brand";
import { LogOutIcon } from "@/app/_components/icons";
import type { CurrentUser } from "@/app/_lib/auth";

type AppShellProps = {
  children: ReactNode;
  user: CurrentUser;
  brandHref: string;
  brandSubtitle: string;
  navItems: NavItem[];
  footerSubtitle: string;
  /** Desktop action rendered above the navigation. */
  primaryAction?: ReactNode;
  /** Compact action rendered in the mobile top bar. */
  headerAction?: ReactNode;
};

/**
 * Shared visual frame for both panels: aside width, top bar, scrolling main
 * and the identity footer. The navigation, the primary action and the footer
 * copy are data so each panel stays a thin composition.
 */
export function AppShell({
  children,
  user,
  brandHref,
  brandSubtitle,
  navItems,
  footerSubtitle,
  primaryAction,
  headerAction,
}: AppShellProps) {
  const initial = user.fullName.trim().charAt(0).toUpperCase();

  return (
    <div className="flex min-h-dvh flex-1 bg-cream">
      <aside className="sticky top-0 hidden h-dvh w-[248px] flex-none flex-col border-r border-border bg-surface px-4 py-6 shell:flex">
        <Link
          href={brandHref}
          className="flex items-center gap-[11px] px-2 pb-[22px] pt-1"
        >
          <Brand subtitle={brandSubtitle} />
        </Link>

        {primaryAction ? <div className="mb-[18px]">{primaryAction}</div> : null}

        <AppSidebarNav items={navItems} />

        <div className="mt-[10px] border-t border-border pt-[14px]">
          <div className="flex items-center gap-[11px] px-2 py-1.5">
            <div className="flex size-[38px] flex-none items-center justify-center rounded-full bg-coral font-display text-base font-semibold text-white">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-extrabold text-ink">
                {user.fullName}
              </div>
              <div className="text-xs text-muted-soft">{footerSubtitle}</div>
            </div>
            <form action={signOut}>
              <button
                type="submit"
                title="Cerrar sesión"
                aria-label="Cerrar sesión"
                className="flex size-8 flex-none cursor-pointer items-center justify-center rounded-[10px] bg-cream text-muted"
              >
                <LogOutIcon width={16} height={16} />
              </button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col shell:h-dvh">
        <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 shell:hidden">
          <Brand subtitle={brandSubtitle} />
          <span className="flex-1" />
          {headerAction}
        </header>

        <main className="flex-1 shell:overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
