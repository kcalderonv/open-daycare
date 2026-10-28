import { Suspense } from "react";
import { FeedComposer } from "@/app/_components/feed/feed-composer";
import { FeedPost } from "@/app/_components/feed/feed-post";
import { getCurrentUser } from "@/app/_lib/auth";
import {
  getDaycareOverview,
  getFeedPosts,
} from "@/app/_lib/post-queries";
import {
  formatFeedDate,
  splitFeedByDay,
  type FeedPost as FeedPostItem,
} from "@/app/_lib/posts";

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
  const [overview, posts] = await Promise.all([
    getDaycareOverview(),
    getFeedPosts(user.daycareId, user.id),
  ]);

  const trimmedName = user.fullName.trim();
  const firstName = trimmedName.split(/\s+/)[0] ?? user.fullName;
  const initial = trimmedName.charAt(0).toUpperCase();
  const canPublish = user.role !== "parent";
  const { today, previous } = splitFeedByDay(posts);
  const childrenLabel = overview.childrenCount === 1 ? "niño" : "niños";

  return (
    <>
      <header className="mb-6">
        <div className="mb-1 text-[12.5px] font-extrabold tracking-[.8px] text-eyebrow">
          GUARDERÍA · {overview.name.toUpperCase()}
        </div>
        <h1 className="font-display text-[30px] font-semibold text-ink">
          Buenas, {firstName}
        </h1>
        <p className="mt-[5px] text-[14.5px] text-muted">
          {overview.childrenCount} {childrenLabel} · {formatFeedDate()}
        </p>
      </header>

      {canPublish ? <FeedComposer initial={initial} /> : null}

      {posts.length === 0 ? (
        <FeedEmptyState />
      ) : (
        <div className="flex flex-col gap-8">
          {today.length > 0 ? (
            <FeedSection label="PUBLICADO HOY" posts={today} />
          ) : null}
          {previous.length > 0 ? (
            <FeedSection label="ANTERIORES" posts={previous} />
          ) : null}
        </div>
      )}
    </>
  );
}

function FeedSection({
  label,
  posts,
}: {
  label: string;
  posts: FeedPostItem[];
}) {
  return (
    <section aria-label={label}>
      <div className="mb-3.5 flex items-center gap-3.5">
        <span className="text-[12.5px] font-extrabold tracking-[.8px] text-section-label">
          {label}
        </span>
        <span className="h-px flex-1 bg-separator" />
      </div>

      <div className="flex flex-col gap-4">
        {posts.map((post) => (
          <FeedPost key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}

function FeedEmptyState() {
  return (
    <div className="rounded-[20px] border border-dashed border-border bg-surface px-6 py-10 text-center">
      <p className="font-display text-[17px] font-semibold text-ink">
        Todavía no hay publicaciones.
      </p>
      <p className="mt-1 text-sm text-muted">
        Compartí el primer momento del día.
      </p>
    </div>
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
