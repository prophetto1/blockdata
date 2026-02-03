import { createClient } from "@supabase/supabase-js";
import { requirePublicEnv } from "@/lib/env";

export const supabase = createClient(
  requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL"),
  requirePublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

