import type { ChildTone } from "@/app/_data/children";

const TONE_STYLES: Record<ChildTone, string> = {
  sky: "bg-child-sky-bg text-child-sky-fg",
  rose: "bg-child-rose-bg text-child-rose-fg",
  sage: "bg-child-sage-bg text-child-sage-fg",
  sun: "bg-child-sun-bg text-child-sun-fg",
  lilac: "bg-child-lilac-bg text-child-lilac-fg",
};

const SIZE_STYLES = {
  xs: "size-[26px] text-[13px]",
  sm: "size-12 text-[19px]",
  lg: "size-[84px] text-[34px]",
} as const;

type ChildAvatarProps = {
  initial: string;
  tone: ChildTone;
  size?: keyof typeof SIZE_STYLES;
};

export function ChildAvatar({ initial, tone, size = "sm" }: ChildAvatarProps) {
  return (
    <div
      className={`flex flex-none items-center justify-center rounded-full font-display font-semibold ${SIZE_STYLES[size]} ${TONE_STYLES[tone]}`}
    >
      {initial}
    </div>
  );
}
