import { Suspense } from "react";
import { ChildForm } from "@/app/_components/children/child-form";
import { ChildrenSearch } from "@/app/_components/children/children-search";
import { PlusIcon } from "@/app/_components/icons";
import { FormDialog } from "@/app/_components/ui/form-dialog";
import { getCurrentUser } from "@/app/_lib/auth";
import {
  groupChildrenByRoom,
  type ChildGroup,
  type Room,
} from "@/app/_lib/children";
import { getChildren, getRooms } from "@/app/_lib/children-queries";

export default function ChildrenPage() {
  return (
    <div className="mx-auto w-full max-w-[880px] px-4 pb-20 pt-6 leading-[normal] sm:px-10 sm:pt-[34px]">
      <Suspense fallback={<ChildrenPageSkeleton />}>
        <ChildrenPageContent />
      </Suspense>
    </div>
  );
}

async function ChildrenPageContent() {
  const user = await getCurrentUser();
  let rooms: Room[] = [];
  let groups: ChildGroup[] = [];
  let failed = false;

  try {
    rooms = await getRooms(user.daycareId);
    groups = groupChildrenByRoom(rooms, await getChildren(user.daycareId));
  } catch {
    failed = true;
  }

  return (
    <>
      <header className="mb-[22px] flex items-end justify-between gap-4">
        <div>
          <div className="mb-1 text-[12.5px] font-extrabold tracking-[.8px] text-eyebrow">
            GESTIÓN
          </div>
          <h1 className="font-display text-[30px] font-semibold text-ink">Niños</h1>
        </div>

        {!failed && rooms.length > 0 ? (
          <FormDialog
            triggerContent={
              <>
                <PlusIcon width={17} height={17} />
                Agregar niño
              </>
            }
            triggerClassName="flex flex-none cursor-pointer items-center gap-2 rounded-[14px] bg-[linear-gradient(180deg,var(--color-cta-from),var(--color-cta-to))] px-[18px] py-[11px] text-[14.5px] font-extrabold text-white shadow-cta focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2"
            titleId="child-form-title"
            initialFocusId="child-name"
          >
            <ChildForm mode="create" rooms={rooms} />
          </FormDialog>
        ) : null}
      </header>

      {failed ? <ChildrenLoadError /> : <ChildrenSearch groups={groups} />}
    </>
  );
}

function ChildrenLoadError() {
  return (
    <p
      role="alert"
      className="rounded-[18px] border border-dashed border-error bg-surface px-6 py-10 text-center text-[14.5px] font-bold text-error"
    >
      No pudimos cargar los niños. Recargá la página.
    </p>
  );
}

function ChildrenPageSkeleton() {
  return (
    <div aria-hidden="true">
      <header className="mb-[22px] flex items-end justify-between gap-4">
        <div>
          <div className="mb-1 h-[15px] w-[70px] rounded bg-divider" />
          <div className="h-9 w-[110px] rounded bg-divider" />
        </div>
        <div className="h-[42px] w-[150px] rounded-[14px] bg-divider" />
      </header>

      <div className="mb-[22px] h-[46px] rounded-[14px] border border-border bg-surface" />

      <div className="flex flex-col gap-[22px]">
        {[0, 1, 2].map((item) => (
          <div key={item}>
            <div className="mb-3.5 h-[15px] w-[160px] rounded bg-divider" />
            <div className="h-[76px] rounded-[18px] border border-border bg-surface" />
          </div>
        ))}
      </div>
    </div>
  );
}
