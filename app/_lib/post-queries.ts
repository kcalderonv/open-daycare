import { cache } from "react";
import { cookies } from "next/headers";
import { photoRules, postPhotoBucket } from "@/app/_data/post-composer";
import { toneForId } from "@/app/_lib/children";
import {
  FEED_PAGE_SIZE,
  audienceLabel,
  formatPostTime,
  type ComposerAudience,
  type FeedPost,
  type FeedPhoto,
} from "@/app/_lib/posts";
import { createClient } from "@/utils/supabase/server";

export const getDaycareOverview = cache(
  async (): Promise<{ name: string; childrenCount: number }> => {
    const supabase = createClient(await cookies());
    const { data, error } = await supabase.rpc("daycare_overview");

    if (error) {
      throw new Error(error.message);
    }

    const row = data?.[0];

    return {
      name: row?.name ?? "Guardería",
      childrenCount: row?.children_count ?? 0,
    };
  },
);

export const getComposerAudience = cache(
  async (daycareId: string): Promise<ComposerAudience> => {
    const supabase = createClient(await cookies());
    const [roomsResult, childrenResult] = await Promise.all([
      supabase
        .from("rooms")
        .select("id, name, position")
        .eq("daycare_id", daycareId)
        .order("position", { ascending: true })
        .order("name", { ascending: true }),
      supabase
        .from("children")
        .select("id, full_name, room_id, photo_consent")
        .eq("daycare_id", daycareId)
        .eq("status", "active")
        .order("full_name", { ascending: true }),
    ]);

    if (roomsResult.error) {
      throw new Error(roomsResult.error.message);
    }

    if (childrenResult.error) {
      throw new Error(childrenResult.error.message);
    }

    return {
      rooms: (roomsResult.data ?? []).map((room) => ({
        id: room.id,
        name: room.name,
        position: room.position,
      })),
      children: (childrenResult.data ?? []).map((child) => {
        const firstName = child.full_name.trim().split(/\s+/)[0] ?? child.full_name;

        return {
          id: child.id,
          firstName,
          initial: firstName.charAt(0).toUpperCase(),
          tone: toneForId(child.id),
          roomId: child.room_id,
          photoConsent: child.photo_consent,
        };
      }),
    };
  },
);

export async function getFeedPosts(
  daycareId: string,
  currentUserId: string,
): Promise<FeedPost[]> {
  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from("posts")
    .select(
      `
        id,
        type,
        body,
        published_at,
        author_id,
        room_wide,
        author:users!posts_author_fkey(full_name),
        room:rooms!posts_room_fkey(name),
        post_children(children(full_name)),
        post_photos(storage_path, width, height, position)
      `,
    )
    .eq("daycare_id", daycareId)
    .order("published_at", { ascending: false })
    .limit(FEED_PAGE_SIZE);

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const paths = rows.flatMap((row) =>
    (row.post_photos ?? []).map((photo) => photo.storage_path),
  );

  const signed =
    paths.length > 0
      ? await supabase.storage
          .from(postPhotoBucket)
          .createSignedUrls(paths, photoRules.signedUrlTtl)
      : { data: [], error: null };

  const urlByPath = new Map<string, string>();

  for (const item of signed.data ?? []) {
    if (item.path && item.signedUrl) {
      urlByPath.set(item.path, item.signedUrl);
    }
  }

  return rows.map((row) => {
    const authorName = row.author?.full_name ?? "Equipo";
    const roomName = row.room?.name ?? null;
    const children = (row.post_children ?? [])
      .map((link) => link.children?.full_name)
      .filter((name): name is string => Boolean(name))
      .map((name) => name.trim().split(/\s+/)[0] ?? name);
    const photos: FeedPhoto[] = (row.post_photos ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map((photo) => ({
        path: photo.storage_path,
        url: urlByPath.get(photo.storage_path) ?? "",
        width: photo.width,
        height: photo.height,
      }))
      .filter((photo) => photo.url !== "");

    return {
      id: row.id,
      type: row.type,
      authorId: row.author_id,
      authorName,
      authorInitial: authorName.trim().charAt(0).toUpperCase(),
      publishedAt: row.published_at,
      timeLabel: formatPostTime(row.published_at),
      audienceLabel: audienceLabel(children, row.room_wide ? roomName : null),
      body: row.body,
      photos,
      isOwn: row.author_id === currentUserId,
    };
  });
}
