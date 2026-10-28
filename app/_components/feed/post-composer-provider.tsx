"use client";

import {
  createContext,
  useCallback,
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
import { audienceChipId } from "@/app/_data/post-composer";
import { defaultRoomId, type ComposerAudience } from "@/app/_lib/posts";

const PostComposerContext = createContext<(() => void) | null>(null);

export function usePostComposer(): () => void {
  const openComposer = useContext(PostComposerContext);

  if (!openComposer) {
    throw new Error("usePostComposer must be used inside PostComposerProvider");
  }

  return openComposer;
}

type PostComposerProviderProps = {
  children: ReactNode;
  audience: ComposerAudience;
  user: { id: string; daycareId: string };
};

export function PostComposerProvider({
  children: appContent,
  audience,
  user,
}: PostComposerProviderProps): ReactElement {
  const dialogRef = useRef<ModalDialogHandle>(null);
  const pendingRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [session, setSession] = useState(0);

  // Stable identity so context consumers do not re-render on every provider render.
  const openComposer = useCallback(() => {
    dialogRef.current?.open();
  }, []);

  const setPendingState = useCallback((value: boolean) => {
    pendingRef.current = value;
    setPending(value);
  }, []);

  function closeComposer() {
    if (pendingRef.current) {
      return;
    }

    dialogRef.current?.close();
  }

  function handleClose() {
    pendingRef.current = false;
    setPending(false);
    setSession((current) => current + 1);
  }

  const defaultRoom = defaultRoomId(audience);
  const firstChild = audience.children.find(
    (child) => child.roomId === defaultRoom,
  );

  return (
    <PostComposerContext.Provider value={openComposer}>
      {appContent}

      <ModalDialog
        ref={dialogRef}
        titleId="post-form-title"
        initialFocusId={firstChild ? audienceChipId(firstChild.id) : undefined}
        preventClose={pending}
        onClose={handleClose}
      >
        <PostForm
          key={session}
          audience={audience}
          user={user}
          pending={pending}
          onPendingChange={setPendingState}
          onClose={closeComposer}
        />
      </ModalDialog>
    </PostComposerContext.Provider>
  );
}
