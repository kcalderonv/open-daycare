import { cookies } from "next/headers";
import type { Parent, ParentRelationship } from "@/app/_lib/children";
import {
  normalizeInvitationCode,
  type InvitationPreview,
  type InvitationStatus,
} from "@/app/_lib/invitations";
import { createClient } from "@/utils/supabase/server";

const INVITATION_STATUSES: InvitationStatus[] = [
  "pending",
  "expired",
  "accepted",
  "cancelled",
  "not_found",
];

function toStatus(value: string): InvitationStatus {
  return (
    INVITATION_STATUSES.find((status) => status === value) ?? "not_found"
  );
}

/**
 * Anonymous RPC: the code is the only credential, so nothing is exposed
 * until the caller proves they hold it.
 */
export async function getInvitationPreview(
  code: string,
): Promise<InvitationPreview> {
  const supabase = createClient(await cookies());
  const { data, error } = await supabase.rpc("get_invitation_preview", {
    p_code: normalizeInvitationCode(code),
  });

  if (error) {
    throw new Error(error.message);
  }

  const row = data?.[0];

  if (!row) {
    return {
      status: "not_found",
      parentFullName: "",
      childFirstName: "",
      childFullName: "",
      roomName: "",
      email: "",
    };
  }

  return {
    status: toStatus(row.status),
    parentFullName: row.parent_full_name,
    childFirstName: row.child_first_name,
    childFullName: row.child_full_name,
    roomName: row.room_name,
    email: row.email,
  };
}

type ParentRow = {
  id: string;
  child_id: string;
  relationship: ParentRelationship;
  users: { full_name: string } | null;
};

type PendingInvitationRow = {
  id: string;
  child_id: string;
  full_name: string;
  relationship: ParentRelationship;
};

/**
 * Active links first, then pending invitations, both in creation order.
 * One query per source, grouped by child so the list page stays linear.
 */
export async function getParentsForChildren(
  childIds: string[],
): Promise<Map<string, Parent[]>> {
  const grouped = new Map<string, Parent[]>();

  if (childIds.length === 0) {
    return grouped;
  }

  const supabase = createClient(await cookies());

  const [linksResult, pendingResult] = await Promise.all([
    supabase
      .from("parent_children")
      .select("id, child_id, relationship, users(full_name)")
      .in("child_id", childIds)
      .order("created_at", { ascending: true }),
    supabase
      .from("invitations")
      .select("id, child_id, full_name, relationship")
      .in("child_id", childIds)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true }),
  ]);

  if (linksResult.error || pendingResult.error) {
    throw new Error(
      linksResult.error?.message ?? pendingResult.error?.message ?? "parents",
    );
  }

  for (const row of (linksResult.data ?? []) as unknown as ParentRow[]) {
    const parents = grouped.get(row.child_id) ?? [];

    parents.push({
      id: row.id,
      name: row.users?.full_name ?? "",
      relationship: row.relationship,
      status: "active",
    });
    grouped.set(row.child_id, parents);
  }

  for (const row of (pendingResult.data ?? []) as PendingInvitationRow[]) {
    const parents = grouped.get(row.child_id) ?? [];

    parents.push({
      id: row.id,
      name: row.full_name,
      relationship: row.relationship,
      status: "pending",
    });
    grouped.set(row.child_id, parents);
  }

  return grouped;
}
