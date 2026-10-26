export const parentInvite = {
  code: "7K4P9",
  expiresLabel: "Vence en 7 días",
} as const;

export const relationshipOptions = [
  { value: "mother", label: "Mamá" },
  { value: "father", label: "Papá" },
  { value: "guardian", label: "Tutor/a" },
] as const;

export type ParentInviteRelationship =
  (typeof relationshipOptions)[number]["value"];

export const defaultRelationship: ParentInviteRelationship = "mother";
