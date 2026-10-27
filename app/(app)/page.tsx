import { Suspense } from "react";
import { FeedComposer } from "@/app/_components/feed/feed-composer";
import { FeedPost } from "@/app/_components/feed/feed-post";
import { currentRoom, posts } from "@/app/_data/feed";
import { getCurrentUser } from "@/app/_lib/auth";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-[760px] px-5 pb-20 pt-8 lg:px-10 lg:pt-[34px]">
      <Suspense fallback={<FeedSkeleton />}>
        <FeedContent />
      </Suspense>
    </div>
  );
}

async function FeedContent() {
  const user = await getCurrentUser();
  const firstName = user.fullName.trim().split(/\s+/)[0] ?? user.fullName;
  const initial = user.fullName.trim().charAt(0).toUpperCase();

  return (
    <>
      <header className="mb-6">
        <div className="mb-1 text-[12.5px] font-extrabold tracking-[.8px] text-eyebrow">
          {currentRoom.eyebrow}
        </div>
        <h1 className="font-display text-[30px] font-semibold text-ink">
          Buenas, {firstName}
        </h1>
        <p className="mt-[5px] text-[14.5px] text-muted">{currentRoom.summary}</p>
      </header>

      <FeedComposer initial={initial} />

      <div className="mb-3.5 flex items-center gap-3.5">
        <span className="text-[12.5px] font-extrabold tracking-[.8px] text-section-label">
          PUBLICADO HOY
        </span>
        <span className="h-px flex-1 bg-separator" />
      </div>

      <div className="flex flex-col gap-4">
        {posts.map((post) => (
          <FeedPost key={post.id} post={post} />
        ))}
      </div>
    </>
  );
}

function FeedSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="mb-6">
        <div className="mb-2 h-[15px] w-[180px] rounded bg-divider" />
        <div className="mb-2 h-9 w-[220px] rounded bg-divider" />
        <div className="h-[17px] w-[150px] rounded bg-divider" />
      </div>

      <div className="mb-6 h-[68px] rounded-[18px] border border-border bg-surface" />

      <div className="flex flex-col gap-4">
        {[0, 1].map((item) => (
          <div
            key={item}
            className="h-[168px] rounded-[18px] border border-border bg-surface"
          />
        ))}
      </div>
    </div>
  );
}
