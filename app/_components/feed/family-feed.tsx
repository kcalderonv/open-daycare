"use client";

import { useState } from "react";
import { ChildAvatar } from "@/app/_components/children/child-avatar";
import { FamilyPostCard } from "@/app/_components/feed/family-post-card";
import type { FamilyChild } from "@/app/_lib/family-queries";
import { groupFeedByDay, type FeedPost } from "@/app/_lib/posts";

type FamilyFeedProps = {
  familyChildren: FamilyChild[];
  posts: FeedPost[];
};

export function FamilyFeed({ familyChildren, posts }: FamilyFeedProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selectedChild =
    familyChildren.find((child) => child.id === selectedId) ?? null;

  const visiblePosts = selectedChild
    ? posts.filter(
        (post) =>
          post.childIds.includes(selectedChild.id) ||
          (post.roomWide &&
            selectedChild.roomId !== null &&
            post.roomId === selectedChild.roomId),
      )
    : posts;

  if (posts.length === 0) {
    return <FamilyFeedEmptyState />;
  }

  const groups = groupFeedByDay(visiblePosts);
  const selectedName = selectedChild?.firstName ?? null;

  return (
    <>
      <div className="mb-[22px] flex flex-wrap gap-2.5">
        {familyChildren.map((child) => {
          const active = child.id === selectedId;

          return (
            <button
              key={child.id}
              type="button"
              aria-pressed={active}
              onClick={() => setSelectedId(child.id)}
              className={`flex cursor-pointer items-center gap-2 rounded-full border-[1.5px] py-[7px] pl-2 pr-[15px] text-sm font-bold ${
                active
                  ? "border-ink bg-ink text-white"
                  : "border-border bg-surface text-nav"
              }`}
            >
              <ChildAvatar
                initial={child.initial}
                tone={child.tone}
                size="xs"
              />
              {child.firstName}
            </button>
          );
        })}

        <button
          type="button"
          aria-pressed={selectedId === null}
          onClick={() => setSelectedId(null)}
          className={`cursor-pointer rounded-full border-[1.5px] px-4 py-[7px] text-sm font-bold ${
            selectedId === null
              ? "border-ink bg-ink text-white"
              : "border-border bg-surface text-nav"
          }`}
        >
          Todos
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-[20px] border border-dashed border-border bg-surface px-6 py-8 text-center text-sm text-muted">
          Todavía no hay publicaciones de {selectedName}.
        </p>
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((group) => (
            <section key={group.key} aria-label={group.label}>
              <div className="mb-3.5 flex items-center gap-3.5">
                <span className="text-[12.5px] font-extrabold tracking-[.8px] text-section-label">
                  {group.label}
                </span>
                <span className="h-px flex-1 bg-separator" />
              </div>

              <div className="flex flex-col gap-4">
                {group.posts.map((post) => (
                  <FamilyPostCard
                    key={post.id}
                    post={post}
                    child={familyChildren.find((item) =>
                      post.childIds.includes(item.id),
                    )}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

function FamilyFeedEmptyState() {
  return (
    <div className="rounded-[20px] border border-dashed border-border bg-surface px-6 py-10 text-center">
      <p className="font-display text-[17px] font-semibold text-ink">
        Todavía no hay publicaciones.
      </p>
      <p className="mt-1 text-sm text-muted">
        Compartí el primer momento del día.
      </p>
    </div>
  );
}
