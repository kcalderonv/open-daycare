import { ParentInviteForm } from "@/app/_components/children/parent-invite-form";
import { PlusIcon } from "@/app/_components/icons";
import { FormDialog } from "@/app/_components/ui/form-dialog";
import type {
  Child,
  Parent,
  ParentRelationship,
  ParentStatus,
} from "@/app/_data/children";

const PARENT_AVATAR_STYLES: Record<ParentRelationship, string> = {
  mother: "bg-parent-lilac-bg",
  father: "bg-parent-blue-bg",
};

type ParentStatusCopy = {
  meta: string;
  badge: string;
  badgeClassName: string;
};

const PARENT_STATUS_COPY: Record<
  ParentRelationship,
  Record<ParentStatus, ParentStatusCopy>
> = {
  mother: {
    active: {
      meta: "Mamá · activa",
      badge: "ACTIVA",
      badgeClassName: "bg-badge-achievement-bg text-badge-achievement",
    },
    pending: {
      meta: "Mamá · invitación enviada",
      badge: "PENDIENTE",
      badgeClassName: "bg-badge-pending-bg text-badge-pending",
    },
  },
  father: {
    active: {
      meta: "Papá · activo",
      badge: "ACTIVO",
      badgeClassName: "bg-badge-achievement-bg text-badge-achievement",
    },
    pending: {
      meta: "Papá · invitación enviada",
      badge: "PENDIENTE",
      badgeClassName: "bg-badge-pending-bg text-badge-pending",
    },
  },
};

function ParentRow({ parent }: { parent: Parent }) {
  const status = PARENT_STATUS_COPY[parent.relationship][parent.status];

  return (
    <div className="flex items-center gap-3">
      <div
        className={`flex size-10 flex-none items-center justify-center rounded-full font-display text-base font-semibold text-white ${PARENT_AVATAR_STYLES[parent.relationship]}`}
      >
        {parent.name.charAt(0)}
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-[14.5px] font-extrabold text-ink">{parent.name}</div>
        <div className="text-[12.5px] text-muted-soft">{status.meta}</div>
      </div>

      <span
        className={`flex-none rounded-full px-[9px] py-1 text-[10.5px] font-extrabold ${status.badgeClassName}`}
      >
        {status.badge}
      </span>
    </div>
  );
}

export function ChildParentsCard({ child }: { child: Child }) {
  return (
    <div className="rounded-2xl border border-border bg-surface px-[18px] py-4">
      <div className="mb-3.5 text-[12.5px] font-extrabold tracking-[.8px] text-section-label">
        PADRES VINCULADOS
      </div>

      <div className="flex flex-col gap-3.5">
        {child.parents.map((parent) => (
          <ParentRow key={parent.id} parent={parent} />
        ))}

        <FormDialog
          triggerClassName="flex cursor-pointer items-center gap-3 pt-2 text-left focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2"
          titleId="parent-invite-title"
          initialFocusId="parent-name"
          triggerContent={
            <>
              <span className="flex size-10 flex-none items-center justify-center rounded-full border-[1.5px] border-dashed border-avatar-empty-border text-photo-text">
                <PlusIcon width={18} height={18} />
              </span>
              <span className="text-[14.5px] font-extrabold text-coral-link">
                Vincular otro padre
              </span>
            </>
          }
        >
          <ParentInviteForm child={child} />
        </FormDialog>
      </div>
    </div>
  );
}
