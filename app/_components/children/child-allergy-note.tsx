import { AlertTriangleIcon } from "@/app/_components/icons";
import type { Child } from "@/app/_data/children";

export function ChildAllergyNote({ allergies }: { allergies: Child["allergies"] }) {
  if (allergies.length === 0) {
    return null;
  }

  return (
    <div className="flex gap-3.5 rounded-2xl bg-allergy-panel px-[18px] py-4">
      <div className="flex size-10 flex-none items-center justify-center rounded-[11px] bg-allergy-icon-bg">
        <AlertTriangleIcon width={22} height={22} className="text-white" />
      </div>
      <div>
        <div className="mb-0.5 text-[15px] font-extrabold text-allergy-title">
          Alergias y notas
        </div>
        <div className="text-[14.5px] leading-[1.5] text-allergy-body">
          {allergies.map((allergy) => allergy.note).join(" ")}
        </div>
      </div>
    </div>
  );
}
