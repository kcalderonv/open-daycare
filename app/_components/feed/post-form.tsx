"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { ChildAvatar } from "@/app/_components/children/child-avatar";
import { CloseIcon, PlusIcon } from "@/app/_components/icons";
import { FormTextArea } from "@/app/_components/ui/form-field";
import { children } from "@/app/_data/children";
import {
  audienceChipId,
  descriptionLimits,
  photoRules,
  postTypes,
  wholeRoomLabel,
  type PostTypeId,
} from "@/app/_data/post-composer";

type AudienceState = {
  wholeRoom: boolean;
  childIds: string[];
};

type PostField = "audience" | "postType" | "description";

type PostErrors = Partial<Record<PostField | "photos", string>>;

type SelectedPhoto = { id: string; name: string; url: string };

const FIELD_ORDER: PostField[] = ["audience", "postType", "description"];

const FOCUS_TARGETS: Record<PostField, string> = {
  audience: audienceChipId(children[0].id),
  postType: `post-type-${postTypes[0].id}`,
  description: "post-description",
};

const AUDIENCE_MESSAGE = "Elegí al menos un destinatario.";
const POST_TYPE_MESSAGE = "Elegí un tipo de publicación.";
const DESCRIPTION_EMPTY_MESSAGE = "Contá cómo le fue hoy.";
const DESCRIPTION_MIN_MESSAGE = "La descripción debe tener al menos 10 caracteres.";
const DESCRIPTION_MAX_MESSAGE = "La descripción no puede superar los 600 caracteres.";
const PHOTO_TYPE_MESSAGE = "Solo podés subir imágenes JPG, PNG o WebP.";
const PHOTO_SIZE_MESSAGE = "Cada foto debe pesar menos de 5 MB.";
const PHOTO_MAX_MESSAGE = "Podés agregar hasta 4 fotos.";

const SECTION_LABEL =
  "mb-[10px] block text-[12px] font-extrabold tracking-[.7px] text-muted";
const ERROR_CLASS = "mt-2 text-[12.5px] font-bold text-error";
const HEADER_ACTION =
  "cursor-pointer text-[15px] focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2";
const CHIP_BASE =
  "flex cursor-pointer items-center gap-2 rounded-full border-[1.5px] py-1.5 text-sm font-bold";
const CHIP_IDLE =
  "border-border bg-surface text-nav peer-checked:border-ink peer-checked:bg-ink peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-coral peer-focus-visible:ring-offset-2";

function resolvedAudienceIds(selection: AudienceState): string[] {
  return selection.wholeRoom
    ? children.map((child) => child.id)
    : selection.childIds;
}

function validateAudience(selection: AudienceState): string | undefined {
  return resolvedAudienceIds(selection).length === 0
    ? AUDIENCE_MESSAGE
    : undefined;
}

function validatePostType(postType: PostTypeId | null): string | undefined {
  return postType ? undefined : POST_TYPE_MESSAGE;
}

function validateDescription(value: string): string | undefined {
  const description = value.trim();

  if (description === "") {
    return DESCRIPTION_EMPTY_MESSAGE;
  }

  if (description.length < descriptionLimits.min) {
    return DESCRIPTION_MIN_MESSAGE;
  }

  if (description.length > descriptionLimits.max) {
    return DESCRIPTION_MAX_MESSAGE;
  }

  return undefined;
}

type PostFormProps = { onClose: () => void };

