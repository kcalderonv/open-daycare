"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export async function signOut() {
  const supabase = createClient(await cookies());
  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect("/login");
}
