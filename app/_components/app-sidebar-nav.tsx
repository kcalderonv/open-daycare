"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BellIcon,
  HomeIcon,
  UserIcon,
  UsersIcon,
  type IconProps,
} from "@/app/_components/icons";

type NavItem = {
  label: string;
  icon: ComponentType<IconProps>;
  href: string;
};

const NAV_ITEMS: NavItem[] = [
  { label: "Feed", icon: HomeIcon, href: "/" },
  { label: "Niños", icon: UsersIcon, href: "/ninos" },
  { label: "Avisos", icon: BellIcon, href: "#" },
  { label: "Mi cuenta", icon: UserIcon, href: "#" },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "#") {
    return false;
  }

  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
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
