export type PostKind = "achievement" | "activity" | "announcement";

export type AvatarTone = "sky" | "indigo" | "coral";

export type Avatar =
  | { kind: "initial"; text: string; tone: AvatarTone }
  | { kind: "icon"; icon: "megaphone"; tone: AvatarTone };

export type Post = {
  id: string;
  kind: PostKind;
  avatar: Avatar;
  authorName: string;
  time: string;
  publishedBy: string;
  audience: string;
  body: string;
  photoLabel?: string;
  likes: number;
  comments: number;
};

export const currentRoom = {
  name: "Sala Soles",
  eyebrow: "GUARDERÍA · SALA SOLES",
  summary: "12 niños · martes 17 jun",
} as const;

export const posts: Post[] = [
  {
    id: "achievement-first-potty",
    kind: "achievement",
    avatar: { kind: "initial", text: "M", tone: "sky" },
    authorName: "Mateo",
    time: "14:20",
    publishedBy: "publicado por vos",
    audience: "familia de Mateo",
    body: "¡Usó el orinal solito por primera vez! Estaba feliz de contárselo a todos. Un gran paso.",
    likes: 3,
    comments: 1,
  },
  {
    id: "activity-tempera-painting",
    kind: "activity",
    avatar: { kind: "initial", text: "M", tone: "sky" },
    authorName: "Mateo",
    time: "09:40",
    publishedBy: "publicado por vos",
    audience: "familia de Mateo",
    body: "Pintamos con témperas esta mañana. Mateo eligió el azul para todo y se concentró un montón mezclando colores.",
    photoLabel: "Foto · pintando con témperas",
    likes: 5,
    comments: 2,
  },
  {
    id: "announcement-friday-park",
    kind: "announcement",
    avatar: { kind: "icon", icon: "megaphone", tone: "indigo" },
    authorName: "Anuncio general",
    time: "07:50",
    publishedBy: "publicado por vos",
    audience: "toda la sala",
    body: "El viernes salimos al parque por la mañana. Recuerden mandar gorra y una botellita de agua.",
    likes: 8,
    comments: 0,
  },
];
