import { postTypes, type PostType } from "@/app/_data/post-types";

export function PostTypeBadge({ type }: { type: PostType }) {
  const option = postTypes.find((item) => item.id === type);

  if (!option) {
    return null;
  }

  return (
    <div
      className={`flex items-center gap-[7px] rounded-full px-3 py-1.5 ${option.idleClassName}`}
    >
      <span className={`size-2 rounded-full ${option.dotClassName}`} />
      <span className="text-xs font-extrabold tracking-[.5px]">
        {option.label.toUpperCase()}
      </span>
    </div>
  );
}
