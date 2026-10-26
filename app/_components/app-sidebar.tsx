import Link from "next/link";
import { AppSidebarNav } from "@/app/_components/app-sidebar-nav";
import { Brand } from "@/app/_components/brand";
import { PostComposerTrigger } from "@/app/_components/feed/post-composer-trigger";
import { LogOutIcon, PlusIcon } from "@/app/_components/icons";
import { currentUser } from "@/app/_data/feed";

export function AppSidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[248px] flex-none flex-col border-r border-border bg-surface px-4 py-6 shell:flex">
      <Link href="#" className="flex items-center gap-[11px] px-2 pb-[22px] pt-1">
        <Brand />
      </Link>

      <PostComposerTrigger className="mb-[18px] flex w-full cursor-pointer items-center justify-center gap-2 rounded-[14px] bg-[linear-gradient(180deg,var(--color-cta-from),var(--color-cta-to))] p-3 text-[14.5px] font-extrabold text-white shadow-cta focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2">
        <PlusIcon width={17} height={17} />
        Nueva publicación
      </PostComposerTrigger>

      <AppSidebarNav />

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
            href="/login"
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
