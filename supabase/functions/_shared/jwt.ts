// Membaca klaim `aal` (assurance level: aal1 = password, aal2 = MFA terverifikasi) dari access token.
// HANYA dipakai pada token yang SUDAH diverifikasi Supabase Auth (auth.getUser); tidak memverifikasi tanda tangan sendiri.
export function jwtAal(token: string): string | null {
  try {
    const p = token.split(".")[1]; if (!p) return null;
    const j = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(p.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(p.length / 4) * 4, "=")), (c) => c.charCodeAt(0))));
    return typeof j.aal === "string" ? j.aal : null;
  } catch { return null; }
}
