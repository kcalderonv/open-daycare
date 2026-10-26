export type ChildTone = "sky" | "rose" | "sage" | "sun" | "lilac";

export type ParentRelationship = "mother" | "father";

export type ParentStatus = "active" | "pending";

export type Parent = {
  id: string;
  name: string;
  relationship: ParentRelationship;
  status: ParentStatus;
};

export type Child = {
  id: string;
  name: string;
  initial: string;
  tone: ChildTone;
  ageLabel: string;
  birthDateLabel: string;
  joinedAtLabel: string;
  allergies: { label: string; note: string }[];
  parents: Parent[];
};

export type ChildTag =
  | { kind: "allergy"; label: string }
  | { kind: "link-pending" };

export const room = {
  name: "Sala Soles",
  shortName: "Soles",
} as const;

export const children: Child[] = [
  {
    id: "mateo-fernandez",
    name: "Mateo Fernández",
    initial: "M",
    tone: "sky",
    ageLabel: "3 años",
    birthDateLabel: "12 mar 2022",
    joinedAtLabel: "feb 2025",
    allergies: [
      {
        label: "MANÍ",
        note: "Alergia al maní. Evitar frutos secos. Lleva inhalador en la mochila.",
      },
    ],
    parents: [
      {
        id: "lucia-fernandez",
        name: "Lucía Fernández",
        relationship: "mother",
        status: "active",
      },
      {
        id: "diego-fernandez",
        name: "Diego Fernández",
        relationship: "father",
        status: "pending",
      },
    ],
  },
  {
    id: "sofia-mendez",
    name: "Sofía Méndez",
    initial: "S",
    tone: "rose",
    ageLabel: "2 años",
    birthDateLabel: "08 sep 2023",
    joinedAtLabel: "mar 2025",
    allergies: [],
    parents: [
      {
        id: "camila-mendez",
        name: "Camila Méndez",
        relationship: "mother",
        status: "active",
      },
    ],
  },
  {
    id: "benjamin-ruiz",
    name: "Benjamín Ruiz",
    initial: "B",
    tone: "sage",
    ageLabel: "3 años",
    birthDateLabel: "21 ene 2022",
    joinedAtLabel: "feb 2025",
    allergies: [],
    parents: [
      {
        id: "paula-ruiz",
        name: "Paula Ruiz",
        relationship: "mother",
        status: "active",
      },
      {
        id: "andres-ruiz",
        name: "Andrés Ruiz",
        relationship: "father",
        status: "active",
      },
    ],
  },
  {
    id: "valentina-soto",
    name: "Valentina Soto",
    initial: "V",
    tone: "sun",
    ageLabel: "2 años",
    birthDateLabel: "03 nov 2023",
    joinedAtLabel: "mar 2025",
    allergies: [],
    parents: [],
  },
  {
    id: "tomas-diaz",
    name: "Tomás Díaz",
    initial: "T",
    tone: "lilac",
    ageLabel: "3 años",
    birthDateLabel: "17 may 2022",
    joinedAtLabel: "feb 2025",
    allergies: [
      {
        label: "LACTOSA",
        note: "Intolerancia a la lactosa. Sin lácteos ni derivados.",
      },
    ],
    parents: [
      {
        id: "martin-diaz",
        name: "Martín Díaz",
        relationship: "father",
        status: "active",
      },
    ],
  },
  {
    id: "emma-castro",
    name: "Emma Castro",
    initial: "E",
    tone: "rose",
    ageLabel: "2 años",
    birthDateLabel: "29 jul 2023",
    joinedAtLabel: "mar 2025",
    allergies: [],
    parents: [
      {
        id: "julieta-castro",
        name: "Julieta Castro",
        relationship: "mother",
        status: "active",
      },
    ],
  },
  {
    id: "lucas-romero",
    name: "Lucas Romero",
    initial: "L",
    tone: "sky",
    ageLabel: "3 años",
    birthDateLabel: "14 abr 2022",
    joinedAtLabel: "feb 2025",
    allergies: [],
    parents: [
      {
        id: "nicolas-romero",
        name: "Nicolás Romero",
        relationship: "father",
        status: "active",
      },
    ],
  },
  {
    id: "olivia-vega",
    name: "Olivia Vega",
    initial: "O",
    tone: "sage",
    ageLabel: "2 años",
    birthDateLabel: "02 oct 2023",
    joinedAtLabel: "mar 2025",
    allergies: [],
    parents: [
      {
        id: "renata-vega",
        name: "Renata Vega",
        relationship: "mother",
        status: "active",
      },
    ],
  },
];

export function getChild(id: string): Child | undefined {
  return children.find((child) => child.id === id);
}

export function getChildTag(child: Child): ChildTag | null {
  const [allergy] = child.allergies;

  if (allergy) {
    return { kind: "allergy", label: allergy.label };
  }

  if (child.parents.length === 0) {
    return { kind: "link-pending" };
  }

  return null;
}

export function parentsSummary(count: number): string {
  if (count === 0) {
    return "sin padres vinculados";
  }

  if (count === 1) {
    return "1 padre vinculado";
  }

  return `${count} padres vinculados`;
}
