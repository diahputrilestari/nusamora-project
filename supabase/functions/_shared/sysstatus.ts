// Status konfigurasi sistem untuk panel admin: hanya mengembalikan true/false apakah secret terpasang, tidak pernah nilainya.
import { authorize, type NotifyDeps } from "./notify.ts";

export interface SysInfo { secrets: Record<string, boolean>; midtransMode: "sandbox" | "production"; allowedOrigins: number }
export async function handleSystemStatus(req: Request, d: NotifyDeps, info: SysInfo): Promise<Response> {
  const h: Record<string, string> = { "Content-Type": "application/json", "Cache-Control": "no-store", "Vary": "Origin", "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info", "Access-Control-Allow-Methods": "POST, OPTIONS" };
  const o = req.headers.get("origin") || ""; if (d.env.allowedOrigins.includes(o)) h["Access-Control-Allow-Origin"] = o;
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "metode_tidak_didukung" }), { status: 405, headers: h });
  const a = await authorize(req, d, "settings.read"); if (a instanceof Response) return a;
  return new Response(JSON.stringify({ secrets: info.secrets, midtrans_mode: info.midtransMode, allowed_origins: info.allowedOrigins, checked_at: new Date((d.now ?? Date.now)()).toISOString() }), { status: 200, headers: h });
}
