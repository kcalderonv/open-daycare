import { invite } from "@/app/_data/auth";

export function InviteSummary() {
  return (
    <div className="mb-[22px] flex items-center gap-3.5 rounded-2xl border-[1.5px] border-auth-input-border bg-white px-4 py-3.5">
      <div className="flex size-11 flex-none items-center justify-center rounded-full bg-child-sky-bg font-display text-[19px] font-semibold text-child-sky-fg">
        {invite.initial}
      </div>
      <div>
        <div className="text-[13px] text-muted">Te invitaron a seguir a</div>
        <div className="font-display text-[17px] font-semibold text-ink">
          {invite.childName} · {invite.roomName}
        </div>
      </div>
    </div>
  );
}
