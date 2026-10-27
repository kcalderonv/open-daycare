import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/utils/supabase/database.types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export function createClient() {
  return createBrowserClient<Database>(supabaseUrl, supabaseKey);
}
