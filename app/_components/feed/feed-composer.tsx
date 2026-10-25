import Link from "next/link";
import { CameraIcon } from "@/app/_components/icons";
import { currentUser } from "@/app/_data/feed";

export function FeedComposer() {
  return (
    <Link
      href="#"
      className="mb-6 flex items-center gap-3.5 rounded-[18px] border border-border bg-surface px-[18px] py-3.5 shadow-composer"
    >
      <div className="flex size-10 flex-none items-center justify-center rounded-full bg-coral font-display text-base font-semibold text-white">
        {currentUser.initial}
      </div>
      <span className="flex-1 text-[15px] text-muted-soft">Compartí un momento…</span>
      <span className="flex size-[38px] items-center justify-center rounded-xl bg-coral-soft text-coral-icon">
        <CameraIcon width={19} height={19} />
      </span>
    </Link>
  );
}
