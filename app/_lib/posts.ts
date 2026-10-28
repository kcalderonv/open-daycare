import type { PostType } from "@/app/_data/post-types";
import type { ChildTone } from "@/app/_lib/children";

export type FeedPhoto = {
  path: string;
  url: string;
  width: number | null;
  height: number | null;
};

export type FeedPost = {
  id: string;
  type: PostType;
  authorId: string;
  authorName: string;
  authorInitial: string;
  publishedAt: string;
  timeLabel: string;
  audienceLabel: string;
  body: string;
  photos: FeedPhoto[];
  isOwn: boolean;
};

export type ComposerRoom = {
  id: string;
  name: string;
  position: number;
};

export type ComposerChild = {
  id: string;
  firstName: string;
  initial: string;
  tone: ChildTone;
  roomId: string | null;
  photoConsent: boolean;
};

export type ComposerAudience = {
  rooms: ComposerRoom[];
  children: ComposerChild[];
};

export const FEED_PAGE_SIZE = 20;
export const APP_TIME_ZONE = "America/Lima";

const timeFormatter = new Intl.DateTimeFormat("es-PE", {
  timeZone: APP_TIME_ZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const dayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const feedDateFormatter = new Intl.DateTimeFormat("es-PE", {
  timeZone: APP_TIME_ZONE,
  weekday: "long",
  day: "numeric",
  month: "short",
});

export function audienceLabel(
  childFirstNames: string[],
  roomName: string | null,
): string {
  if (roomName) {
    return `toda la sala ${roomName}`;
  }

  if (childFirstNames.length === 0) {
    return "sin destinatarios";
  }

  if (childFirstNames.length === 1) {
    return `familia de ${childFirstNames[0]}`;
  }

  if (childFirstNames.length <= 3) {
    const last = childFirstNames[childFirstNames.length - 1];
    return `familia de ${childFirstNames.slice(0, -1).join(", ")} y ${last}`;
  }

  return `${childFirstNames.length} familias`;
}

export function splitFeedByDay(
  posts: FeedPost[],
  now: Date = new Date(),
): { today: FeedPost[]; previous: FeedPost[] } {
  const todayKey = dayFormatter.format(now);
  const today: FeedPost[] = [];
  const previous: FeedPost[] = [];

  for (const post of posts) {
    if (dayFormatter.format(new Date(post.publishedAt)) === todayKey) {
      today.push(post);
    } else {
      previous.push(post);
    }
  }

  return { today, previous };
}

export function formatPostTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

export function formatFeedDate(now: Date = new Date()): string {
  return feedDateFormatter.format(now).replace(/\./g, "").replace(/,\s*/g, " ");
}

export function defaultRoomId(audience: ComposerAudience): string {
  const rooms = [...audience.rooms].sort((a, b) => a.position - b.position);
  const withChildren = rooms.find((room) =>
    audience.children.some((child) => child.roomId === room.id),
  );

  return withChildren?.id ?? rooms[0]?.id ?? "";
}
