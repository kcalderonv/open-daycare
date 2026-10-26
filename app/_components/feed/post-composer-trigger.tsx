"use client";

import type { ReactElement, ReactNode } from "react";
import { usePostComposer } from "@/app/_components/feed/post-composer-provider";

type PostComposerTriggerProps = {
  className: string;
  children: ReactNode;
  ariaLabel?: string;
};

export function PostComposerTrigger({
  className,
  children,
  ariaLabel,
}: PostComposerTriggerProps): ReactElement {
  const openComposer = usePostComposer();

  return (
    <button
      type="button"
      onClick={openComposer}
      aria-label={ariaLabel}
      className={className}
    >
      {children}
    </button>
  );
}
