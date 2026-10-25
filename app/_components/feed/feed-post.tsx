import Link from "next/link";
import { PostTypeBadge } from "@/app/_components/feed/post-type-badge";
import {
  HeartIcon,
  ImageIcon,
  MegaphoneIcon,
  MessageCircleIcon,
} from "@/app/_components/icons";
import type { AvatarTone, Post } from "@/app/_data/feed";

const AVATAR_TONE_STYLES: Record<AvatarTone, string> = {
  sky: "bg-avatar-sky-bg text-avatar-sky-fg",
  indigo: "bg-avatar-indigo-bg text-avatar-indigo-fg",
  coral: "bg-coral text-white",
};

export function FeedPost({ post }: { post: Post }) {
  return (
    <article className="rounded-[20px] border border-border bg-surface px-[22px] py-5 shadow-card">
      <header className="mb-3.5 flex items-center gap-3">
        <div
          className={`flex size-11 flex-none items-center justify-center rounded-full font-display text-[17px] font-semibold ${AVATAR_TONE_STYLES[post.avatar.tone]}`}
        >
          {post.avatar.kind === "initial" ? (
            post.avatar.text
          ) : (
            <MegaphoneIcon width={20} height={20} />
          )}
        </div>

        <div className="flex-1">
          <div className="font-display text-[16.5px] font-semibold text-ink">
            {post.authorName}
          </div>
          <div className="text-[12.5px] text-muted-soft">
            {post.time} · {post.publishedBy}
          </div>
        </div>

        <PostTypeBadge kind={post.kind} />
      </header>

      <div className="mb-2.5 text-[12.5px] text-muted-soft">Para: {post.audience}</div>

      <p className="text-[15.5px] leading-[1.55] text-body">{post.body}</p>

      {post.photoLabel ? (
        <Link
          href="#"
          className="mt-3.5 flex h-[200px] flex-col items-center justify-center gap-2 rounded-2xl border-[1.5px] border-dashed border-photo-border bg-photo-bg text-photo-text"
        >
          <ImageIcon width={30} height={30} />
          <span className="text-[13.5px]">{post.photoLabel}</span>
        </Link>
      ) : null}

      <footer className="mt-4 flex items-center gap-[18px] border-t border-divider pt-3.5">
        <span className="flex items-center gap-[7px] text-sm font-bold text-coral-icon">
          <HeartIcon width={19} height={19} />
          {post.likes}
        </span>
        <Link
          href="#"
          className="flex items-center gap-[7px] text-sm font-bold text-muted"
        >
          <MessageCircleIcon width={18} height={18} />
          {post.comments}
        </Link>
        <span className="flex-1" />
        <Link href="#" className="text-sm font-extrabold text-coral-link">
          Editar
        </Link>
      </footer>
    </article>
  );
}
