/**
 * Content-Security-Policy untuk aplikasi Next.js (dibuat per-request dengan nonce).
 * Mode default: "report-only" (tidak memblokir). Ubah ke "enforce" lewat env CSP_MODE setelah laporan bersih.
 * STATUS: belum dibangun/diuji di sandbox (npm diblokir) — verifikasi lewat CI/uji lokal sebelum enforce.
 */
const isDev = process.env.NODE_ENV !== "production";

export type CspMode = "report-only" | "enforce";
export const cspMode = (): CspMode => (process.env.CSP_MODE === "enforce" ? "enforce" : "report-only");
export const cspHeaderName = () => (cspMode() === "enforce" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only");

export function makeNonce(): string {
  const b = crypto.getRandomValues(new Uint8Array(16));
  let s = ""; for (const x of b) s += String.fromCharCode(x);
  return btoa(s);
}

export function buildCsp(nonce: string): string {
  const supabase = "https://*.supabase.co wss://*.supabase.co";
  const midtrans = "https://app.midtrans.com https://app.sandbox.midtrans.com";
  const d: Record<string, string> = {
    "default-src": "'self'",
    // nonce + strict-dynamic: skrip Next yang bernonce boleh memuat skrip turunannya; tanpa 'unsafe-inline' untuk skrip.
    "script-src": `'self' 'nonce-${nonce}' 'strict-dynamic' ${midtrans}${isDev ? " 'unsafe-eval'" : ""}`,
    // Next/Tailwind menyisipkan style inline; style-src dibiarkan 'unsafe-inline' (risiko rendah dibanding skrip).
    "style-src": "'self' 'unsafe-inline'",
    "font-src": "'self' data:", // next/font menyajikan font dari origin sendiri
    "img-src": "'self' data: blob: https:",
    "media-src": "'self' data: blob: https:",
    "connect-src": `'self' ${supabase} https://api.midtrans.com https://api.sandbox.midtrans.com`,
    "frame-src": midtrans,
    "frame-ancestors": "'self'",
    "base-uri": "'self'",
    "form-action": "'self'",
    "object-src": "'none'",
    "report-uri": "/api/csp-report",
  };
  return Object.entries(d).map(([k, v]) => `${k} ${v}`).join("; ");
}
