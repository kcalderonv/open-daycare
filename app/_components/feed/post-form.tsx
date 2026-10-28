"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  createPost,
  type CreatePostPhotoInput,
} from "@/app/(app)/posts/actions";
import { ChildAvatar } from "@/app/_components/children/child-avatar";
import { CloseIcon, PlusIcon } from "@/app/_components/icons";
import { FormSelect, FormTextArea } from "@/app/_components/ui/form-field";
import {
  audienceChipId,
  descriptionLimits,
  photoRules,
  postPhotoBucket,
  wholeRoomLabel,
} from "@/app/_data/post-composer";
import { postTypes, type PostType } from "@/app/_data/post-types";
import {
  defaultRoomId,
  type ComposerAudience,
  type ComposerChild,
} from "@/app/_lib/posts";
import { createClient } from "@/utils/supabase/client";

type AudienceState = {
  wholeRoom: boolean;
  childIds: string[];
};

type PostField = "audience" | "postType" | "description";

type PostErrors = Partial<Record<PostField | "photos", string>>;

type SelectedPhoto = {
  id: string;
  file: File;
  url: string;
};

type ReencodedPhoto = {
  blob: Blob;
  contentType: string;
  extension: string;
  width: number;
  height: number;
};

const FIELD_ORDER: PostField[] = ["audience", "postType", "description"];

const FOCUS_TARGETS: Record<PostField, string> = {
  audience: "post-room",
  postType: "post-type-meal",
  description: "post-description",
};

const AUDIENCE_MESSAGE = "Elegí al menos un destinatario.";
const ROOM_EMPTY_MESSAGE = "Esta sala no tiene niños.";
const POST_TYPE_MESSAGE = "Elegí un tipo de publicación.";
const DESCRIPTION_EMPTY_MESSAGE = "Contá cómo le fue hoy.";
const DESCRIPTION_MIN_MESSAGE =
  "La descripción debe tener al menos 10 caracteres.";
const DESCRIPTION_MAX_MESSAGE =
  "La descripción no puede superar los 600 caracteres.";
const PHOTO_TYPE_MESSAGE = "Solo podés subir imágenes JPG, PNG o WebP.";
const PHOTO_SIZE_MESSAGE = "Cada foto debe pesar menos de 5 MB.";
const PHOTO_MAX_MESSAGE = "Podés agregar hasta 4 fotos.";
const PHOTO_UPLOAD_MESSAGE = "No pudimos subir las fotos. Intentá de nuevo.";

const SECTION_LABEL =
  "mb-[10px] block text-[12px] font-extrabold tracking-[.7px] text-muted";
const ERROR_CLASS = "mt-2 text-[12.5px] font-bold text-error";
const HEADER_ACTION =
  "cursor-pointer text-[15px] focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
const CHIP_BASE =
  "flex cursor-pointer items-center gap-2 rounded-full border-[1.5px] py-1.5 text-sm font-bold";
const CHIP_IDLE =
  "border-border bg-surface text-nav peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-coral peer-focus-visible:ring-offset-2";

function resolvedAudienceIds(
  selection: AudienceState,
  roomChildren: ComposerChild[],
): string[] {
  return selection.wholeRoom
    ? roomChildren.map((child) => child.id)
    : selection.childIds;
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

async function reencodePhoto(file: File): Promise<ReencodedPhoto> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(
    1,
    photoRules.maxDimension / Math.max(bitmap.width, bitmap.height),
  );
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");

  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");

  if (!context) {
    bitmap.close();
    throw new Error("canvas-unavailable");
  }

  context.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const webp = await canvasToBlob(canvas, photoRules.outputType, photoRules.quality);

  if (webp) {
    return {
      blob: webp,
      contentType: "image/webp",
      extension: "webp",
      width,
      height,
    };
  }

  const jpeg = await canvasToBlob(canvas, "image/jpeg", photoRules.quality);

  if (!jpeg) {
    throw new Error("encode-failed");
  }

  return {
    blob: jpeg,
    contentType: "image/jpeg",
    extension: "jpg",
    width,
    height,
  };
}

type PostFormProps = {
  audience: ComposerAudience;
  user: { id: string; daycareId: string };
  pending: boolean;
  onPendingChange: (value: boolean) => void;
  onClose: () => void;
};

