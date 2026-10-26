import type { ChildTag } from "@/app/_data/children";

const TAG_STYLES: Record<ChildTag["kind"], string> = {
  allergy: "bg-tag-allergy-bg text-tag-allergy-fg",
  "link-pending": "bg-tag-link-bg text-tag-link-fg",
};

const LINK_PENDING_LABEL = "VINCULAR";

export function ChildTagBadge({ tag }: { tag: ChildTag }) {
  const label = tag.kind === "allergy" ? tag.label : LINK_PENDING_LABEL;

  return (
    <span
      className={`flex-none rounded-full px-[9px] py-[5px] text-[11px] font-extrabold ${TAG_STYLES[tag.kind]}`}
    >
      {label}
    </span>
  );
}
