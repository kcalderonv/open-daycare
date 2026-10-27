export function InviteSummary({
  firstName,
  roomName,
}: {
  firstName: string;
  roomName: string;
}) {
  const initial = firstName.charAt(0).toUpperCase();

  return (
    <div className="mb-[22px] flex items-center gap-3.5 rounded-2xl border-[1.5px] border-auth-input-border bg-white px-4 py-3.5">
      <div className="flex size-11 flex-none items-center justify-center rounded-full bg-child-sky-bg font-display text-[19px] font-semibold text-child-sky-fg">
        {initial}
      </div>
      <div>
        <div className="text-[13px] text-muted">Te invitaron a seguir a</div>
        <div className="font-display text-[17px] font-semibold text-ink">
          {firstName}
          {roomName ? ` · Sala ${roomName}` : ""}
        </div>
      </div>
    </div>
  );
}
