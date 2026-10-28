"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellIcon,
  HomeIcon,
  SunIcon,
  UserIcon,
  UsersIcon,
  type IconProps,
} from "@/app/_components/icons";

export type NavIcon = "home" | "users" | "bell" | "user" | "sun";

export type NavItem = {
  label: string;
  icon: NavIcon;
  href: string;
};

const ICONS: Record<NavIcon, ComponentType<IconProps>> = {
  home: HomeIcon,
  users: UsersIcon,
  bell: BellIcon,
  user: UserIcon,
  sun: SunIcon,
};

function isActive(pathname: string, href: string): boolean {
  if (href === "#") {
    return false;
  }

  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1">
      {items.map(({ label, icon: iconName, href }) => {
        const Icon = ICONS[iconName];
        const active = isActive(pathname, href);

        return (
          <Link
            key={label}
            href={href}
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
        );
      })}
    </nav>
  );
}