export function PostForm({ onClose }: PostFormProps) {
  const [audience, setAudience] = useState<AudienceState>({
    wholeRoom: false,
    childIds: [],
  });
  const [postType, setPostType] = useState<PostTypeId | null>(null);
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [errors, setErrors] = useState<PostErrors>({});

  const objectUrls = useRef<string[]>([]);

  useEffect(() => {
    const urls = objectUrls.current;

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  function updateAudience(next: AudienceState) {
    setAudience(next);
    setErrors((current) =>
      current.audience
        ? { ...current, audience: validateAudience(next) }
        : current,
    );
  }

  function toggleWholeRoom() {
    updateAudience(
      audience.wholeRoom
        ? { wholeRoom: false, childIds: [] }
        : { wholeRoom: true, childIds: [] },
    );
  }

  function toggleChild(childId: string) {
    if (audience.wholeRoom) {
      updateAudience({ wholeRoom: false, childIds: [childId] });
      return;
    }

    const isSelected = audience.childIds.includes(childId);

    updateAudience({
      wholeRoom: false,
      childIds: isSelected
        ? audience.childIds.filter((id) => id !== childId)
        : [...audience.childIds, childId],
    });
  }

  function choosePostType(next: PostTypeId) {
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
      accepted.push({ id: crypto.randomUUID(), name: file.name, url });
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: PostErrors = {
      audience: validateAudience(audience),
      postType: validatePostType(postType),
      description: validateDescription(description),
    };

    setErrors((current) => ({ ...current, ...nextErrors }));

    const firstInvalid = FIELD_ORDER.find((field) => nextErrors[field]);

    if (firstInvalid) {
      event.currentTarget
        .querySelector<HTMLElement>(`#${FOCUS_TARGETS[firstInvalid]}`)
        ?.focus();
      return;
    }

    onClose();
  }

  const descriptionCountClassName =
    description.length > descriptionLimits.max
      ? "text-[12px] font-extrabold text-error"
      : "text-[12px] font-extrabold text-muted";

  return (
    <form
      noValidate
      autoComplete="off"
      onSubmit={handleSubmit}
      className="max-h-[calc(100dvh-32px)] w-full max-w-[580px] overflow-y-auto rounded-3xl border border-border bg-auth-bg shadow-dialog"
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-[26px] py-5">
        <button
          type="button"
          onClick={onClose}
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
          className={`${HEADER_ACTION} font-extrabold text-eyebrow`}
        >
          Publicar
        </button>
      </header>

      <div className="px-[26px] py-6">
        <fieldset
          className="mb-[22px]"
          aria-required="true"
          aria-describedby={errors.audience ? "post-audience-error" : undefined}
        >
          <legend className={SECTION_LABEL}>PARA</legend>
          <div className="flex flex-wrap gap-[9px]">
            {children.map((child) => {
              const checked =
                !audience.wholeRoom && audience.childIds.includes(child.id);

              return (
                <label key={child.id}>
                  <input
                    type="checkbox"
                    id={audienceChipId(child.id)}
                    name="audience"
                    value={child.id}
                    checked={checked}
                    onChange={() => toggleChild(child.id)}
                    className="peer sr-only"
                  />
                  <span
                    className={`${CHIP_BASE} ${CHIP_IDLE} pl-1.5 pr-3.5`}
                  >
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
                checked={audience.wholeRoom}
                onChange={toggleWholeRoom}
                className="peer sr-only"
              />
              <span className={`${CHIP_BASE} ${CHIP_IDLE} px-4`}>
                {wholeRoomLabel}
              </span>
            </label>
          </div>
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
                    onChange={() => choosePostType(option.id)}
                    className="peer sr-only"
                  />
                  <span
                    className={`block cursor-pointer rounded-full px-4 py-2 text-[13.5px] font-extrabold peer-focus-visible:ring-2 peer-focus-visible:ring-coral peer-focus-visible:ring-offset-2 ${active ? option.activeClassName : option.idleClassName}`}
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
                  aria-label={`Quitar foto ${index + 1}`}
                  className="absolute right-1 top-1 flex size-6 cursor-pointer items-center justify-center rounded-full bg-ink/70 text-white focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2"
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
          {errors.photos ? (
            <p id="post-photos-error" role="alert" className={ERROR_CLASS}>
              {errors.photos}
            </p>
          ) : null}
        </div>
      </div>
    </form>
  );
}
