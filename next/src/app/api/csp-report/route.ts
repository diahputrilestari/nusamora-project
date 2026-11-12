import { NextResponse } from "next/server";

// Penampung laporan pelanggaran CSP. Hanya mencatat ke log server (tanpa query string/fragmen agar token tidak ikut tercatat).
export const dynamic = "force-dynamic";
const WINDOW_MS = 60_000, MAX_PER_WINDOW = 60;
let winStart = Date.now(), count = 0;

const strip = (u: unknown) => (typeof u === "string" ? u.split(/[?#]/)[0]!.slice(0, 200) : undefined);

export async function POST(req: Request) {
  const now = Date.now();
  if (now - winStart > WINDOW_MS) { winStart = now; count = 0; }
  if (++count > MAX_PER_WINDOW) return new NextResponse(null, { status: 204 }); // buang kelebihan, jangan banjiri log
  if (Number(req.headers.get("content-length") || 0) > 8192) return new NextResponse(null, { status: 413 });
  try {
    const body = JSON.parse((await req.text()).slice(0, 8192));
    const r = body["csp-report"] ?? body[0]?.body ?? body;
    console.warn("[csp-violation]", JSON.stringify({
      directive: r["effective-directive"] ?? r.effectiveDirective ?? r["violated-directive"],
      blocked: strip(r["blocked-uri"] ?? r.blockedURL),
      document: strip(r["document-uri"] ?? r.documentURL),
    }));
  } catch { /* abaikan laporan rusak */ }
  return new NextResponse(null, { status: 204 });
}
