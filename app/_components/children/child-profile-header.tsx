import { ChildAvatar } from "@/app/_components/children/child-avatar";
import { ChildForm } from "@/app/_components/children/child-form";
import { FormDialog } from "@/app/_components/ui/form-dialog";
import type { Child, Room } from "@/app/_lib/children";

type ChildProfileHeaderProps = {
  child: Child;
  rooms: Room[];
};

export function ChildProfileHeader({ child, rooms }: ChildProfileHeaderProps) {
  const roomLabel = child.roomName ? `Sala ${child.roomName}` : "Sin sala";

  return (
    <div className="flex items-center gap-[18px]">
      <ChildAvatar initial={child.initial} tone={child.tone} size="lg" />

      <div className="flex-1">
        <h1 className="font-display text-[28px] font-semibold text-ink">
          {child.fullName}
        </h1>
        <p className="mt-[3px] text-[15px] text-muted">
          {child.ageLabel} · {roomLabel}
        </p>
      </div>

      <FormDialog
        triggerContent="Editar"
        triggerClassName="cursor-pointer rounded-xl border-[1.5px] border-border bg-surface px-4 py-[9px] text-[14px] font-bold text-nav focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2"
        titleId="child-form-title"
        initialFocusId="child-name"
      >
        <ChildForm mode="edit" child={child} rooms={rooms} />
      </FormDialog>
    </div>
  );
}
