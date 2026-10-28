"use client";

import { useRef, useState } from "react";
import {
  ModalDialog,
  type ModalDialogHandle,
} from "@/app/_components/ui/modal-dialog";
import type { FeedPhoto } from "@/app/_lib/posts";

export function PostPhotoGrid({ photos }: { photos: FeedPhoto[] }) {
  const dialogRef = useRef<ModalDialogHandle>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (photos.length === 0) {
    return null;
  }

  const isSingle = photos.length === 1;
  const active = activeIndex === null ? null : (photos[activeIndex] ?? null);

  function openPhoto(index: number) {
    setActiveIndex(index);
    dialogRef.current?.open();
  }

  function closePhoto() {
    dialogRef.current?.close();
  }

  return (
    <>
      <div className={isSingle ? "mt-3.5" : "mt-3.5 grid grid-cols-2 gap-2"}>
        {photos.map((photo, index) => {
          const wide = photos.length === 3 && index === 0;

          return (
            <button
              key={photo.path}
              type="button"
              onClick={() => openPhoto(index)}
              aria-label={`Ampliar foto ${index + 1}`}
              className={`group relative cursor-pointer overflow-hidden rounded-2xl border border-border bg-photo-bg focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2 ${
                wide ? "col-span-2" : ""
              }`}
            >
              {/* Signed URLs change on every render, so next/image cannot cache them. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.url}
                alt={`Foto ${index + 1} de la publicación`}
                loading="lazy"
                className={
                  isSingle
                    ? "h-[260px] w-full object-cover"
                    : `w-full object-cover ${wide ? "aspect-[16/9]" : "aspect-[4/3]"}`
                }
              />
            </button>
          );
        })}
      </div>

      <ModalDialog
        ref={dialogRef}
        titleId="post-photo-title"
        onClose={() => setActiveIndex(null)}
      >
        <div className="flex w-full max-w-[920px] flex-col items-end gap-3">
          <h2 id="post-photo-title" className="sr-only">
            Foto de la publicación
          </h2>

          {active ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={active.url}
              alt="Foto ampliada de la publicación"
              className="max-h-[calc(100dvh-96px)] w-full rounded-2xl object-contain"
            />
          ) : null}

          <button
            type="button"
            onClick={closePhoto}
            className="cursor-pointer rounded-xl bg-surface px-4 py-2 text-sm font-extrabold text-ink shadow-card focus-visible:ring-2 focus-visible:ring-coral focus-visible:ring-offset-2"
          >
            Cerrar
          </button>
        </div>
      </ModalDialog>
    </>
  );
}
