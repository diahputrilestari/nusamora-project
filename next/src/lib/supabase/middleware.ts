import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";

/** Menyegarkan sesi Supabase dan menulis cookie ke `response`. Jika env belum ada, respons dikembalikan apa adanya. */
export async function updateSession(request: NextRequest, response: NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return response;
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => list.forEach(({ name, value, options }) => response.cookies.set(name, value, options)),
    },
  });
  try {
    await supabase.auth.getUser(); // memvalidasi token ke server Auth (bukan sekadar membaca cookie)
  } catch {
    /* Auth tidak terjangkau: lanjutkan sebagai tamu */
  }
  return response;
}
