import { SunIcon } from "@/app/_components/icons";

export function Brand({ subtitle }: { subtitle?: string }) {
  return (
    <div className="flex items-center gap-[11px]">
      <div className="flex size-[38px] flex-none items-center justify-center rounded-xl bg-[linear-gradient(155deg,var(--color-logo-from),var(--color-coral))]">
        <SunIcon width={21} height={21} className="text-white" />
      </div>
      <div>
        <div className="font-display text-[17px] font-semibold leading-none text-ink">
          OpenDayCare
        </div>
        {subtitle ? (
          <div className="mt-0.5 text-[11.5px] text-muted-soft">{subtitle}</div>
        ) : null}
      </div>
    </div>
  );
}
