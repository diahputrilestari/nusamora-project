import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/config/env";

/** Bentuk data dari RPC `get_public_invitation` (backend/payment-schema.sql). `content` berasal dari editor dan TIDAK dipercaya. */
export type PublicInvitation = {
  title: string;
  template_id: string | null;
  category: string | null;
  event_date: string | null;
  experience: string;
  liveGuest: boolean;
  content: Record<string, unknown>;
  expires_at: string | null;
};

/** Format slug sama dengan constraint DB (huruf kecil, angka, tanda hubung; 3-40 karakter). */
export const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
export const isValidSlug = (s: string) => s.length >= 3 && s.length <= 40 && SLUG_RE.test(s);

/**
 * Mengambil undangan publik (hanya yang aktif, belum kedaluwarsa, tidak di-takedown; disaring di DB).
 * Memakai kunci anon tanpa sesi/cookie. Semua kegagalan (env kosong, jaringan, tidak tersedia) menjadi `null`
 * sehingga halaman memberi 404 seragam dan tidak membocorkan penyebabnya. Di-cache per permintaan.
 */
export const getPublicInvitation = cache(async (slug: string): Promise<PublicInvitation | null> => {
  if (!isValidSlug(slug)) return null;
  try {
    const { url, anonKey } = publicEnv();
    const sb = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    const { data, error } = await sb.rpc("get_public_invitation", { p_slug: slug });
    if (error || !data || typeof data !== "object" || "error" in (data as object)) return null;
    return data as PublicInvitation;
  } catch {
    return null;
  }
});

/** Ambil string aman dari data tak tepercaya (dipotong, bukan string -> ""). React tetap meng-escape saat dirender. */
export const text = (v: unknown, max = 300): string => (typeof v === "string" ? v.trim().slice(0, max) : "");
/** Hanya URL https yang boleh dipakai untuk tautan/gambar (menolak javascript:, data:, http:). */
export const httpsUrl = (v: unknown): string => {
  const s = text(v, 500);
  try { const u = new URL(s); return u.protocol === "https:" ? u.toString() : ""; } catch { return ""; }
};
export const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {});
