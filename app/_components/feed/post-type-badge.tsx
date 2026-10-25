import type { PostKind } from "@/app/_data/feed";

type PostKindStyle = {
  label: string;
  containerClassName: string;
  dotClassName: string;
  labelClassName: string;
};

const POST_KIND_STYLES: Record<PostKind, PostKindStyle> = {
  achievement: {
    label: "LOGRO",
    containerClassName: "bg-badge-achievement-bg",
    dotClassName: "bg-badge-achievement",
    labelClassName: "text-badge-achievement",
  },
  activity: {
    label: "ACTIVIDAD",
    containerClassName: "bg-badge-activity-bg",
    dotClassName: "bg-badge-activity",
    labelClassName: "text-badge-activity",
  },
  announcement: {
    label: "ANUNCIO",
    containerClassName: "bg-badge-announcement-bg",
    dotClassName: "bg-badge-announcement",
    labelClassName: "text-badge-announcement",
  },
};

export function PostTypeBadge({ kind }: { kind: PostKind }) {
  const style = POST_KIND_STYLES[kind];

  return (
    <div
      className={`flex items-center gap-[7px] rounded-full px-3 py-1.5 ${style.containerClassName}`}
    >
      <span className={`size-2 rounded-full ${style.dotClassName}`} />
      <span className={`text-xs font-extrabold tracking-[.5px] ${style.labelClassName}`}>
        {style.label}
      </span>
    </div>
  );
}
