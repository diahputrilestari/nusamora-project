import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/middleware";
import { buildCsp, cspHeaderName, makeNonce } from "./lib/security/csp";

const intl = createMiddleware(routing);

// Tanda kutip tunggal (%27 / ') di alamat membuat Next 15 + next-intl macet pada proxy internal ("socket hang up" sampai timeout),
// termasuk rute lama /[locale]/[...rest]. Tak ada alamat sah NusaMora yang memuatnya, jadi ditolak lebih awal dengan 404 seragam.
const BAD_PATH = /'|%27/i;

export default async function middleware(request: NextRequest) {
  if (BAD_PATH.test(request.nextUrl.pathname)) return new NextResponse("Not Found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
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
