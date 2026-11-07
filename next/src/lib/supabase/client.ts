import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/config/env";

/** Klien Supabase untuk Client Component. Hanya memakai kunci publishable (RLS yang melindungi data). */
export function createClient() {
  const { url, anonKey } = publicEnv();
  return createBrowserClient(url, anonKey);
}
