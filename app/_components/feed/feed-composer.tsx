import { PostComposerTrigger } from "@/app/_components/feed/post-composer-trigger";
import { CameraIcon } from "@/app/_components/icons";

export function FeedComposer({ initial }: { initial: string }) {
  return (
    <PostComposerTrigger className="mb-6 flex w-full cursor-pointer items-center gap-3.5 rounded-[18px] border border-border bg-surface px-[18px] py-3.5 text-left shadow-composer focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2">
      <div className="flex size-10 flex-none items-center justify-center rounded-full bg-coral font-display text-base font-semibold text-white">
        {initial}
      </div>
      <span className="flex-1 text-[15px] text-muted-soft">Compartí un momento…</span>
      <span className="flex size-[38px] items-center justify-center rounded-xl bg-coral-soft text-coral-icon">
        <CameraIcon width={19} height={19} />
      </span>
    </PostComposerTrigger>
  );
}
