import { FeedComposer } from "@/app/_components/feed/feed-composer";
import { FeedPost } from "@/app/_components/feed/feed-post";
import { currentRoom, posts } from "@/app/_data/feed";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-[760px] px-5 pb-20 pt-8 lg:px-10 lg:pt-[34px]">
      <header className="mb-6">
        <div className="mb-1 text-[12.5px] font-extrabold tracking-[.8px] text-eyebrow">
          {currentRoom.eyebrow}
        </div>
        <h1 className="font-display text-[30px] font-semibold text-ink">
          {currentRoom.greeting}
        </h1>
        <p className="mt-[5px] text-[14.5px] text-muted">{currentRoom.summary}</p>
      </header>

      <FeedComposer />

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
    </div>
  );
}
