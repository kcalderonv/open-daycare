import Link from "next/link";
import { ChildAvatar } from "@/app/_components/children/child-avatar";
import { room, type Child } from "@/app/_data/children";

export function ChildProfileHeader({ child }: { child: Child }) {
  return (
    <div className="flex items-center gap-[18px]">
      <ChildAvatar initial={child.initial} tone={child.tone} size="lg" />

      <div className="flex-1">
        <h1 className="font-display text-[28px] font-semibold text-ink">
          {child.name}
        </h1>
        <p className="mt-[3px] text-[15px] text-muted">
          {child.ageLabel} · {room.name}
        </p>
      </div>

      <Link
        href="#"
        className="rounded-xl border-[1.5px] border-border bg-surface px-4 py-[9px] text-[14px] font-bold text-nav"
      >
        Editar
      </Link>
    </div>
  );
}
