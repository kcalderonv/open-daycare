import { SunIcon } from "@/app/_components/icons";
import { currentRoom } from "@/app/_data/feed";

export function Brand() {
  return (
    <div className="flex items-center gap-[11px]">
      <div className="flex size-[38px] flex-none items-center justify-center rounded-xl bg-[linear-gradient(155deg,var(--color-logo-from),var(--color-coral))]">
        <SunIcon width={21} height={21} className="text-white" />
      </div>
      <div>
        <div className="font-display text-[17px] font-semibold leading-none text-ink">
          OpenDayCare
        </div>
        <div className="mt-0.5 text-[11.5px] text-muted-soft">{currentRoom.name}</div>
      </div>
    </div>
  );
}
