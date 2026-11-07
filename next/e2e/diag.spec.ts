import { test } from "@playwright/test";
// DIAGNOSTIK SEMENTARA: memetakan karakter mana yang membuat server macet. Dihapus setelah penyebab ketemu.
for (const p of ["/id/ADMIN_x", "/id/x%27y", "/id/a--b", "/id/ADMIN-x", "/id/a%27b/c", "/id/zz%27--", "/id/ADMIN_x%27--", "/id/%E0%A4%A", "/id/a%00b"]) {
  test(`diag ${p}`, async ({ page }) => {
    test.setTimeout(15_000);
    const t0 = Date.now();
    let s: number | string = "?";
    try { const r = await page.goto(p, { timeout: 10_000 }); s = r?.status() ?? "-"; } catch (e) { s = "ERR " + String(e).slice(0, 60); }
    console.log(`DIAG ${p} -> ${s} (${Date.now() - t0}ms)`);
  });
}
