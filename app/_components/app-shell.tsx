import type { CurrentUser } from "@/app/_lib/auth";
import { AppSidebar } from "@/app/_components/app-sidebar";
import { Brand } from "@/app/_components/brand";
import { PostComposerTrigger } from "@/app/_components/feed/post-composer-trigger";
import { PlusIcon } from "@/app/_components/icons";

type AppShellProps = {
  children: React.ReactNode;
  user: CurrentUser;
  daycareName: string;
  canPublish: boolean;
};

export function AppShell({
  children,
  user,
  daycareName,
  canPublish,
}: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-1 bg-cream">
      <AppSidebar
        user={user}
        daycareName={daycareName}
        canPublish={canPublish}
      />

      <div className="flex min-w-0 flex-1 flex-col shell:h-dvh">
        <header className="flex items-center gap-3 border-b border-border bg-surface px-4 py-3 shell:hidden">
          <Brand subtitle={daycareName} />
          <span className="flex-1" />
          {canPublish ? (
            <PostComposerTrigger className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-[linear-gradient(180deg,var(--color-cta-from),var(--color-cta-to))] px-3 py-2.5 text-[13px] font-extrabold text-white shadow-cta focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2">
              <PlusIcon width={15} height={15} />
              Nueva publicación
            </PostComposerTrigger>
          ) : null}
        </header>

        <main className="flex-1 shell:overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
