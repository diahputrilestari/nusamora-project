import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

/**
 * Hostinger Node.js Web App menjalankan Next.js dalam mode server (standalone), jadi `output: "standalone"`
 * dipakai dan BUKAN static export. Lihat docs/migration/02-hostinger-deployment.md.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  reactStrictMode: true,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  /**
   * Redirect URL lama (/paket -> /id/pricing, dst.) SENGAJA belum diaktifkan: ditambahkan per tahap, tepat saat halaman
   * penggantinya ada, agar tidak ada URL yang mengarah ke 404. Daftar pemetaan: docs/migration/01-audit-dan-rencana.md.
   */
};

export default withNextIntl(nextConfig);
