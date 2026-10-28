export type PostType =
  | "meal"
  | "nap"
  | "activity"
  | "achievement"
  | "mood"
  | "photo"
  | "announcement";

export type PostTypeOption = {
  id: PostType;
  label: string;
  idleClassName: string;
  activeClassName: string;
  dotClassName: string;
};

export const postTypes: readonly PostTypeOption[] = [
  {
    id: "meal",
    label: "Comida",
    idleClassName: "bg-badge-pending-bg text-badge-pending",
    activeClassName: "bg-badge-pending text-white",
    dotClassName: "bg-badge-pending",
  },
  {
    id: "nap",
    label: "Siesta",
    idleClassName: "bg-post-type-nap-bg text-post-type-nap-fg",
    activeClassName: "bg-post-type-nap-fg text-white",
    dotClassName: "bg-post-type-nap-fg",
  },
  {
    id: "activity",
    label: "Actividad",
    idleClassName: "bg-badge-activity-bg text-badge-activity",
    activeClassName: "bg-badge-activity text-white",
    dotClassName: "bg-badge-activity",
  },
  {
    id: "achievement",
    label: "Logro",
    idleClassName: "bg-badge-achievement-bg text-badge-achievement",
    activeClassName: "bg-badge-achievement text-white",
    dotClassName: "bg-badge-achievement",
  },
  {
    id: "mood",
    label: "Ánimo",
    idleClassName: "bg-tag-link-bg text-tag-link-fg",
    activeClassName: "bg-tag-link-fg text-white",
    dotClassName: "bg-tag-link-fg",
  },
  {
    id: "photo",
    label: "Foto",
    idleClassName: "bg-tag-allergy-bg text-tag-allergy-fg",
    activeClassName: "bg-tag-allergy-fg text-white",
    dotClassName: "bg-tag-allergy-fg",
  },
  {
    id: "announcement",
    label: "Anuncio",
    idleClassName: "bg-badge-announcement-bg text-badge-announcement",
    activeClassName: "bg-badge-announcement text-white",
    dotClassName: "bg-badge-announcement",
  },
];
