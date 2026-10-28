import { Suspense } from "react";
import { FamilyFeed } from "@/app/_components/feed/family-feed";
import { getCurrentUser } from "@/app/_lib/auth";
import { getFamilyOverview } from "@/app/_lib/family-queries";
import { getFeedPosts } from "@/app/_lib/post-queries";

export default function FamiliaPage() {
  return (
    <div className="mx-auto w-full max-w-[720px] px-5 pb-20 pt-8 lg:px-10 lg:pt-[34px]">
      <Suspense fallback={<FamilyFeedSkeleton />}>
        <FamilyFeedContent />
      </Suspense>
    </div>
  );
}

async function FamilyFeedContent() {
  const user = await getCurrentUser();
  const overview = await getFamilyOverview();
  const childNames = new Map(
    overview.children.map((child) => [child.id, child.firstName]),
  );
  const posts = await getFeedPosts(user.daycareId, user.id, childNames);
  const trimmedName = user.fullName.trim();
  const firstName = trimmedName.split(/\s+/)[0] ?? user.fullName;

  return (
    <>
      <header className="mb-5">
        <div className="mb-1 text-[12.5px] font-extrabold tracking-[.8px] text-eyebrow">
          TU FAMILIA
        </div>
        <h1 className="font-display text-[30px] font-semibold text-ink">
          Hola, {firstName}
        </h1>
        <p className="mt-[5px] text-[14.5px] text-muted">
          Así va el día de hoy
        </p>
      </header>

      <FamilyFeed familyChildren={overview.children} posts={posts} />
    </>
  );
}

function FamilyFeedSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="mb-5">
        <div className="mb-2 h-[15px] w-[110px] rounded bg-divider" />
        <div className="mb-2 h-9 w-[200px] rounded bg-divider" />
        <div className="h-[17px] w-[160px] rounded bg-divider" />
      </div>

      <div className="mb-[22px] flex gap-2.5">
        <div className="h-[42px] w-[106px] rounded-full bg-divider" />
        <div className="h-[42px] w-[96px] rounded-full bg-divider" />
        <div className="h-[42px] w-[76px] rounded-full bg-divider" />
      </div>

      <div className="flex flex-col gap-4">
        {[0, 1].map((item) => (
          <div
            key={item}
            className="h-[180px] rounded-[20px] border border-border bg-surface"
          />
        ))}
      </div>
    </div>
  );
}
