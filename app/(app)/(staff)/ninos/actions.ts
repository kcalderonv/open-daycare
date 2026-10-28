"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/app/_lib/auth";
import { fromInputDate, toAllergyTags } from "@/app/_lib/children";
import { createClient } from "@/utils/supabase/server";

export type ChildMutationResult = { ok: true } | { ok: false; error: string };

const SAVE_ERROR = "No pudimos guardar los cambios. Intentá de nuevo.";

type ChildInput = {
  fullName: string;
  birthDate: string;
  roomId: string;
  allergyTags: string[];
  medicalNotes: string | null;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function currentIsoDate(): string {
  const today = new Date();
  return `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
}

function readChildInput(formData: FormData): ChildInput | null {
  const fullName = String(formData.get("name") ?? "").trim();
  const birthDate = fromInputDate(String(formData.get("birthDate") ?? ""));
  const roomId = String(formData.get("room") ?? "");
  const medicalNotes = String(formData.get("notes") ?? "").trim();
  const allergyTags = toAllergyTags(String(formData.get("allergies") ?? ""));

  if (fullName.length < 2 || fullName.length > 120) {
    return null;
  }

  if (birthDate === "" || birthDate > currentIsoDate()) {
    return null;
  }

  if (roomId === "") {
    return null;
  }

  if (medicalNotes.length > 500) {
    return null;
  }

  return {
    fullName,
    birthDate,
    roomId,
    allergyTags,
    medicalNotes: medicalNotes === "" ? null : medicalNotes,
  };
}

async function roomBelongsToDaycare(
  roomId: string,
  daycareId: string,
): Promise<boolean> {
  const supabase = createClient(await cookies());
  const { data, error } = await supabase
    .from("rooms")
    .select("id")
    .eq("id", roomId)
    .eq("daycare_id", daycareId)
    .maybeSingle();

  return !error && Boolean(data);
}

export async function createChild(
  formData: FormData,
): Promise<ChildMutationResult> {
  const user = await getCurrentUser();
  const input = readChildInput(formData);

  if (!input) {
    return { ok: false, error: SAVE_ERROR };
  }

  if (!(await roomBelongsToDaycare(input.roomId, user.daycareId))) {
    return { ok: false, error: SAVE_ERROR };
  }

  const supabase = createClient(await cookies());
  const { error } = await supabase.from("children").insert({
    daycare_id: user.daycareId,
    room_id: input.roomId,
    full_name: input.fullName,
    birth_date: input.birthDate,
    medical_notes: input.medicalNotes,
    allergy_tags: input.allergyTags,
  });

  if (error) {
    return { ok: false, error: SAVE_ERROR };
  }

  revalidatePath("/ninos", "layout");

  return { ok: true };
}

export async function updateChild(
  childId: string,
  formData: FormData,
): Promise<ChildMutationResult> {
  const user = await getCurrentUser();
  const input = readChildInput(formData);

  if (!input) {
    return { ok: false, error: SAVE_ERROR };
  }

  if (!(await roomBelongsToDaycare(input.roomId, user.daycareId))) {
    return { ok: false, error: SAVE_ERROR };
  }

  const supabase = createClient(await cookies());
  const { error } = await supabase
    .from("children")
    .update({
      room_id: input.roomId,
      full_name: input.fullName,
      birth_date: input.birthDate,
      medical_notes: input.medicalNotes,
      allergy_tags: input.allergyTags,
    })
    .eq("id", childId)
    .eq("daycare_id", user.daycareId);

  if (error) {
    return { ok: false, error: SAVE_ERROR };
  }

  revalidatePath("/ninos", "layout");

  return { ok: true };
}
