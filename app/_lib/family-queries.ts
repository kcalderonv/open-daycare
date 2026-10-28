import { cache } from "react";
import { cookies } from "next/headers";
import {
  RELATIONSHIP_LABELS,
  toneForId,
  type ChildTone,
  type ParentRelationship,
} from "@/app/_lib/children";
import { createClient } from "@/utils/supabase/server";

export type FamilyChild = {
  id: string;
  firstName: string;
  initial: string;
  tone: ChildTone;
  roomId: string | null;
  roomName: string | null;
  relationship: ParentRelationship;
};

export type FamilyOverview = {
  daycareName: string;
  children: FamilyChild[];
};

/**
 * Narrow read for the family panel. `family_overview()` always returns at
 * least one row, so an empty `children` array is a valid state and not an
 * error. Cached per request: the layout and the page share the same call.
 */
export const getFamilyOverview = cache(async (): Promise<FamilyOverview> => {
  const supabase = createClient(await cookies());
  const { data, error } = await supabase.rpc("family_overview");

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const daycareName = rows[0]?.daycare_name?.trim() || "Guardería";

  const children: FamilyChild[] = rows.flatMap((row) => {
    if (!row.child_id) {
      return [];
    }

    const firstName = row.first_name.trim();

    return [
      {
        id: row.child_id,
        firstName,
        initial: firstName.charAt(0).toUpperCase(),
        tone: toneForId(row.child_id),
        roomId: row.room_id ?? null,
        roomName: row.room_name ?? null,
        relationship: row.relationship,
      },
    ];
  });

  return { daycareName, children };
});

export function familyFooterLabel(children: FamilyChild[]): string {
  if (children.length === 0) {
    return "Familia";
  }

  const relationship = RELATIONSHIP_LABELS[children[0].relationship];
  const names = children.map((child) => child.firstName);
  const list =
    names.length === 1
      ? names[0]
      : `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;

  return `${relationship} de ${list}`;
}
