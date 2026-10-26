"use client";

import {
  createContext,
  useContext,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { PostForm } from "@/app/_components/feed/post-form";
import {
  ModalDialog,
  type ModalDialogHandle,
} from "@/app/_components/ui/modal-dialog";
import { children } from "@/app/_data/children";
import { audienceChipId } from "@/app/_data/post-composer";

const PostComposerContext = createContext<(() => void) | null>(null);

export function usePostComposer(): () => void {
  const openComposer = useContext(PostComposerContext);

  if (!openComposer) {
    throw new Error("usePostComposer must be used inside PostComposerProvider");
  }

  return openComposer;
}

export function PostComposerProvider({
  children: appContent,
}: {
  children: ReactNode;
}): ReactElement {
  const dialogRef = useRef<ModalDialogHandle>(null);
  const [session, setSession] = useState(0);

  function openComposer() {
    dialogRef.current?.open();
  }

  function closeComposer() {
    dialogRef.current?.close();
  }

  return (
    <PostComposerContext.Provider value={openComposer}>
      {appContent}

      <ModalDialog
        ref={dialogRef}
        titleId="post-form-title"
        initialFocusId={audienceChipId(children[0].id)}
        onClose={() => setSession((current) => current + 1)}
      >
        <PostForm key={session} onClose={closeComposer} />
      </ModalDialog>
    </PostComposerContext.Provider>
  );
}
