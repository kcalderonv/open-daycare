import type { Child } from "@/app/_lib/children";

export function ChildInfoTable({ child }: { child: Child }) {
  const rows = [
    { label: "Fecha de nacimiento", value: child.birthDateLabel },
    { label: "Sala", value: child.roomName ?? "Sin sala" },
    { label: "Ingreso", value: child.enrolledAtLabel },
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface">
      {rows.map((row, index) => (
        <div
          key={row.label}
          className={`flex justify-between px-[18px] py-[15px] ${
            index < rows.length - 1 ? "border-b border-divider" : ""
          }`}
        >
          <span className="text-[14.5px] text-muted">{row.label}</span>
          <span className="text-[14.5px] font-extrabold text-ink">{row.value}</span>
        </div>
      ))}
    </div>
  );
}
