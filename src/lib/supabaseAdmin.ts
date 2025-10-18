import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  supabase as stubSupabase,
  isSupabaseStub,
  type SupabaseAdapter,
} from "@/lib/supabaseClient";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient & SupabaseAdapter {
  if (!supabaseUrl || !serviceRoleKey || isSupabaseStub) {
    return stubSupabase as unknown as SupabaseClient & SupabaseAdapter;
  }

  if (!client) {
    client = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return client as unknown as SupabaseClient & SupabaseAdapter;
}
