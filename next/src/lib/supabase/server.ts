import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { publicEnv } from "@/config/env";

/** Klien Supabase untuk Server Component / Route Handler; membaca sesi dari cookie permintaan. */
export async function createClient() {
  const { url, anonKey } = publicEnv();
  const store = await cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          /* dipanggil dari Server Component (read-only): aman diabaikan, middleware menyegarkan sesi */
        }
      },
    },
  });
}
