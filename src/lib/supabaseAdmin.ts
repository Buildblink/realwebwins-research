import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabaseClient";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  if (serviceRoleKey) {
    if (!supabaseUrl) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL must be set to use the admin client.");
    }

    if (!client) {
      client = createClient(supabaseUrl, serviceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }

    return client;
  }

  // Fall back to the public client if a service role key is not provided.
  return getSupabaseClient();
}
