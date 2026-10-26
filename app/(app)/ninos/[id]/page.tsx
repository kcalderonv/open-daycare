import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChildAllergyNote } from "@/app/_components/children/child-allergy-note";
import { ChildInfoTable } from "@/app/_components/children/child-info-table";
import { ChildParentsCard } from "@/app/_components/children/child-parents-card";
import { ChildProfileHeader } from "@/app/_components/children/child-profile-header";
import { ChevronLeftIcon, SunIcon } from "@/app/_components/icons";
import { children, getChild } from "@/app/_data/children";

export function generateStaticParams() {
  return children.map(({ id }) => ({ id }));
}

export default function ChildProfilePage({ params }: PageProps<"/ninos/[id]">) {
  return (
    <div className="mx-auto w-full max-w-[820px] px-4 pb-20 pt-6 leading-[normal] sm:px-10 sm:pt-[34px]">
      <Link
        href="/ninos"
        className="mb-5 flex items-center gap-[7px] text-[14px] font-bold text-muted"
      >
        <ChevronLeftIcon width={18} height={18} />
        Volver a Niños
      </Link>

      <Suspense fallback={<div className="h-[420px]" />}>
        {params.then(({ id }) => (
          <ChildProfileContent id={id} />
        ))}
      </Suspense>
    </div>
  );
}

function ChildProfileContent({ id }: { id: string }) {
  const child = getChild(id);

  if (!child) {
    notFound();
  }

  return (
    <div className="flex flex-col gap-[26px] lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-[18px]">
        <ChildProfileHeader child={child} />
        <ChildAllergyNote allergies={child.allergies} />
        <ChildInfoTable child={child} />
      </div>

      <div className="flex w-full flex-col gap-3.5 lg:w-[300px] lg:flex-none">
        <Link
          href="#"
          className="flex w-full items-center justify-center gap-[9px] rounded-[14px] bg-ink px-[13px] py-[13px] text-[15px] font-extrabold text-white"
        >
          <SunIcon width={18} height={18} />
          Resumen del día
        </Link>

        <ChildParentsCard parents={child.parents} />
      </div>
    </div>
  );
}
