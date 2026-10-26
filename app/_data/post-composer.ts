export type PostTypeId =
  | "meal"
  | "nap"
  | "activity"
  | "achievement"
  | "mood"
  | "photo"
  | "announcement";

export type PostTypeOption = {
  id: PostTypeId;
  label: string;
  idleClassName: string;
  activeClassName: string;
};

export const postTypes: readonly PostTypeOption[] = [
  {
    id: "meal",
    label: "Comida",
    idleClassName: "bg-badge-pending-bg text-badge-pending",
    activeClassName: "bg-badge-pending text-white",
  },
  {
    id: "nap",
    label: "Siesta",
    idleClassName: "bg-post-type-nap-bg text-post-type-nap-fg",
    activeClassName: "bg-post-type-nap-fg text-white",
  },
  {
    id: "activity",
    label: "Actividad",
    idleClassName: "bg-badge-activity-bg text-badge-activity",
    activeClassName: "bg-badge-activity text-white",
  },
  {
    id: "achievement",
    label: "Logro",
    idleClassName: "bg-badge-achievement-bg text-badge-achievement",
    activeClassName: "bg-badge-achievement text-white",
  },
  {
    id: "mood",
    label: "Ánimo",
    idleClassName: "bg-tag-link-bg text-tag-link-fg",
    activeClassName: "bg-tag-link-fg text-white",
  },
  {
    id: "photo",
    label: "Foto",
    idleClassName: "bg-tag-allergy-bg text-tag-allergy-fg",
    activeClassName: "bg-tag-allergy-fg text-white",
  },
  {
    id: "announcement",
    label: "Anuncio",
    idleClassName: "bg-badge-announcement-bg text-badge-announcement",
    activeClassName: "bg-badge-announcement text-white",
  },
];

export const wholeRoomLabel = "Toda la sala";

export const descriptionLimits = { min: 10, max: 600 } as const;

export const photoRules: {
  max: number;
  accept: string;
  allowedTypes: readonly string[];
  maxBytes: number;
} = {
  max: 4,
  accept: "image/jpeg,image/png,image/webp",
  allowedTypes: ["image/jpeg", "image/png", "image/webp"],
  maxBytes: 5 * 1024 * 1024,
};

export function audienceChipId(childId: string): string {
  return `post-audience-${childId}`;
}
