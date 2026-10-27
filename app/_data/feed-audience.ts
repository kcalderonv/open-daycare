import type { ChildTone } from "@/app/_lib/children";

export type FeedAudienceChild = {
  id: string;
  firstName: string;
  tone: ChildTone;
};

/**
 * Destinatarios mock del composer de publicaciones. El feed todavía no lee
 * niños de la base; esta lista conserva el comportamiento de SPEC 06.
 */
export const feedAudience: FeedAudienceChild[] = [
  { id: "mateo-fernandez", firstName: "Mateo", tone: "sky" },
  { id: "sofia-mendez", firstName: "Sofía", tone: "rose" },
  { id: "benjamin-ruiz", firstName: "Benjamín", tone: "sage" },
  { id: "valentina-soto", firstName: "Valentina", tone: "sun" },
  { id: "tomas-diaz", firstName: "Tomás", tone: "lilac" },
  { id: "emma-castro", firstName: "Emma", tone: "rose" },
  { id: "lucas-romero", firstName: "Lucas", tone: "sky" },
  { id: "olivia-vega", firstName: "Olivia", tone: "sage" },
];
