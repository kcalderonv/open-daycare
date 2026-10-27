export type ChildTone = "sky" | "rose" | "sage" | "sun" | "lilac";

export type ParentRelationship = "mother" | "father" | "guardian";

export const RELATIONSHIP_LABELS: Record<ParentRelationship, string> = {
  mother: "Mamá",
  father: "Papá",
  guardian: "Tutor/a",
};

export const RELATIONSHIP_OPTIONS: ParentRelationship[] = [
  "mother",
  "father",
  "guardian",
];


export type ParentStatus = "active" | "pending";

export type Parent = {
  id: string;
  name: string;
  relationship: ParentRelationship;
  status: ParentStatus;
};

export type ChildStatus = "active" | "archived";

export type Room = {
  id: string;
  name: string;
  slug: string;
  position: number;
};

export type Child = {
  id: string;
  fullName: string;
  firstName: string;
  initial: string;
  tone: ChildTone;
  birthDate: string;
  birthDateLabel: string;
  birthDateInput: string;
  enrolledAt: string;
  enrolledAtLabel: string;
  ageLabel: string;
  roomId: string | null;
  roomName: string | null;
  allergyTags: string[];
  allergies: { label: string; note: string }[];
  medicalNotes: string | null;
  status: ChildStatus;
  parents: Parent[];
};

export type ChildTag =
  | { kind: "allergy"; label: string }
  | { kind: "link-pending" };

export type ChildGroup = {
  id: string;
  title: string;
  children: Child[];
};

const TONES: ChildTone[] = ["sky", "rose", "sage", "sun", "lilac"];

const LONG_DATE = new Intl.DateTimeFormat("es-PE", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const MONTH_YEAR = new Intl.DateTimeFormat("es-PE", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const ALLERGY_ALIASES: Record<string, string> = {
  mani: "peanut",
  "frutos secos": "nuts",
  lactosa: "lactose",
  gluten: "gluten",
  huevo: "egg",
  mariscos: "shellfish",
  soya: "soy",
  pescado: "fish",
};

const ALLERGY_LABELS: Record<string, string> = {
  peanut: "MANÍ",
  lactose: "LACTOSA",
  gluten: "GLUTEN",
  egg: "HUEVO",
  nuts: "FRUTOS SECOS",
  shellfish: "MARISCOS",
  soy: "SOYA",
  fish: "PESCADO",
};

function parseIsoDate(iso: string): Date {
  return new Date(`${iso}T12:00:00Z`);
}

function cleanMonth(value: string): string {
  return value.replace(/\./g, "").replace(/\s+/g, " ").trim();
}

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function formatLongDate(iso: string): string {
  return cleanMonth(LONG_DATE.format(parseIsoDate(iso)));
}

export function formatMonthYear(iso: string): string {
  return cleanMonth(MONTH_YEAR.format(parseIsoDate(iso)));
}

export function toInputDate(iso: string): string {
  const [year, month, day] = iso.split("-");

  if (!year || !month || !day) {
    return "";
  }

  return `${day}/${month}/${year}`;
}

export function fromInputDate(value: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value.trim());

  if (!match) {
    return "";
  }

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(Date.UTC(year, month - 1, day));

  if (
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() !== month - 1 ||
    parsed.getUTCDate() !== day
  ) {
    return "";
  }

  return `${match[3]}-${match[2]}-${match[1]}`;
}

export function ageLabel(birthDate: string, today: Date = new Date()): string {
  const birth = parseIsoDate(birthDate);
  let years = today.getFullYear() - birth.getUTCFullYear();
  const monthDiff = today.getMonth() - birth.getUTCMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getUTCDate())) {
    years -= 1;
  }

  if (years < 1) {
    return "menos de 1 año";
  }

  return years === 1 ? "1 año" : `${years} años`;
}

export function toneForId(id: string): ChildTone {
  let hash = 0;

  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }

  return TONES[hash % TONES.length];
}

export function toAllergyTags(input: string): string[] {
  const tags = input
    .split(",")
    .map((part) => part.trim())
    .filter((part) => part !== "")
    .map((part) => {
      const normalized = normalize(part);
      return ALLERGY_ALIASES[normalized] ?? normalized.replace(/\s+/g, "-");
    });

  return Array.from(new Set(tags)).slice(0, 12);
}

export function allergyLabel(tag: string): string {
  return ALLERGY_LABELS[tag] ?? tag.toUpperCase();
}

export function getChildTag(child: Child): ChildTag | null {
  const [tag] = child.allergyTags;

  if (tag) {
    return { kind: "allergy", label: allergyLabel(tag) };
  }

  if (child.parents.length === 0) {
    return { kind: "link-pending" };
  }

  return null;
}

export function parentsSummary(parents: Parent[]): string {
  const active = parents.filter((parent) => parent.status === "active").length;
  const pending = parents.length - active;
  const activeLabel =
    active === 0
      ? "sin padres vinculados"
      : active === 1
        ? "1 padre vinculado"
        : `${active} padres vinculados`;

  if (pending === 0) {
    return activeLabel;
  }

  const pendingLabel =
    pending === 1 ? "1 padre invitado" : `${pending} padres invitados`;

  return active === 0 ? pendingLabel : `${activeLabel} · ${pendingLabel}`;
}

export function groupChildrenByRoom(
  rooms: Room[],
  children: Child[],
): ChildGroup[] {
  const roomIds = new Set(rooms.map((room) => room.id));
  const groups: ChildGroup[] = rooms.map((room) => ({
    id: room.id,
    title: `SALA ${room.name.toUpperCase()}`,
    children: children.filter((child) => child.roomId === room.id),
  }));
  const unassigned = children.filter(
    (child) => child.roomId === null || !roomIds.has(child.roomId),
  );

  if (unassigned.length > 0) {
    groups.push({ id: "unassigned", title: "SIN SALA", children: unassigned });
  }

  return groups;
}
