import Link from "next/link";
import { ChildrenSearch } from "@/app/_components/children/children-search";
import { PlusIcon } from "@/app/_components/icons";
import { children } from "@/app/_data/children";

export default function ChildrenPage() {
  return (
    <div className="mx-auto w-full max-w-[880px] px-4 pb-20 pt-6 leading-[normal] sm:px-10 sm:pt-[34px]">
      <header className="mb-[22px] flex items-end justify-between gap-4">
        <div>
          <div className="mb-1 text-[12.5px] font-extrabold tracking-[.8px] text-eyebrow">
            GESTIÓN
          </div>
          <h1 className="font-display text-[30px] font-semibold text-ink">Niños</h1>
        </div>

        <Link
          href="#"
          className="flex flex-none items-center gap-2 rounded-[14px] bg-[linear-gradient(180deg,var(--color-cta-from),var(--color-cta-to))] px-[18px] py-[11px] text-[14.5px] font-extrabold text-white shadow-cta"
        >
          <PlusIcon width={17} height={17} />
          Agregar niño
        </Link>
      </header>

      <ChildrenSearch items={children} />
    </div>
  );
}
