import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { updateSession } from "./lib/supabase/middleware";
import { buildCsp, cspHeaderName, makeNonce } from "./lib/security/csp";

const intl = createMiddleware(routing);

// Karakter khusus di alamat (%27, |, ^, dst.) membuat Next 15 + next-intl macet pada proxy internal ("socket hang up" sampai timeout),
// termasuk rute lama /[locale]/[...rest]. Alamat sah NusaMora hanya memakai huruf, angka dan -._~/ (daftar putih), sisanya ditolak lebih awal dengan 404 seragam.
const OK_PATH = /^[A-Za-z0-9\-._~/]*$/;

export default async function middleware(request: NextRequest) {
  if (!OK_PATH.test(request.nextUrl.pathname)) return new NextResponse("Not Found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" } });
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
