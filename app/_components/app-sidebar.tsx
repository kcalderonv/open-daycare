import type { ComponentType } from "react";
import Link from "next/link";
import { Brand } from "@/app/_components/brand";
import {
  BellIcon,
  HomeIcon,
  LogOutIcon,
  PlusIcon,
  UserIcon,
  UsersIcon,
  type IconProps,
} from "@/app/_components/icons";
import { currentUser } from "@/app/_data/feed";

type NavItem = {
  label: string;
  icon: ComponentType<IconProps>;
  active?: boolean;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Feed", icon: HomeIcon, active: true },
  { label: "Niños", icon: UsersIcon },
  { label: "Avisos", icon: BellIcon },
  { label: "Mi cuenta", icon: UserIcon },
];

export function AppSidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[248px] flex-none flex-col border-r border-border bg-surface px-4 py-6 shell:flex">
      <Link href="#" className="flex items-center gap-[11px] px-2 pb-[22px] pt-1">
        <Brand />
      </Link>

      <Link
        href="#"
        className="mb-[18px] flex items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(180deg,var(--color-cta-from),var(--color-cta-to))] p-3 text-[14.5px] font-extrabold text-white shadow-cta"
      >
        <PlusIcon width={17} height={17} />
        Nueva publicación
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map(({ label, icon: Icon, active }) => (
          <Link
            key={label}
            href="#"
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "flex items-center gap-3 rounded-xl bg-coral-soft px-3 py-[11px] text-[14.5px] font-extrabold text-eyebrow"
                : "flex items-center gap-3 rounded-xl px-3 py-[11px] text-[14.5px] font-semibold text-nav"
            }
          >
            <Icon width={19} height={19} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="mt-[10px] border-t border-border pt-[14px]">
        <div className="flex items-center gap-[11px] px-2 py-1.5">
          <div className="flex size-[38px] flex-none items-center justify-center rounded-full bg-coral font-display text-base font-semibold text-white">
            {currentUser.initial}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-extrabold text-ink">{currentUser.name}</div>
            <div className="text-xs text-muted-soft">{currentUser.role}</div>
          </div>
          <Link
            href="#"
            title="Cerrar sesión"
            className="flex size-8 flex-none items-center justify-center rounded-[10px] bg-cream text-muted"
          >
            <LogOutIcon width={16} height={16} />
          </Link>
        </div>
      </div>
    </aside>
  );
}
