import { createClient } from "@supabase/supabase-js";

type SupabaseServerClient = ReturnType<typeof createClient>;

let serverClient: SupabaseServerClient | undefined;

export function getSupabaseServiceClient(): SupabaseServerClient {
  if (!serverClient) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error(
        "Supabase-Umgebungsvariablen fehlen. Bitte NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY (oder NEXT_PUBLIC_SUPABASE_ANON_KEY) setzen."
      );
    }

    serverClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return serverClient;
}