export function PostForm({
  audience,
  user,
  pending,
  onPendingChange,
  onClose,
}: PostFormProps) {
  const router = useRouter();
  const [roomId, setRoomId] = useState(() => defaultRoomId(audience));
  const [selection, setSelection] = useState<AudienceState>({
    wholeRoom: false,
    childIds: [],
  });
  const [postType, setPostType] = useState<PostType | null>(null);
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [errors, setErrors] = useState<PostErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [uploadedCount, setUploadedCount] = useState(0);

  const objectUrls = useRef<string[]>([]);

  useEffect(() => {
    // Read the ref inside the cleanup: removePhoto replaces the array, so a
    // snapshot taken at mount would miss URLs created after a removal.
    return () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const roomChildren = audience.children.filter(
    (child) => child.roomId === roomId,
  );
  const selectedIds = resolvedAudienceIds(selection, roomChildren);
  const blockedChild =
    photos.length > 0
      ? roomChildren.find(
          (child) => selectedIds.includes(child.id) && !child.photoConsent,
        )
      : undefined;
  const consentMessage = blockedChild
    ? `${blockedChild.firstName} no tiene consentimiento de fotos. Sacá las fotos o cambialo de destinatarios.`
    : undefined;
  const photosError = consentMessage ?? errors.photos;

  function updateSelection(next: AudienceState) {
    setSelection(next);
    setErrors((current) =>
      current.audience
        ? { ...current, audience: validateAudience(next) }
        : current,
    );
  }

  function validateAudience(next: AudienceState): string | undefined {
    if (roomChildren.length === 0) {
      return ROOM_EMPTY_MESSAGE;
    }

    return resolvedAudienceIds(next, roomChildren).length === 0
      ? AUDIENCE_MESSAGE
      : undefined;
  }

  function validatePostType(value: PostType | null): string | undefined {
    return value ? undefined : POST_TYPE_MESSAGE;
  }

  function validateDescription(value: string): string | undefined {
    const text = value.trim();

    if (text === "") {
      return DESCRIPTION_EMPTY_MESSAGE;
    }

    if (text.length < descriptionLimits.min) {
      return DESCRIPTION_MIN_MESSAGE;
    }

    if (text.length > descriptionLimits.max) {
      return DESCRIPTION_MAX_MESSAGE;
    }

    return undefined;
  }

  function chooseRoom(nextRoomId: string) {
    setRoomId(nextRoomId);
    setSelection({ wholeRoom: false, childIds: [] });
    setErrors((current) => ({
      ...current,
      audience: undefined,
      photos: undefined,
    }));
  }

  function toggleWholeRoom() {
    if (roomChildren.length === 0) {
      return;
    }

    updateSelection(
      selection.wholeRoom
        ? { wholeRoom: false, childIds: [] }
        : { wholeRoom: true, childIds: [] },
    );
  }

  function toggleChild(childId: string) {
    if (selection.wholeRoom) {
      updateSelection({ wholeRoom: false, childIds: [childId] });
      return;
    }

    const isSelected = selection.childIds.includes(childId);

    updateSelection({
      wholeRoom: false,
      childIds: isSelected
        ? selection.childIds.filter((id) => id !== childId)
        : [...selection.childIds, childId],
    });
  }

  function choosePostType(next: PostType) {
    setPostType(next);
    setErrors((current) =>
      current.postType ? { ...current, postType: undefined } : current,
    );
  }

  function handleDescriptionChange(event: ChangeEvent<HTMLTextAreaElement>) {
    const { value } = event.target;

    setDescription(value);
    setErrors((current) =>
      current.description
        ? { ...current, description: validateDescription(value) }
        : current,
    );
  }

  function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    // Clearing the input lets the same file be picked again after a rejection.
    event.target.value = "";

    if (files.length === 0) {
      return;
    }

    const accepted: SelectedPhoto[] = [];
    const room = photoRules.max - photos.length;
    let message: string | undefined;

    for (const file of files) {
      if (!photoRules.allowedTypes.includes(file.type)) {
        message ??= PHOTO_TYPE_MESSAGE;
        continue;
      }

      if (file.size > photoRules.maxBytes) {
        message ??= PHOTO_SIZE_MESSAGE;
        continue;
      }

      if (accepted.length >= room) {
        message ??= PHOTO_MAX_MESSAGE;
        continue;
      }

      const url = URL.createObjectURL(file);

      objectUrls.current.push(url);
      accepted.push({ id: crypto.randomUUID(), file, url });
    }

    if (accepted.length > 0) {
      setPhotos((current) => [...current, ...accepted]);
    }

    setErrors((current) => ({ ...current, photos: message }));
  }

  function removePhoto(photo: SelectedPhoto) {
    URL.revokeObjectURL(photo.url);
    objectUrls.current = objectUrls.current.filter((url) => url !== photo.url);
    setPhotos((current) => current.filter((item) => item.id !== photo.id));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (pending) {
      return;
    }

    const nextErrors: PostErrors = {
      audience: validateAudience(selection),
      postType: validatePostType(postType),
      description: validateDescription(description),
    };

    setErrors(nextErrors);

    const firstInvalid = FIELD_ORDER.find((field) => nextErrors[field]);

    if (firstInvalid) {
      const target =
        firstInvalid === "audience" && roomChildren[0]
          ? audienceChipId(roomChildren[0].id)
          : FOCUS_TARGETS[firstInvalid];

      event.currentTarget
        .querySelector<HTMLElement>(`#${target}`)
        ?.focus();
      return;
    }

    if (!postType) {
      return;
    }

    if (consentMessage) {
      setErrors((current) => ({ ...current, photos: consentMessage }));
      event.currentTarget
        .querySelector<HTMLElement>("#post-photos")
        ?.focus();
      return;
    }

    setFormError(null);
    setUploadedCount(0);
    onPendingChange(true);

    const supabase = createClient();
    const uploaded: CreatePostPhotoInput[] = [];

    try {
      for (const photo of photos) {
        const processed = await reencodePhoto(photo.file);
        const path = `${user.daycareId}/${user.id}/${crypto.randomUUID()}.${processed.extension}`;
        const { error } = await supabase.storage
          .from(postPhotoBucket)
          .upload(path, processed.blob, {
            contentType: processed.contentType,
            upsert: false,
          });

        if (error) {
          throw new Error("upload-failed");
        }

        uploaded.push({
          path,
          width: processed.width,
          height: processed.height,
        });
        setUploadedCount(uploaded.length);
      }

      const result = await createPost({
        type: postType,
        roomId,
        roomWide: selection.wholeRoom,
        body: description.trim(),
        childIds: selectedIds,
        photos: uploaded,
      });

      if (!result.ok) {
        setFormError(result.error);
        onPendingChange(false);
        return;
      }

      onPendingChange(false);
      onClose();
      router.refresh();
    } catch {
      if (uploaded.length > 0) {
        await supabase.storage
          .from(postPhotoBucket)
          .remove(uploaded.map((photo) => photo.path));
      }

      setFormError(PHOTO_UPLOAD_MESSAGE);
      onPendingChange(false);
    }
  }

  const descriptionCountClassName =
    description.length > descriptionLimits.max
      ? "text-[12px] font-extrabold text-error"
      : "text-[12px] font-extrabold text-muted";

  const submitLabel =
    pending && photos.length > 0 && uploadedCount < photos.length
      ? "Subiendo…"
      : pending
        ? "Publicando…"
        : "Publicar";

  return (
    <form
      noValidate
      autoComplete="off"
      aria-busy={pending}
      onSubmit={handleSubmit}
      className="max-h-[calc(100dvh-32px)] w-full max-w-[580px] overflow-y-auto rounded-3xl border border-border bg-auth-bg shadow-dialog"
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-[26px] py-5">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className={`${HEADER_ACTION} font-bold text-muted`}
        >
          Cancelar
        </button>
        <h2
          id="post-form-title"
          className="whitespace-nowrap font-display text-[16px] font-semibold text-ink sm:text-[18px]"
        >
          Nueva publicación
        </h2>
        <button
          type="submit"
          disabled={pending}
          className={`${HEADER_ACTION} font-extrabold text-eyebrow`}
        >
          {submitLabel}
        </button>
      </header>

      <div className="px-[26px] py-6">
        {formError ? (
          <p
            role="alert"
            className="mb-4 rounded-xl bg-error/10 px-4 py-3 text-[13px] font-bold text-error"
          >
            {formError}
          </p>
        ) : null}

        {pending ? (
          <p
            aria-live="polite"
            className="mb-4 text-[12.5px] font-bold text-muted"
          >
            {photos.length > 0 && uploadedCount < photos.length
              ? `Subiendo ${uploadedCount + 1} de ${photos.length}…`
              : "Publicando…"}
          </p>
        ) : null}

        <div className="mb-[22px]">
          <FormSelect
            id="post-room"
            name="room"
            label="SALA"
            options={
              audience.rooms.length > 0
                ? audience.rooms.map((room) => ({
                    value: room.id,
                    label: room.name,
                  }))
                : [{ value: "", label: "Sin salas" }]
            }
            value={roomId}
            disabled={pending}
            onChange={(event) => chooseRoom(event.target.value)}
            required
          />
        </div>

        <fieldset
          className="mb-[22px]"
          aria-required="true"
          aria-describedby={errors.audience ? "post-audience-error" : undefined}
        >
          <legend className={SECTION_LABEL}>PARA</legend>
          <div className="flex flex-wrap gap-[9px]">
            {roomChildren.map((child) => {
              const checked =
                !selection.wholeRoom && selection.childIds.includes(child.id);

              return (
                <label key={child.id}>
                  <input
                    type="checkbox"
                    id={audienceChipId(child.id)}
                    name="audience"
                    value={child.id}
                    checked={checked}
                    disabled={pending}
                    onChange={() => toggleChild(child.id)}
                    className="peer sr-only"
                  />
                  <span className={`${CHIP_BASE} ${CHIP_IDLE} pl-1.5 pr-3.5`}>
                    <ChildAvatar
                      initial={child.initial}
                      tone={child.tone}
                      size="xs"
                    />
                    {child.firstName}
                  </span>
                </label>
              );
            })}

            <label>
              <input
                type="checkbox"
                id="post-audience-room"
                name="audience"
                value="room"
                checked={selection.wholeRoom}
                disabled={pending || roomChildren.length === 0}
                onChange={toggleWholeRoom}
                className="peer sr-only"
              />
              <span
                className={`${CHIP_BASE} ${CHIP_IDLE} px-4 ${
                  roomChildren.length === 0 ? "opacity-50" : ""
                }`}
              >
                {wholeRoomLabel}
              </span>
            </label>
          </div>

          {roomChildren.length === 0 ? (
            <p className="mt-2 text-[12.5px] font-bold text-muted">
              {ROOM_EMPTY_MESSAGE}
            </p>
          ) : null}

          {errors.audience ? (
            <p id="post-audience-error" role="alert" className={ERROR_CLASS}>
              {errors.audience}
            </p>
          ) : null}
        </fieldset>

        <fieldset
          className="mb-[22px]"
          aria-required="true"
          aria-describedby={errors.postType ? "post-type-error" : undefined}
        >
          <legend className={SECTION_LABEL}>TIPO</legend>
          <div className="flex flex-wrap gap-[9px]">
            {postTypes.map((option) => {
              const active = postType === option.id;

              return (
                <label key={option.id}>
                  <input
                    type="radio"
                    id={`post-type-${option.id}`}
                    name="postType"
                    value={option.id}
                    checked={active}
                    disabled={pending}
                    onChange={() => choosePostType(option.id)}
                    className="peer sr-only"
                  />
                  <span
                    className={`block cursor-pointer rounded-full px-4 py-2 text-[13.5px] font-extrabold peer-focus-visible:ring-2 peer-focus-visible:ring-coral peer-focus-visible:ring-offset-2 ${
                      active ? option.activeClassName : option.idleClassName
                    }`}
                  >
                    {option.label}
                  </span>
                </label>
              );
            })}
          </div>
          {errors.postType ? (
            <p id="post-type-error" role="alert" className={ERROR_CLASS}>
              {errors.postType}
            </p>
          ) : null}
        </fieldset>

        <div className="mb-[22px]">
          <FormTextArea
            id="post-description"
            name="description"
            label="DESCRIPCIÓN"
            placeholder="Contá cómo le fue hoy…"
            value={description}
            onChange={handleDescriptionChange}
            aria-describedby="post-description-count"
            error={errors.description}
            labelEnd={
              <span
                id="post-description-count"
                className={descriptionCountClassName}
              >
                {description.length}/{descriptionLimits.max}
              </span>
            }
            className="min-h-[120px]"
            disabled={pending}
            required
          />
        </div>

        <div>
          <p className={SECTION_LABEL}>FOTOS</p>
          <div className="flex flex-wrap gap-3">
            {photos.map((photo, index) => (
              <div
                key={photo.id}
                className="relative size-24 overflow-hidden rounded-[14px] border border-border bg-photo-bg"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt={`Foto seleccionada ${index + 1}`}
                  className="size-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => removePhoto(photo)}
                  disabled={pending}
                  aria-label={`Quitar foto ${index + 1}`}
                  className="absolute right-1 top-1 flex size-6 cursor-pointer items-center justify-center rounded-full bg-ink/70 text-white focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <CloseIcon width={14} height={14} />
                </button>
              </div>
            ))}

            {photos.length < photoRules.max ? (
              <label
                htmlFor="post-photos"
                className="size-24 cursor-pointer rounded-[14px]"
              >
                <input
                  type="file"
                  id="post-photos"
                  aria-label="Agregar fotos"
                  accept={photoRules.accept}
                  multiple
                  disabled={pending}
                  onChange={handleFiles}
                  className="peer sr-only"
                />
                <span className="flex size-full flex-col items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-dashed border-photo-border bg-photo-bg text-[12px] text-photo-text peer-focus-visible:ring-2 peer-focus-visible:ring-coral peer-focus-visible:ring-offset-2">
                  <PlusIcon
                    width={22}
                    height={22}
                    className="text-coral-link"
                  />
                  Agregar
                </span>
              </label>
            ) : null}
          </div>
          {photosError ? (
            <p id="post-photos-error" role="alert" className={ERROR_CLASS}>
              {photosError}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}
