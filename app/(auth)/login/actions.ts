"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { resolveNextPath } from "@/app/_lib/next-path";
import { createClient } from "@/utils/supabase/server";

export type LoginState = {
  error: string | null;
};

const MISSING_FIELDS = "Ingresá tu email y tu contraseña.";
const INVALID_CREDENTIALS = "Email o contraseña incorrectos.";
const RATE_LIMITED = "Demasiados intentos. Esperá unos minutos y volvé a probar.";
const ACCOUNT_UNAVAILABLE =
  "Tu cuenta no está habilitada. Contactá a la guardería.";

export async function login(
  _previousState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const emailValue = formData.get("email");
  const passwordValue = formData.get("password");
  const nextValue = formData.get("next");
  const email = typeof emailValue === "string" ? emailValue.trim() : "";
  const password = typeof passwordValue === "string" ? passwordValue : "";
  const hasNext = typeof nextValue === "string" && nextValue.trim() !== "";
  const nextPath = resolveNextPath(
    typeof nextValue === "string" ? nextValue : null,
  );

  if (!email || !password) {
    return { error: MISSING_FIELDS };
  }

  const supabase = createClient(await cookies());
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    return {
      error: error?.status === 429 ? RATE_LIMITED : INVALID_CREDENTIALS,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id, role")
    .eq("id", data.user.id)
    .eq("status", "active")
    .maybeSingle();

  if (profileError || !profile) {
    await supabase.auth.signOut();

    return { error: ACCOUNT_UNAVAILABLE };
  }

  revalidatePath("/", "layout");
  // A saved destination wins; the panel guard corrects it if it points to the
  // other role's panel. Without one, each role lands on its own home.
  redirect(hasNext ? nextPath : profile.role === "parent" ? "/familia" : "/");
}
