"use client";

import { useState } from "react";
import { ChildCard } from "@/app/_components/children/child-card";
import { SearchIcon } from "@/app/_components/icons";
import type { ChildGroup } from "@/app/_lib/children";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function countLabel(count: number): string {
  return `${count} ${count === 1 ? "niño" : "niños"}`;
}

export function ChildrenSearch({ groups }: { groups: ChildGroup[] }) {
  const [query, setQuery] = useState("");
  const term = normalize(query);
  const visible = groups
    .map((group) => ({
      group,
      matches:
        term === ""
          ? group.children
          : group.children.filter((child) =>
              normalize(child.fullName).includes(term),
            ),
    }))
    .filter(({ matches }) => term === "" || matches.length > 0);
  const hasResults = visible.some(({ matches }) => matches.length > 0);

  return (
    <>
      <div className="mb-[22px] flex items-center gap-[11px] rounded-[14px] border border-border bg-surface px-4 py-3">
        <SearchIcon
          width={18}
          height={18}
          className="flex-none text-photo-text"
        />
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar niño…"
          aria-label="Buscar niño"
          autoComplete="off"
          className="flex-1 border-none bg-transparent text-[15px] text-ink placeholder:text-placeholder focus:outline-none"
        />
      </div>

      {term !== "" && !hasResults ? (
        <p className="rounded-[18px] border border-dashed border-border bg-surface px-6 py-10 text-center text-[14.5px] text-muted">
          No encontramos ningún niño con ese nombre.
        </p>
      ) : (
        <div className="flex flex-col gap-[22px]">
          {visible.map(({ group, matches }) => (
            <section key={group.id}>
              <div className="mb-3.5 flex items-center gap-3">
                <span className="text-[12.5px] font-extrabold uppercase tracking-[.8px] text-ink">
                  {group.title}
                </span>
                <span className="text-[13px] text-muted-soft">
                  {countLabel(group.children.length)}
                </span>
                <span className="h-px flex-1 bg-separator" />
              </div>

              {matches.length === 0 ? (
                <p className="rounded-[18px] border border-dashed border-border bg-surface px-6 py-10 text-center text-[14.5px] text-muted">
                  Todavía no hay niños en esta sala.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  {matches.map((child) => (
                    <ChildCard key={child.id} child={child} />
                  ))}
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </>
  );
}
