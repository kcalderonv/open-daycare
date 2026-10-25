import Link from "next/link";
import { AppSidebar } from "@/app/_components/app-sidebar";
import { Brand } from "@/app/_components/brand";
import { PlusIcon } from "@/app/_components/icons";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1 bg-cream">
      <AppSidebar />

      <div className="flex min-w-0 flex-1 flex-col shell:h-dvh">
        <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 shell:hidden">
          <Brand />
          <span className="flex-1" />
          <Link
            href="#"
            className="flex items-center gap-1.5 rounded-xl bg-[linear-gradient(180deg,var(--color-cta-from),var(--color-cta-to))] px-3 py-2.5 text-[13px] font-extrabold text-white shadow-cta"
          >
            <PlusIcon width={15} height={15} />
            Nueva publicación
          </Link>
        </header>

        <main className="flex-1 shell:overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
