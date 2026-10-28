"use client";

import {
  useImperativeHandle,
  useRef,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type Ref,
} from "react";

const FOCUSABLE_SELECTOR =
  'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])';

export type ModalDialogHandle = {
  open: () => void;
  close: () => void;
};

type ModalDialogProps = {
  titleId: string;
  initialFocusId?: string;
  preventClose?: boolean;
  onClose?: () => void;
  children: ReactNode;
  ref?: Ref<ModalDialogHandle>;
};

export function ModalDialog({
  titleId,
  initialFocusId,
  preventClose = false,
  onClose,
  children,
  ref,
}: ModalDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  function focusableElements(): HTMLElement[] {
    const dialog = dialogRef.current;

    return dialog
      ? Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR))
      : [];
  }

  function openDialog() {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    dialog.showModal();

    const target = initialFocusId
      ? dialog.querySelector<HTMLElement>(`#${initialFocusId}`)
      : focusableElements()[0];

    target?.focus();
  }

  function closeDialog() {
    const dialog = dialogRef.current;

    if (!dialog) {
      return;
    }

    dialog.close();
    // Chromium queues the dialog's `close` event as an element task, which can
    // land after the dialog is reopened. Clearing in the same tick keeps the
    // reset deterministic for every programmatic close.
    dialog.querySelector("form")?.reset();
  }

  useImperativeHandle(ref, () => ({ open: openDialog, close: closeDialog }));

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (preventClose) {
      return;
    }

    if (event.target === event.currentTarget) {
      closeDialog();
    }
  }

  function handleClose() {
    dialogRef.current?.querySelector("form")?.reset();
    onClose?.();
  }

  // Chromium lets Tab escape to the browser chrome, so the dialog scope is
  // wrapped by hand to keep focus inside the modal.
  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== "Tab") {
      return;
    }

    const focusable = focusableElements();

    if (focusable.length === 0) {
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
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onClose={handleClose}
      onCancel={(event) => {
        if (preventClose) {
          event.preventDefault();
        }
      }}
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
  );
}
