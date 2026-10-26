"use client";

import {
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";

const FOCUSABLE_SELECTOR =
  'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])';

type ChildFormDialogProps = {
  triggerLabel: string;
  triggerClassName: string;
  triggerIcon?: ReactNode;
  children: ReactNode;
};

export function ChildFormDialog({
  triggerLabel,
  triggerClassName,
  triggerIcon,
  children,
}: ChildFormDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  function openDialog() {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    dialog.showModal();
    dialog.querySelector<HTMLInputElement>("#child-name")?.focus();
  }

  function closeDialog() {
    dialogRef.current?.close();
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) {
      closeDialog();
    }
  }

  function handleClose() {
    dialogRef.current?.querySelector("form")?.reset();
  }

  // Chromium lets Tab escape to the browser chrome, so the dialog scope is
  // wrapped by hand to keep focus inside the modal.
  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") {
      return;
    }

    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      FOCUSABLE_SELECTOR,
    );

    if (!focusable || focusable.length === 0) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <>
      <button type="button" onClick={openDialog} className={triggerClassName}>
        {triggerIcon}
        {triggerLabel}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="child-form-title"
        onClose={handleClose}
        onKeyDown={handleKeyDown}
        className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden bg-transparent p-0 backdrop:bg-ink/45"
      >
        <div
          onClick={handleBackdropClick}
          className="flex min-h-dvh items-start justify-center overflow-y-auto p-4 sm:px-6 sm:py-10"
        >
          {children}
        </div>
      </dialog>
    </>
  );
}
