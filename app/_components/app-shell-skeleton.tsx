import { Brand } from "@/app/_components/brand";

export function AppShellSkeleton() {
  return (
    <div className="flex min-h-dvh flex-1 bg-cream">
      <aside className="sticky top-0 hidden h-dvh w-[248px] flex-none border-r border-border bg-surface shell:block" />

      <div className="flex min-w-0 flex-1 flex-col shell:h-dvh">
        <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 shell:hidden">
          <Brand />
        </header>

        <main className="flex-1" />
      </div>
    </div>
  );
}
