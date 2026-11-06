import createMiddleware from "next-intl/middleware";
import { NextRequest } from "next/server";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/middleware";
import { buildCsp, cspHeaderName, makeNonce } from "./lib/security/csp";

const intl = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  // CSP bernonce: nonce dikirim ke Next lewat header permintaan (x-nonce + CSP) agar skrip inline Next ikut bernonce.
  const nonce = makeNonce(), csp = buildCsp(nonce);
  const headers = new Headers(request.headers);
  headers.set("x-nonce", nonce);
  headers.set(cspHeaderName(), csp);
  const req = new NextRequest(request, { headers });
  const response = intl(req);
  response.headers.set(cspHeaderName(), csp);
  // Menyegarkan cookie sesi Supabase pada respons yang sama (tidak memblokir bila Supabase belum dikonfigurasi).
  return updateSession(req, response);
}

export const config = {
  // Lewati API, aset Next, dan berkas statis
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
