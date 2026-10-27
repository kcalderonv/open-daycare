import { cache } from "react";
import { cookies } from "next/headers";
import type { Database } from "@/utils/supabase/database.types";
import { createClient } from "@/utils/supabase/server";
import {
  ageLabel,
  allergyLabel,
  formatLongDate,
  formatMonthYear,
  toInputDate,
  toneForId,
  type Child,
  type Room,
} from "@/app/_lib/children";

type ChildRow = Database["public"]["Tables"]["children"]["Row"];
type RoomRow = Database["public"]["Tables"]["rooms"]["Row"];

function toRoom(row: Pick<RoomRow, "id" | "name" | "slug" | "position">): Room {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    position: row.position,
  };
}

function toChild(row: ChildRow, roomName: string | null): Child {
  const firstName = row.full_name.split(/\s+/)[0] ?? row.full_name;
  const initial = firstName.charAt(0).toUpperCase();

  return {
    id: row.id,
    fullName: row.full_name,
    firstName,
    initial,
    tone: toneForId(row.id),
    birthDate: row.birth_date,
    birthDateLabel: formatLongDate(row.birth_date),
    birthDateInput: toInputDate(row.birth_date),
    enrolledAt: row.enrolled_at,
    enrolledAtLabel: formatMonthYear(row.enrolled_at),
    ageLabel: ageLabel(row.birth_date),
    roomId: row.room_id,
    roomName,
    allergyTags: row.allergy_tags,
    allergies: row.allergy_tags.map((tag) => ({
      label: allergyLabel(tag),
      note: row.medical_notes ?? "",
    })),
    medicalNotes: row.medical_notes,
    status: row.status,
    parents: [],
  };
}

export const getRooms = cache(async (daycareId: string): Promise<Room[]> => {
  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from("rooms")
    .select("id, name, slug, position")
    .eq("daycare_id", daycareId)
    .order("position", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map(toRoom);
});

export async function getChildren(daycareId: string): Promise<Child[]> {
  const supabase = createClient(await cookies());
  const [rooms, { data, error }] = await Promise.all([
    getRooms(daycareId),
    supabase
      .from("children")
      .select("*")
      .eq("daycare_id", daycareId)
      .eq("status", "active")
      .order("full_name", { ascending: true }),
  ]);

  if (error) {
    throw new Error(error.message);
  }

  const roomNames = new Map(rooms.map((room) => [room.id, room.name]));

  return (data ?? []).map((row) =>
    toChild(row, row.room_id ? (roomNames.get(row.room_id) ?? null) : null),
  );
}

export async function getChild(
  daycareId: string,
  id: string,
): Promise<Child | null> {
  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from("children")
    .select("*")
    .eq("id", id)
    .eq("daycare_id", daycareId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const rooms = await getRooms(daycareId);
  const roomName = data.room_id
    ? (rooms.find((room) => room.id === data.room_id)?.name ?? null)
    : null;

  return toChild(data, roomName);
}
