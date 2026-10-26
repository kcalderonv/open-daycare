import { AppShell } from "@/app/_components/app-shell";
import { PostComposerProvider } from "@/app/_components/feed/post-composer-provider";

export default function AppGroupLayout({ children }: LayoutProps<"/">) {
  return (
    <PostComposerProvider>
      <AppShell>{children}</AppShell>
    </PostComposerProvider>
  );
}
