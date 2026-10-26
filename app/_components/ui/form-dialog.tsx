"use client";

import {
  createContext,
  useContext,
  useRef,
  type ReactElement,
  type ReactNode,
} from "react";
import {
  ModalDialog,
  type ModalDialogHandle,
} from "@/app/_components/ui/modal-dialog";

const FormDialogContext = createContext<(() => void) | null>(null);

export function useFormDialogClose(): () => void {
  const closeDialog = useContext(FormDialogContext);

  if (!closeDialog) {
    throw new Error("useFormDialogClose must be used inside FormDialog");
  }

  return closeDialog;
}

type FormDialogProps = {
  triggerContent: ReactNode;
  triggerClassName: string;
  titleId: string;
  initialFocusId: string;
  children: ReactNode;
};

export function FormDialog({
  triggerContent,
  triggerClassName,
  titleId,
  initialFocusId,
  children,
}: FormDialogProps): ReactElement {
  const dialogRef = useRef<ModalDialogHandle>(null);

  function closeDialog() {
    dialogRef.current?.close();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.open()}
        className={triggerClassName}
      >
        {triggerContent}
      </button>

      <ModalDialog
        ref={dialogRef}
        titleId={titleId}
        initialFocusId={initialFocusId}
      >
        <FormDialogContext.Provider value={closeDialog}>
          {children}
        </FormDialogContext.Provider>
      </ModalDialog>
    </>
  );
}
