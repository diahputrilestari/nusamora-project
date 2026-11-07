import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Health check untuk monitoring: proses hidup + Supabase terjangkau (timeout 3 dtk). Tidak membocorkan detail internal. */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let supabase: "ok" | "down" | "unconfigured" = "unconfigured";
  if (url) {
    try {
      const r = await fetch(`${url}/auth/v1/health`, {
        signal: AbortSignal.timeout(3000),
        headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "" },
      });
      supabase = r.ok ? "ok" : "down";
    } catch {
      supabase = "down";
    }
  }
  const healthy = supabase !== "down";
  return NextResponse.json({ status: healthy ? "ok" : "degraded", supabase }, { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
