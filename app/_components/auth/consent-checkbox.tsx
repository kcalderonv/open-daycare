"use client";

import { useState } from "react";
import { CheckIcon } from "@/app/_components/icons";

export function ConsentCheckbox({ label }: { label: string }) {
  const [checked, setChecked] = useState(true);

  return (
    <label className="mb-6 flex cursor-pointer items-start gap-3 rounded-[14px] bg-consent-bg px-4 py-3.5">
      <input
        type="checkbox"
        name="photo-consent"
        checked={checked}
        aria-checked={checked}
        onChange={(event) => setChecked(event.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className={`mt-px flex size-6 flex-none items-center justify-center rounded-lg peer-focus-visible:ring-2 peer-focus-visible:ring-coral peer-focus-visible:ring-offset-2 ${
          checked
            ? "bg-consent-check"
            : "border-[1.5px] border-consent-check bg-transparent"
        }`}
      >
        {checked ? <CheckIcon width={15} height={15} className="text-white" /> : null}
      </span>
      <span className="text-sm leading-[1.45] text-consent-fg">{label}</span>
    </label>
  );
}
