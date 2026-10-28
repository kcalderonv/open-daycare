import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { Database } from "@/utils/supabase/database.types";
import { createClient } from "@/utils/supabase/server";

export type UserRole = Database["public"]["Enums"]["user_role"];

export type CurrentUser = {
  id: string;
  fullName: string;
  role: UserRole;
  daycareId: string;
};

/**
 * Data Access Layer entry point for the authenticated area. The session is
 * verified here, close to the data, instead of trusting the optimistic check
 * in `proxy.ts`.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser> => {
  // Supabase resolves token expiry with Date.now(); deferring to request time
  // keeps that read out of the prerender pass with Cache Components enabled.
  await connection();

  const supabase = createClient(await cookies());
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;

  if (!userId) {
    redirect("/login");
  }

  const { data: profile, error } = await supabase
    .from("users")
    .select("id, full_name, role, daycare_id")
    .eq("id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (error || !profile) {
    redirect("/login?error=no-account");
  }

  return {
    id: profile.id,
    fullName: profile.full_name,
    role: profile.role,
    daycareId: profile.daycare_id,
  };
});

const HOME_BY_ROLE: Record<UserRole, string> = {
  admin: "/",
  staff: "/",
  parent: "/familia",
};

/**
 * Panel guard for the data access layer. `getCurrentUser` is cached per
 * request, so the profile lookup is shared with the layout and the page.
 * A user who opens the other role's panel is sent to their own one; the proxy
 * keeps its optimistic session check and never queries the database.
 */
export async function requireRole(
  roles: readonly UserRole[],
): Promise<CurrentUser> {
  const user = await getCurrentUser();

  if (!roles.includes(user.role)) {
    redirect(HOME_BY_ROLE[user.role]);
  }

  return user;
}
