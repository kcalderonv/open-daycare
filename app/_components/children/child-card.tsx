import Link from "next/link";
import { ChildAvatar } from "@/app/_components/children/child-avatar";
import { ChildTagBadge } from "@/app/_components/children/child-tag";
import { ChevronRightIcon } from "@/app/_components/icons";
import {
  getChildTag,
  parentsSummary,
  type Child,
} from "@/app/_lib/children";

export function ChildCard({ child }: { child: Child }) {
  const tag = getChildTag(child);

  return (
    <Link
      href={`/ninos/${child.id}`}
      className="flex min-w-0 items-center gap-3.5 rounded-[18px] border border-border bg-surface p-4 shadow-[0_4px_14px_-12px_rgba(120,90,60,.5)] transition duration-150 hover:-translate-y-[2px] hover:border-coral"
    >
      <ChildAvatar initial={child.initial} tone={child.tone} />

      <div className="min-w-0 flex-1">
        <div className="font-display text-[16px] font-semibold text-ink">
          {child.fullName}
        </div>
        <div className="text-[13px] text-muted-soft">
          {child.ageLabel} · {parentsSummary(child.parents.length)}
        </div>
      </div>

      {tag ? (
        <ChildTagBadge tag={tag} />
      ) : (
        <ChevronRightIcon width={18} height={18} className="flex-none text-chevron" />
      )}
    </Link>
  );
}
