"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { postPhotoBucket } from "@/app/_data/post-composer";
import { postTypes, type PostType } from "@/app/_data/post-types";
import { getCurrentUser } from "@/app/_lib/auth";
import { createClient } from "@/utils/supabase/server";

export type CreatePostPhotoInput = {
  path: string;
  width: number;
  height: number;
};

export type CreatePostInput = {
  type: PostType;
  roomId: string;
  roomWide: boolean;
  body: string;
  childIds: string[];
  photos: CreatePostPhotoInput[];
};

export type CreatePostResult =
  | { ok: true; postId: string }
  | { ok: false; error: string };

const ERROR_MESSAGES: Record<string, string> = {
  invalid_body: "La descripción debe tener entre 10 y 600 caracteres.",
  invalid_room: "Elegí una sala válida.",
  invalid_children: "Alguno de los destinatarios ya no está disponible.",
  room_audience_mismatch:
    "La sala cambió mientras escribías. Volvé a elegir los destinatarios.",
  photo_consent_required:
    "Hay niños sin consentimiento de fotos. Sacá las fotos o cambialos de destinatarios.",
  too_many_photos: "Podés agregar hasta 4 fotos.",
  invalid_photo_path: "No pudimos validar las fotos. Intentá de nuevo.",
  not_authenticated: "No tenés permiso para publicar.",
  not_authorized: "No tenés permiso para publicar.",
};

const GENERIC_ERROR = "No pudimos publicar. Intentá de nuevo.";

export async function createPost(
  input: CreatePostInput,
): Promise<CreatePostResult> {
  const user = await getCurrentUser();

  if (user.role === "parent") {
    return { ok: false, error: ERROR_MESSAGES.not_authorized };
  }

  const body = input.body.trim();
  const childIds = Array.from(new Set(input.childIds));

  if (body.length < 10 || body.length > 600) {
    return { ok: false, error: ERROR_MESSAGES.invalid_body };
  }

  if (!postTypes.some((option) => option.id === input.type)) {
    return { ok: false, error: GENERIC_ERROR };
  }

  if (input.roomId === "" || childIds.length === 0) {
    return { ok: false, error: ERROR_MESSAGES.invalid_children };
  }

  if (input.photos.length > 4) {
    return { ok: false, error: ERROR_MESSAGES.too_many_photos };
  }

  const supabase = createClient(await cookies());
  const { data, error } = await supabase.rpc("create_post", {
    p_type: input.type,
    p_room_id: input.roomId,
    p_body: body,
    p_child_ids: childIds,
    p_photos: input.photos,
    p_room_wide: input.roomWide,
  });

  if (error) {
    if (input.photos.length > 0) {
      await supabase.storage
        .from(postPhotoBucket)
        .remove(input.photos.map((photo) => photo.path));
    }

    return {
      ok: false,
      error: ERROR_MESSAGES[error.message] ?? GENERIC_ERROR,
    };
  }

  revalidatePath("/", "layout");

  return { ok: true, postId: data };
}
