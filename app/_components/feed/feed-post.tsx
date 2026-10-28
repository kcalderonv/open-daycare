import { PostPhotoGrid } from "@/app/_components/feed/post-photo-grid";
import { PostTypeBadge } from "@/app/_components/feed/post-type-badge";
import {
  HeartIcon,
  MegaphoneIcon,
  MessageCircleIcon,
} from "@/app/_components/icons";
import type { FeedPost as FeedPostItem } from "@/app/_lib/posts";

export function FeedPost({ post }: { post: FeedPostItem }) {
  const isAnnouncement = post.type === "announcement";

  return (
    <article className="rounded-[20px] border border-border bg-surface px-[22px] py-5 shadow-card">
      <header className="mb-3.5 flex items-center gap-3">
        <div
          className={`flex size-11 flex-none items-center justify-center rounded-full font-display text-[17px] font-semibold ${
            isAnnouncement
              ? "bg-avatar-indigo-bg text-avatar-indigo-fg"
              : "bg-coral text-white"
          }`}
        >
          {isAnnouncement ? (
            <MegaphoneIcon width={20} height={20} />
          ) : (
            post.authorInitial
          )}
        </div>

        <div className="flex-1">
          <div className="font-display text-[16.5px] font-semibold text-ink">
            {isAnnouncement ? "Anuncio general" : post.authorName}
          </div>
          <div className="text-[12.5px] text-muted-soft">
            {post.timeLabel}
            {post.isOwn ? " · publicado por vos" : ""}
          </div>
        </div>

        <PostTypeBadge type={post.type} />
      </header>

      <div className="mb-2.5 text-[12.5px] text-muted-soft">
        Para: {post.audienceLabel}
      </div>

      <p className="text-[15.5px] leading-[1.55] text-body">{post.body}</p>

      <PostPhotoGrid photos={post.photos} />

      <footer className="mt-4 flex items-center gap-[18px] border-t border-divider pt-3.5">
        <span className="flex items-center gap-[7px] text-sm font-bold text-coral-icon">
          <HeartIcon width={19} height={19} />0
        </span>
        <span className="flex items-center gap-[7px] text-sm font-bold text-muted">
          <MessageCircleIcon width={18} height={18} />0
        </span>
      </footer>
    </article>
  );
}
