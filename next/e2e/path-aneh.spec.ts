import { expect, test } from "@playwright/test";

// Regresi: karakter aneh di alamat TIDAK boleh membuat server macet (dulu %27 menggantung sampai timeout lalu 500).
const PATHS = ["/id/x%27y", "/id/a%27b/c", "/id/zz%27--", "/id/ADMIN_x%27--", "/id/ADMIN_x", "/id/a--b", "/id/%22x%22", "/id/%3Cscript%3E", "/id/a%5Cb", "/id/a%60b", "/id/a%7Cb", "/id/a%00b", "/id/%C3%A9", "/id/%E0%A4%A"];
for (const p of PATHS) {
  test(`alamat aneh ${p} -> 400/404 cepat`, async ({ page }) => {
    test.setTimeout(15_000);
    const t0 = Date.now();
    const r = await page.goto(p, { timeout: 8_000 });
    expect([400, 404]).toContain(r?.status());
    expect(Date.now() - t0).toBeLessThan(5_000);
  });
}
