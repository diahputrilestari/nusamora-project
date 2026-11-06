import createMiddleware from "next-intl/middleware";
import type { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/middleware";

const intl = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const response = intl(request);
  // Menyegarkan cookie sesi Supabase pada respons yang sama (tidak memblokir bila Supabase belum dikonfigurasi).
  return updateSession(request, response);
}

export const config = {
  // Lewati API, aset Next, dan berkas statis
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
